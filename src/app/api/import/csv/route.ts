import Papa from "papaparse";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { clients, portfolios } from "@/server/schema";
import { getSessionUser, can } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/import/csv — validate and load supported synthetic records (FR-012).
 *
 * Validation reports every bad row with its line number rather than failing on
 * the first error, because the demo's point is to show what good validation
 * feedback looks like.
 */

const REQUIRED = ["name", "segment", "city", "portfolio_value"] as const;

const rowSchema = z.object({
  name: z.string().min(1, "name is required"),
  segment: z.enum(["Platinum", "Gold", "Silver", "Emerging"], {
    errorMap: () => ({ message: "segment must be Platinum, Gold, Silver or Emerging" }),
  }),
  city: z.string().min(1, "city is required"),
  portfolio_value: z.coerce.number().positive("portfolio_value must be a positive number"),
  email: z.string().email("email is not valid").optional().or(z.literal("")),
  rm_id: z.string().optional(),
});

export type ImportIssue = { row: number; field: string; message: string };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!can(user, "import:data")) return forbidden();

  try {
    const form = await request.formData();
    const file = form.get("file");
    const commit = form.get("commit") === "true";

    if (!(file instanceof File)) return badRequest("Attach a CSV file to import.");
    if (file.size > 2_000_000) return badRequest("That file is larger than the 2 MB demo limit.");

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });

    if (parsed.errors.length) {
      return badRequest("That file could not be read as CSV.", parsed.errors.slice(0, 5));
    }

    const headers = parsed.meta.fields ?? [];
    const missing = REQUIRED.filter((r) => !headers.includes(r));
    if (missing.length) {
      return badRequest(
        `The file is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
      );
    }

    const issues: ImportIssue[] = [];
    const valid: z.infer<typeof rowSchema>[] = [];
    const seenNames = new Set<string>();

    parsed.data.forEach((raw, i) => {
      const line = i + 2; // header is line 1
      const result = rowSchema.safeParse(raw);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({ row: line, field: String(issue.path[0] ?? "row"), message: issue.message });
        }
        return;
      }
      const key = result.data.name.trim().toLowerCase();
      if (seenNames.has(key)) {
        issues.push({ row: line, field: "name", message: "duplicate client in this file" });
        return;
      }
      seenNames.add(key);
      valid.push(result.data);
    });

    if (!commit) {
      return ok({
        mode: "validate",
        totalRows: parsed.data.length,
        validRows: valid.length,
        issues: issues.slice(0, 100),
        issueCount: issues.length,
      });
    }

    if (!valid.length) return badRequest("No valid rows to import.");

    let imported = 0;
    for (const row of valid) {
      const id = `imp-${Date.now()}-${imported}`;
      await db.insert(clients).values({
        id,
        name: row.name.trim(),
        email: row.email || null,
        city: row.city.trim(),
        segment: row.segment,
        rmId: row.rm_id || null,
        status: "active",
        goals: [],
        onboardedAt: new Date(),
      });
      await db.insert(portfolios).values({
        id: `p-${id}`,
        clientId: id,
        totalValue: String(row.portfolio_value),
        investedValue: String(row.portfolio_value),
        assetAllocation: { Equity: 60, Debt: 30, Gold: 5, Liquid: 5 },
        returnPctDemo: "0",
        xirrPctDemo: "0",
        asOfDate: new Date(),
      });
      imported++;
    }

    await recordAudit({
      userId: user.id,
      eventType: "csv_imported",
      metadata: { imported, skipped: issues.length },
    });

    return ok({ mode: "commit", imported, skipped: issues.length, issues: issues.slice(0, 100) });
  } catch (err) {
    console.error(err);
    return serverError("Could not process that import.");
  }
}

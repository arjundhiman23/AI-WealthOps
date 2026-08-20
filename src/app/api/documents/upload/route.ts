import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { documents } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { buildKey, isStorageConfigured, putObject, storageStatus } from "@/services/storage/storage";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents/upload — optional prototype upload (FR-011).
 * Writes to S3 when credentials are present; otherwise records metadata only
 * and says so, rather than failing the demo.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const form = await request.formData();
    const file = form.get("file");
    const clientId = form.get("clientId");
    const type = (form.get("type") as string) || "other";

    if (!(file instanceof File)) return badRequest("Attach a file to upload.");
    if (typeof clientId !== "string" || !clientId) return badRequest("Choose a client for this document.");
    if (file.size > 10_000_000) return badRequest("That file is larger than the 10 MB demo limit.");

    let storageRef: string | null = null;
    if (isStorageConfigured()) {
      const key = buildKey(clientId, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      storageRef = await putObject(key, buffer, file.type || "application/octet-stream");
    }

    const [row] = await db
      .insert(documents)
      .values({
        id: randomUUID(),
        clientId,
        name: file.name,
        type,
        date: new Date(),
        storageRef,
        sizeBytes: file.size,
        status: "available",
        uploaded: true,
      })
      .returning();

    await recordAudit({
      userId: user.id,
      eventType: "document_uploaded",
      entityType: "client",
      entityId: clientId,
      metadata: { stored: storageRef !== null },
    });

    return ok({ document: row, storage: storageStatus() }, { status: 201 });
  } catch (err) {
    console.error(err);
    return serverError("Could not upload that document.");
  }
}

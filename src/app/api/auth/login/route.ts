import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { SESSION_COOKIE, serializeSession } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, serverError } from "@/lib/api";

const schema = z.object({ userId: z.string().min(1) });

/** FR-001 — demo login. Selects a seeded persona; there is no password. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Choose a demo user to continue.");

    const [user] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!user || user.status !== "active") return badRequest("That demo user is not available.");

    const response = NextResponse.json({ id: user.id, name: user.name, role: user.role });
    response.cookies.set(SESSION_COOKIE, serializeSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    await recordAudit({ userId: user.id, eventType: "login" });
    return response;
  } catch (err) {
    console.error(err);
    return serverError("Could not sign in to the demo workspace.");
  }
}

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

/**
 * FR-001 — demo authentication.
 *
 * This is a signed-cookie session over a fixed set of seeded demo users. There
 * are no passwords and no account creation. The shape below (session -> user ->
 * role -> permission check) is what a real OIDC/SSO provider would populate in
 * production; swapping the provider should not require touching callers.
 */

const COOKIE = "wealthops_session";
const SECRET = process.env.SESSION_SECRET ?? "wealthops-demo-secret-not-for-production";

import type { Role } from "@/lib/roles";
export type { Role } from "@/lib/roles";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string | null;
};

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function serializeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const provided = Buffer.from(token.slice(idx + 1));
  const expected = Buffer.from(sign(userId));
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? userId : null;
}

export const SESSION_COOKIE = COOKIE;

/** Returns the signed-in user, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const userId = verify(token);
  if (!userId) return null;

  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || row.status !== "active") return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    team: row.team,
  };
}

/** Use in server components and route handlers that must not render anonymously. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Coarse capability check. In the prototype every demo user can read everything;
 * only the admin surface and destructive actions are gated. Production replaces
 * this with real RBAC backed by the identity provider's claims.
 */
export function can(user: SessionUser | null, capability: Capability): boolean {
  if (!user) return false;
  return ROLE_CAPABILITIES[user.role]?.includes(capability) ?? false;
}

export type Capability =
  | "view:dashboard"
  | "view:clients"
  | "view:analytics"
  | "manage:tasks"
  | "generate:brief"
  | "import:data"
  | "view:admin"
  | "reset:demo";

const READ_ALL: Capability[] = [
  "view:dashboard",
  "view:clients",
  "view:analytics",
  "manage:tasks",
  "generate:brief",
];

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  rm: READ_ALL,
  manager: READ_ALL,
  executive: ["view:dashboard", "view:clients", "view:analytics"],
  operations: [...READ_ALL, "import:data"],
  admin: [...READ_ALL, "import:data", "view:admin", "reset:demo"],
};


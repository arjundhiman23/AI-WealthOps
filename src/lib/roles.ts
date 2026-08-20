/**
 * Role types and labels with no server-only dependencies, so client
 * components can import them without pulling in next/headers.
 */
export type Role = "rm" | "manager" | "operations" | "admin" | "executive";

export const ROLE_LABEL: Record<Role, string> = {
  rm: "Relationship Manager",
  manager: "Team Manager",
  operations: "Operations",
  admin: "Administrator",
  executive: "Executive",
};

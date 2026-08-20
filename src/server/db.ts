import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Lazily-constructed Postgres client.
 *
 * The connection is not opened until the first query runs. That matters because
 * `next build` imports every route module: if the pool were created at import
 * time, building without DATABASE_URL set would fail even though nothing has
 * queried anything yet.
 */

type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __wealthopsDb?: Db; __wealthopsPool?: Pool };

function create(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres instance.",
    );
  }

  const pool =
    globalForDb.__wealthopsPool ??
    new Pool({
      connectionString,
      max: 5,
      // Render's managed Postgres requires TLS; a local instance generally does not.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
    });

  globalForDb.__wealthopsPool = pool;
  return drizzle(pool, { schema });
}

function resolve(): Db {
  if (!globalForDb.__wealthopsDb) globalForDb.__wealthopsDb = create();
  return globalForDb.__wealthopsDb;
}

/** Proxy so `db.select()` connects on first use rather than on import. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(resolve() as object, prop, receiver);
  },
});

export { schema };

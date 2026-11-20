import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.SQLITE_DB_PATH || "./data/courtpulse.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export default defineConfig({
  schema: "./database/schema.tables.ts",
  out: "./database/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});

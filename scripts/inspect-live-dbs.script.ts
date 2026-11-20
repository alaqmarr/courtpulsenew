import "dotenv/config";
import { Pool } from "pg";

async function inspectDb(url: string, label: string) {
  const pool = new Pool({ connectionString: url });
  try {
    console.log(`\n========== ${label} ==========`);
    const tables = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    for (const { tablename } of tables.rows) {
      const countRes = await pool.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM "${tablename}"`
      );
      const colsRes = await pool.query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [tablename]
      );
      const count = countRes.rows[0]?.n ?? 0;
      console.log(
        `${tablename} (${count} rows): ${colsRes.rows.map((c) => `${c.column_name}:${c.data_type}`).join(", ")}`
      );
      if (count > 0 && count <= 5) {
        const sample = await pool.query(`SELECT * FROM "${tablename}" LIMIT 3`);
        console.log("  sample:", JSON.stringify(sample.rows));
      } else if (count > 5) {
        const sample = await pool.query(`SELECT * FROM "${tablename}" LIMIT 2`);
        console.log("  sample:", JSON.stringify(sample.rows));
      }
    }
  } finally {
    await pool.end();
  }
}

(async () => {
  if (process.env.SOURCE_DATABASE_URL) {
    await inspectDb(process.env.SOURCE_DATABASE_URL, "SOURCE_DATABASE_URL");
  }
  if (process.env.SOURCE_ANALYTICS_DATABASE_URL) {
    await inspectDb(
      process.env.SOURCE_ANALYTICS_DATABASE_URL,
      "SOURCE_ANALYTICS_DATABASE_URL"
    );
  }
})();

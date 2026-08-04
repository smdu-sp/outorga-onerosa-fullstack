import 'dotenv/config';
import { getBiPool } from './lib/server/bi-cadastro';

async function main() {
  const pool = await getBiPool();
  const cols = await pool.request().query('SELECT TOP 1 * FROM dbo.cadastros');
  console.log('colunas cadastros:', Object.keys(cols.recordset[0] || {}));
  const sample = await pool
    .request()
    .query(
      `SELECT TOP 2 processo, sql_incra, Sistema FROM dbo.cadastros WHERE sql_incra IS NOT NULL AND LTRIM(RTRIM(sql_incra)) <> ''`,
    );
  console.log(sample.recordset);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

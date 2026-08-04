import 'dotenv/config';
import { getBiPool } from './lib/server/bi-cadastro';
import sql from 'mssql';

async function main() {
  const pool = await getBiPool();
  const sample = await pool.request().query(`
    SELECT TOP 5 Sistema, Processo, Protocolo, SQL_Incra, TipoSQL_Incra
    FROM dbo.cadastros
    WHERE SQL_Incra LIKE '%.%.%-%'
      AND Sistema = 'AprovaDigital'
  `);
  console.log(sample.recordset);

  const byProc = await pool
    .request()
    .input('p', sql.VarChar(50), '%1020.2021/0007944-0%')
    .query(`
      SELECT TOP 5 Sistema, Processo, Protocolo, SQL_Incra
      FROM dbo.cadastros
      WHERE Processo LIKE @p
    `);
  console.log('by proc', byProc.recordset);
}
main().finally(() => process.exit(0));

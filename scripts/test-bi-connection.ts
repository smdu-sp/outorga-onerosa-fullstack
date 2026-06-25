import 'dotenv/config';
import sql from 'mssql';

const url = process.env.BI_DATABASE_URL?.trim();
if (!url) {
	console.error('BI_DATABASE_URL não definida no .env');
	process.exit(1);
}

const match = url.match(
	/^sqlserver:\/\/([^:]+):(\d+);user=([^;]+);database=([^;]+);password=([^;]+);encrypt=(\w+)/,
);
if (!match) {
	console.error('Formato inválido de BI_DATABASE_URL:', url);
	process.exit(1);
}

const [, server, port, user, database, password, encrypt] = match;

console.log('Configuração detectada:');
console.log(`  server:   ${server}`);
console.log(`  port:     ${port}`);
console.log(`  user:     ${user}`);
console.log(`  database: ${database}`);
console.log(`  encrypt:  ${encrypt}`);

const config: sql.config = {
	server,
	port: Number(port),
	user,
	password,
	database,
	connectionTimeout: 15_000,
	requestTimeout: 15_000,
	options: {
		encrypt: encrypt === 'true',
		trustServerCertificate: true,
	},
};

(async () => {
	console.log('\nConectando...');
	try {
		const pool = await new sql.ConnectionPool(config).connect();
		console.log('Conexão OK!');

		const result = await pool.request().query<{ tabela: string }>(
			`SELECT TOP 5 TABLE_NAME AS tabela FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
		);
		console.log('\nPrimeiras tabelas encontradas:');
		result.recordset.forEach((r) => console.log(' -', r.tabela));

		await pool.close();
	} catch (err) {
		console.error('\nErro na conexão:', (err as Error).message);
		process.exit(1);
	}
})();

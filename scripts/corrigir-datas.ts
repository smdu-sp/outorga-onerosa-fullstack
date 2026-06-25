/**
 * Normaliza colunas @db.Date para meia-noite UTC (sem componente de hora).
 * Idempotente — seguro rodar mesmo se os dados já estiverem corretos.
 *
 * Uso: npx tsx scripts/corrigir-datas.ts
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
	const tabelas: { sql: string; label: string }[] = [
		{
			label: 'processos.data_entrada',
			sql: `UPDATE processos SET data_entrada = DATE(data_entrada) WHERE data_entrada IS NOT NULL AND TIME(data_entrada) <> '00:00:00'`,
		},
		{
			label: 'parcelas.vencimento',
			sql: `UPDATE parcelas SET vencimento = DATE(vencimento) WHERE TIME(vencimento) <> '00:00:00'`,
		},
		{
			label: 'parcelas.data_quitacao',
			sql: `UPDATE parcelas SET data_quitacao = DATE(data_quitacao) WHERE data_quitacao IS NOT NULL AND TIME(data_quitacao) <> '00:00:00'`,
		},
		{
			label: 'monitoramento_cota_solidariedade.data_informacao_dmus',
			sql: `UPDATE monitoramento_cota_solidariedade SET data_informacao_dmus = DATE(data_informacao_dmus) WHERE data_informacao_dmus IS NOT NULL AND TIME(data_informacao_dmus) <> '00:00:00'`,
		},
		{
			label: 'monitoramento_cota_solidariedade.ficha_revisada_em',
			sql: `UPDATE monitoramento_cota_solidariedade SET ficha_revisada_em = DATE(ficha_revisada_em) WHERE ficha_revisada_em IS NOT NULL AND TIME(ficha_revisada_em) <> '00:00:00'`,
		},
		{
			label: 'monitoramento_licencas.data_expedicao',
			sql: `UPDATE monitoramento_licencas SET data_expedicao = DATE(data_expedicao) WHERE data_expedicao IS NOT NULL AND TIME(data_expedicao) <> '00:00:00'`,
		},
		{
			label: 'monitoramento_anotacoes_deuso.data_informacao_dmus',
			sql: `UPDATE monitoramento_anotacoes_deuso SET data_informacao_dmus = DATE(data_informacao_dmus) WHERE data_informacao_dmus IS NOT NULL AND TIME(data_informacao_dmus) <> '00:00:00'`,
		},
	];

	let total = 0;
	for (const { label, sql } of tabelas) {
		const n = await p.$executeRawUnsafe(sql);
		console.log(`${label}: ${n} registro(s) corrigido(s)`);
		total += Number(n);
	}

	if (total === 0) {
		console.log('Nenhuma data com hora incorreta encontrada — banco já está consistente.');
	} else {
		console.log(`Total: ${total} registro(s) normalizado(s).`);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => p.$disconnect());

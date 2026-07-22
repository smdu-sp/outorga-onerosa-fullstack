/**
 * Backfill dos totais monetários a partir das parcelas (fonte de verdade).
 *
 * 1) Processo.valor_total_parcelas = SUM(parcelas.valor)  — total materializado.
 * 2) monitoramento_calculo_outorga.contrapartida_total = mesmo total — corrige a
 *    coluna legada, que vinha corrompida por escala (parcelas × 10^k por erro de
 *    separador decimal na planilha). Ver prisma/auditar-contrapartida.ts.
 *
 * Idempotente: pode ser re-executado após qualquer reimportação de dados.
 * Usa SQL cru para não depender da regeneração do Prisma Client.
 */

import { prisma } from '../lib/prisma';

async function main() {
	const totalProcessos = await prisma.$executeRawUnsafe(`
		UPDATE processos p
		SET p.valor_total_parcelas = (
			SELECT SUM(pa.valor) FROM parcelas pa WHERE pa.processo_id = p.id
		)
	`);
	console.log(`Processo.valor_total_parcelas atualizado (linhas afetadas: ${totalProcessos}).`);

	const totalContrapartida = await prisma.$executeRawUnsafe(`
		UPDATE monitoramento_calculo_outorga co
		JOIN monitoramento_fichas f ON f.id = co.monitoramento_ficha_id
		JOIN (
			SELECT processo_id, SUM(valor) AS soma
			FROM parcelas
			GROUP BY processo_id
		) tot ON tot.processo_id = f.processo_id
		SET co.contrapartida_total = tot.soma
	`);
	console.log(`contrapartida_total de-corrompido a partir das parcelas (linhas: ${totalContrapartida}).`);

	// Conferência
	const [check] = await prisma.$queryRawUnsafe<any[]>(`
		SELECT
			(SELECT COUNT(*) FROM processos WHERE valor_total_parcelas IS NOT NULL) AS procs_com_total,
			(SELECT ROUND(SUM(valor_total_parcelas)) FROM processos) AS soma_total_processos,
			(SELECT COUNT(*) FROM monitoramento_calculo_outorga WHERE contrapartida_total IS NOT NULL) AS calc_com_contrapartida
	`);
	console.log('Conferência:', check);
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});

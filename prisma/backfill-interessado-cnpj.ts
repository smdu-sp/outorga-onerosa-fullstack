/**
 * Backfill de Processo.interessado e Processo.cnpj — agora campos próprios do
 * processo (um interessado/CNPJ por processo, não mais por parcela).
 *
 * 1) interessado = proprietario_interessado da ficha de monitoramento (PDE/AIU)
 *    ou da Cota de Solidariedade, o que estiver preenchido.
 * 2) cnpj = cpf_cnpj da parcela de menor número que tiver o campo preenchido
 *    (histórico vinha da planilha, uma linha por parcela).
 *
 * Idempotente: só preenche onde ainda está NULL. Usa SQL cru para não
 * depender da regeneração do Prisma Client.
 */

import { prisma } from '../lib/prisma';

async function main() {
	const totalInteressado = await prisma.$executeRawUnsafe(`
		UPDATE processos p
		LEFT JOIN monitoramento_fichas mf ON mf.processo_id = p.id
		LEFT JOIN monitoramento_cota_solidariedade mc ON mc.processo_id = p.id
		SET p.interessado = COALESCE(mf.proprietario_interessado, mc.proprietario_interessado)
		WHERE p.interessado IS NULL
			AND COALESCE(mf.proprietario_interessado, mc.proprietario_interessado) IS NOT NULL
	`);
	console.log(`Processo.interessado preenchido (linhas afetadas: ${totalInteressado}).`);

	const totalCnpj = await prisma.$executeRawUnsafe(`
		UPDATE processos p
		SET p.cnpj = (
			SELECT pa.cpf_cnpj FROM parcelas pa
			WHERE pa.processo_id = p.id AND pa.cpf_cnpj IS NOT NULL AND pa.cpf_cnpj <> ''
			ORDER BY pa.num_parcela ASC
			LIMIT 1
		)
		WHERE p.cnpj IS NULL
	`);
	console.log(`Processo.cnpj preenchido (linhas afetadas: ${totalCnpj}).`);

	const [check] = await prisma.$queryRawUnsafe<any[]>(`
		SELECT
			(SELECT COUNT(*) FROM processos WHERE interessado IS NOT NULL) AS procs_com_interessado,
			(SELECT COUNT(*) FROM processos WHERE cnpj IS NOT NULL) AS procs_com_cnpj,
			(SELECT COUNT(*) FROM processos) AS procs_total
	`);
	console.log('Conferência:', check);
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});

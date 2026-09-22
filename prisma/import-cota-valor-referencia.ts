/**
 * Importa a aba `Quadro 14` da planilha oficial `UC-CO-V2023_02_16-LEI-16050-desbloqueada.xlsm`
 * (valor de referência do m² da Cota de Solidariedade por setor/quadra/codlog, ~180
 * mil linhas — valor único "R$/m² (2020-atual)", sem vigência por data, diferente da
 * tabela `v` da OODC) para a tabela `CotaValorReferencia`.
 *
 * Uso: npm run db:import-cota-valores
 * (reimportável: usa createMany com skipDuplicates, chave única setor+quadra+codlog
 * — rodar de novo não duplica).
 */
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as path from 'path';

const prisma = new PrismaClient();

const ARQUIVO =
	process.env.COTA_PLANILHA_CALCULO ??
	path.join(__dirname, '..', 'public', 'planilhas', 'UC-CO-V2023_02_16-LEI-16050-desbloqueada.xlsm');

const ABA = 'Quadro 14';
const LOTE = 2000;

interface LinhaValor {
	setor: string;
	quadra: string;
	codlog: string;
	valor: number;
	observacao: string | null;
}

function lerLinhas(ws: ExcelJS.Worksheet): LinhaValor[] {
	const linhas: LinhaValor[] = [];
	for (let r = 2; r <= ws.rowCount; r++) {
		const row = ws.getRow(r);
		const setor = String(row.getCell(1).value ?? '').trim();
		const quadra = String(row.getCell(2).value ?? '').trim();
		const codlog = String(row.getCell(3).value ?? '').trim();
		const valorCell = row.getCell(5).value;
		const observacaoCell = row.getCell(6).value;

		if (!setor || !quadra || !codlog) continue;
		const valor = Number(valorCell);
		if (!Number.isFinite(valor)) continue;

		linhas.push({
			setor,
			quadra,
			codlog,
			valor,
			observacao: observacaoCell != null ? String(observacaoCell).trim() || null : null,
		});
	}
	return linhas;
}

async function main() {
	console.log(`Lendo ${ARQUIVO} (aba "${ABA}")...`);
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(ARQUIVO);
	const ws = wb.getWorksheet(ABA);
	if (!ws) throw new Error(`Aba "${ABA}" não encontrada em ${ARQUIVO}`);

	const linhas = lerLinhas(ws);
	console.log(`${linhas.length} linhas válidas de ${ws.rowCount - 1}.`);

	let inseridas = 0;
	for (let i = 0; i < linhas.length; i += LOTE) {
		const lote = linhas.slice(i, i + LOTE);
		const resultado = await prisma.cotaValorReferencia.createMany({
			data: lote,
			skipDuplicates: true,
		});
		inseridas += resultado.count;
		console.log(`  ${Math.min(i + LOTE, linhas.length)}/${linhas.length} processadas (${inseridas} inseridas)`);
	}

	console.log(`Concluído: ${inseridas} linhas novas inseridas em cota_valores_referencia.`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

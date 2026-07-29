/**
 * Importa a aba `v` da planilha oficial oodc-prot (valor de referência do m² da
 * OODC por setor/quadra/codlog, ~180 mil linhas) para a tabela `OodcValorReferencia`.
 *
 * Uso: npm run db:import-oodc-valores
 * (reimportável: usa createMany com skipDuplicates, chave única
 * setor+quadra+codlog+data_inicio_vigencia — rodar de novo não duplica).
 */
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as path from 'path';

const prisma = new PrismaClient();

const ARQUIVO =
	process.env.OODC_PLANILHA_CALCULO ??
	path.join(__dirname, '..', 'public', 'planilhas', 'oodc-prot-v1 1 0-desbloqueada.xlsm');

const ABA = 'v';
const LOTE = 2000;

interface LinhaValor {
	setor: string;
	quadra: string;
	codlog: string;
	valor: number;
	data_inicio_vigencia: Date;
}

function lerLinhas(ws: ExcelJS.Worksheet): LinhaValor[] {
	const linhas: LinhaValor[] = [];
	for (let r = 2; r <= ws.rowCount; r++) {
		const row = ws.getRow(r);
		const setor = String(row.getCell(1).value ?? '').trim();
		const quadra = String(row.getCell(2).value ?? '').trim();
		const codlog = String(row.getCell(3).value ?? '').trim();
		const valorCell = row.getCell(5).value;
		const dataCell = row.getCell(6).value;

		if (!setor || !quadra || !codlog) continue;
		const valor = Number(valorCell);
		if (!Number.isFinite(valor)) continue;
		const data = dataCell instanceof Date ? dataCell : new Date(String(dataCell));
		if (Number.isNaN(data.getTime())) continue;

		linhas.push({ setor, quadra, codlog, valor, data_inicio_vigencia: data });
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
		const resultado = await prisma.oodcValorReferencia.createMany({
			data: lote,
			skipDuplicates: true,
		});
		inseridas += resultado.count;
		console.log(`  ${Math.min(i + LOTE, linhas.length)}/${linhas.length} processadas (${inseridas} inseridas)`);
	}

	console.log(`Concluído: ${inseridas} linhas novas inseridas em oodc_valores_referencia.`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

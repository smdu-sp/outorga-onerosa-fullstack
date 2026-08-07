/**
 * Utilitário de exportação Excel para relatórios (exceljs).
 *
 * @format
 */

import ExcelJS from 'exceljs';

export type AbaExcel = {
	nome: string;
	colunas: string[];
	linhas: (string | number | null | undefined)[][];
};

export async function montarWorkbook(abas: AbaExcel[]): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'Outorga Onerosa — SMUL/DEUSO';
	wb.created = new Date();

	for (const aba of abas) {
		const ws = wb.addWorksheet(aba.nome.slice(0, 31));
		ws.addRow(aba.colunas);
		const header = ws.getRow(1);
		header.font = { bold: true };
		header.commit();
		for (const linha of aba.linhas) {
			ws.addRow(linha.map((c) => (c == null ? '' : c)));
		}
		ws.columns.forEach((col) => {
			let max = 10;
			col.eachCell?.({ includeEmpty: true }, (cell) => {
				const len = String(cell.value ?? '').length;
				if (len > max) max = Math.min(len + 2, 48);
			});
			col.width = max;
		});
	}

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}

export function respostaExcel(buffer: Buffer, filename: string): Response {
	return new Response(new Uint8Array(buffer), {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store',
		},
	});
}

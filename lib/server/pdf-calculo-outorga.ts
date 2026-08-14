/**
 * Memorial de cálculo da Outorga Onerosa em PDF — gerado quando o técnico
 * confirma o cálculo, para anexar ao processo SEI antes do envio à CAP.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DadosPdfCalculo, TipoPdfCalculo } from '@/types/pdf-calculo-outorga';

const AZUL = rgb(0.07, 0.27, 0.55);
const AZUL_SUAVE = rgb(0.93, 0.95, 0.98);
const PRETO = rgb(0.12, 0.13, 0.16);
const CINZA = rgb(0.38, 0.4, 0.44);
const LINHA = rgb(0.82, 0.84, 0.87);
const VERDE = rgb(0.08, 0.42, 0.28);

const MARGEM = 48;
const A4_W = 595.28;
const A4_H = 841.89;
const LARGURA = A4_W - MARGEM * 2;

const TIPO_LABEL: Record<TipoPdfCalculo, string> = {
	OUTORGA: 'Outorga Onerosa (PDE)',
	COTA: 'Cota de Solidariedade',
	OUTORGA_COTA: 'Outorga Onerosa e Cota de Solidariedade',
	AIU: 'Outorga em Área de Intervenção Urbana (AIU)',
};

function fmtBRL(n: number): string {
	return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNum(n: number, casas = 2): string {
	return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function fmtArea(n: number): string {
	return `${fmtNum(n, 2)} m²`;
}

/** Helvetica (WinAnsi) não cobre traços tipográficos e aspas curvas. */
function textoPdf(valor: string): string {
	return valor
		.normalize('NFC')
		.replace(/\u00A0/g, ' ')
		.replace(/[\u2012\u2013\u2014\u2015]/g, '-')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/\u2022/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

function wrap(texto: string, font: PDFFont, size: number, max: number): string[] {
	const limpo = textoPdf(texto);
	if (!limpo) return [];
	const palavras = limpo.split(/\s+/);
	const linhas: string[] = [];
	let atual = '';
	for (const palavra of palavras) {
		const teste = atual ? `${atual} ${palavra}` : palavra;
		if (font.widthOfTextAtSize(teste, size) <= max) {
			atual = teste;
			continue;
		}
		if (atual) linhas.push(atual);
		if (font.widthOfTextAtSize(palavra, size) <= max) {
			atual = palavra;
			continue;
		}
		let resto = palavra;
		while (resto) {
			let i = resto.length;
			while (i > 1 && font.widthOfTextAtSize(resto.slice(0, i), size) > max) i--;
			linhas.push(resto.slice(0, i));
			resto = resto.slice(i);
		}
		atual = '';
	}
	if (atual) linhas.push(atual);
	return linhas;
}

type Cursor = { page: PDFPage; y: number; doc: PDFDocument; regular: PDFFont; bold: PDFFont };

async function novaPagina(ctx: Cursor): Promise<void> {
	ctx.page = ctx.doc.addPage([A4_W, A4_H]);
	ctx.y = A4_H - MARGEM;
}

async function garantirEspaco(ctx: Cursor, altura: number): Promise<void> {
	if (ctx.y - altura < MARGEM + 36) await novaPagina(ctx);
}

function desenharLinha(ctx: Cursor, y?: number) {
	const yy = y ?? ctx.y;
	ctx.page.drawLine({
		start: { x: MARGEM, y: yy },
		end: { x: A4_W - MARGEM, y: yy },
		thickness: 0.6,
		color: LINHA,
	});
}

async function secao(ctx: Cursor, titulo: string) {
	await garantirEspaco(ctx, 28);
	ctx.y -= 6;
	ctx.page.drawRectangle({
		x: MARGEM,
		y: ctx.y - 16,
		width: 4,
		height: 16,
		color: AZUL,
	});
	ctx.page.drawText(textoPdf(titulo.toUpperCase()), {
		x: MARGEM + 12,
		y: ctx.y - 12,
		size: 9,
		font: ctx.bold,
		color: AZUL,
	});
	ctx.y -= 26;
}

async function paragrafo(ctx: Cursor, texto: string, opts?: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean }) {
	const size = opts?.size ?? 9.5;
	const font = opts?.bold ? ctx.bold : ctx.regular;
	const color = opts?.color ?? PRETO;
	const linhas = wrap(texto, font, size, LARGURA);
	for (const linha of linhas) {
		await garantirEspaco(ctx, size + 4);
		ctx.page.drawText(linha, { x: MARGEM, y: ctx.y - size, size, font, color });
		ctx.y -= size + 4;
	}
}

async function kv(ctx: Cursor, pares: { label: string; value: string }[]) {
	const col = LARGURA / 2;
	const labelSize = 7.5;
	const valueSize = 10;
	for (let i = 0; i < pares.length; i += 2) {
		const esquerda = pares[i];
		const direita = pares[i + 1];
		const linhasE = wrap(esquerda.value || '-', ctx.bold, valueSize, col - 8);
		const linhasD = direita ? wrap(direita.value || '-', ctx.bold, valueSize, col - 8) : [];
		const nLinhas = Math.max(linhasE.length, linhasD.length, 1);
		const altura = 12 + labelSize + nLinhas * (valueSize + 3) + 8;
		await garantirEspaco(ctx, altura);

		const desenharCampo = (campo: { label: string; value: string }, linhas: string[], x: number) => {
			ctx.page.drawText(textoPdf(campo.label.toUpperCase()), {
				x,
				y: ctx.y - labelSize,
				size: labelSize,
				font: ctx.regular,
				color: CINZA,
			});
			let yy = ctx.y - labelSize - 4 - valueSize;
			for (const linha of linhas.length ? linhas : ['-']) {
				ctx.page.drawText(linha, { x, y: yy, size: valueSize, font: ctx.bold, color: PRETO });
				yy -= valueSize + 3;
			}
		};

		desenharCampo(esquerda, linhasE, MARGEM);
		if (direita) desenharCampo(direita, linhasD, MARGEM + col);
		ctx.y -= altura - 4;
	}
}

async function formulaLinha(ctx: Cursor, rotulo: string, valor: string) {
	await garantirEspaco(ctx, 18);
	ctx.page.drawText(textoPdf(rotulo), {
		x: MARGEM + 8,
		y: ctx.y - 11,
		size: 9,
		font: ctx.regular,
		color: PRETO,
	});
	const w = ctx.bold.widthOfTextAtSize(textoPdf(valor), 9);
	ctx.page.drawText(textoPdf(valor), {
		x: A4_W - MARGEM - 8 - w,
		y: ctx.y - 11,
		size: 9,
		font: ctx.bold,
		color: PRETO,
	});
	ctx.y -= 16;
}

export async function montarPdfCalculoOutorga(dados: DadosPdfCalculo): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	doc.setTitle(`Memorial de cálculo - ${dados.numProcesso}`);
	doc.setAuthor('Portal de Outorga Onerosa - SMUL/DEUSO');
	doc.setCreator('Portal de Outorga Onerosa');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date());

	const regular = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);
	const ctx: Cursor = { doc, page: doc.addPage([A4_W, A4_H]), y: A4_H - MARGEM, regular, bold };

	const agora = new Date();
	const dataHora = agora.toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

	ctx.page.drawRectangle({ x: 0, y: A4_H - 92, width: A4_W, height: 92, color: AZUL });
	ctx.page.drawText(textoPdf('PREFEITURA DO MUNICÍPIO DE SÃO PAULO'), {
		x: MARGEM,
		y: A4_H - 32,
		size: 8,
		font: regular,
		color: rgb(0.85, 0.9, 0.97),
	});
	ctx.page.drawText(textoPdf('Secretaria Municipal de Urbanismo e Licenciamento - SMUL'), {
		x: MARGEM,
		y: A4_H - 46,
		size: 9,
		font: bold,
		color: rgb(1, 1, 1),
	});
	ctx.page.drawText(textoPdf('Departamento de Uso do Solo - DEUSO'), {
		x: MARGEM,
		y: A4_H - 60,
		size: 8.5,
		font: regular,
		color: rgb(0.85, 0.9, 0.97),
	});
	ctx.page.drawText(textoPdf('MEMORIAL DE CÁLCULO'), {
		x: MARGEM,
		y: A4_H - 80,
		size: 14,
		font: bold,
		color: rgb(1, 1, 1),
	});

	ctx.y = A4_H - 112;

	await paragrafo(ctx, 'Documento para anexar ao processo SEI antes do encaminhamento à CAP.', {
		size: 8.5,
		color: CINZA,
	});
	ctx.y -= 4;

	await secao(ctx, 'Identificação do processo');
	await kv(ctx, [
		{ label: 'Processo SEI', value: dados.numProcesso },
		{ label: 'Tipo de obrigação', value: TIPO_LABEL[dados.tipo] },
		{ label: 'Data do cálculo', value: dataHora },
		{ label: 'Técnico responsável', value: dados.geradoPor || '-' },
	]);

	const identificacao: { label: string; value: string }[] = [];
	if (dados.proprietario) identificacao.push({ label: 'Proprietário / Interessado', value: dados.proprietario });
	if (dados.endereco) identificacao.push({ label: 'Endereço', value: dados.endereco });
	if (dados.sql) identificacao.push({ label: 'SQL', value: dados.sql });
	if (dados.codigoLogradouro) identificacao.push({ label: 'Código do logradouro', value: dados.codigoLogradouro });
	if (dados.setor) identificacao.push({ label: 'Setor', value: dados.setor });
	if (dados.quadra) identificacao.push({ label: 'Quadra', value: dados.quadra });
	if (dados.lote) identificacao.push({ label: 'Lote', value: dados.lote });
	if (dados.distrito) identificacao.push({ label: 'Distrito', value: dados.distrito });
	if (dados.subprefeitura) identificacao.push({ label: 'Subprefeitura', value: dados.subprefeitura });
	if (dados.zonas?.length) identificacao.push({ label: 'Zona de uso', value: dados.zonas.join(' / ') });
	if (dados.tipologiaUso) identificacao.push({ label: 'Tipologia de uso OODC', value: dados.tipologiaUso });
	if (identificacao.length) {
		await secao(ctx, 'Imovel e enquadramento');
		await kv(ctx, identificacao);
	}

	const temOutorga = dados.tipo !== 'COTA';
	if (temOutorga) {
		await secao(ctx, 'Parâmetros do cálculo');
		await kv(ctx, [
			{ label: 'Área do terreno (At)', value: dados.areaTerreno != null ? fmtArea(dados.areaTerreno) : '-' },
			{
				label: 'Área computável (Ac)',
				value: dados.areaComputavel != null ? fmtArea(dados.areaComputavel) : '-',
			},
			{
				label: 'Valor do m² - Quadro 14 (V)',
				value: dados.valorM2 != null ? `${fmtBRL(dados.valorM2)} / m²` : '-',
			},
			{
				label: 'Fator de planejamento (Fp)',
				value: dados.fatorPlanejamento != null ? fmtNum(dados.fatorPlanejamento, 4) : '-',
			},
			{
				label: 'Fator social (Fs)',
				value: dados.fatorSocial != null ? fmtNum(dados.fatorSocial, 4) : '-',
			},
		]);

		const at = dados.areaTerreno ?? 0;
		const ac = dados.areaComputavel ?? 0;
		const v = dados.valorM2 ?? 0;
		const fp = dados.fatorPlanejamento ?? 1;
		const fs = dados.fatorSocial ?? 1;
		const podeDemonstrar = at > 0 && ac > 0 && v > 0;

		await secao(ctx, 'Demonstrativo da fórmula');
		await paragrafo(
			ctx,
			'Fórmula de referência da planilha oficial de OODC (C = (At / Ac) x V x Fp x Fs; objeto = Ac - At, sem benefícios ou TDC). O valor oficial é o retornado pela API de cálculo.',
			{ size: 8, color: CINZA },
		);
		ctx.y -= 4;

		if (podeDemonstrar) {
			const c = (at / ac) * v * fp * fs;
			const objeto = Math.max(0, ac - at);
			const estimado = c * objeto;
			await formulaLinha(ctx, 'C (R$/m²) = (At / Ac) x V x Fp x Fs', fmtBRL(c));
			await formulaLinha(ctx, `At / Ac = ${fmtNum(at, 2)} / ${fmtNum(ac, 2)}`, fmtNum(at / ac, 6));
			await formulaLinha(ctx, 'Objeto da outorga (m²) = Ac - At', fmtArea(objeto));
			await formulaLinha(ctx, 'Contrapartida estimada = C x objeto', fmtBRL(estimado));
		} else {
			await paragrafo(ctx, 'Parâmetros insuficientes para montar o demonstrativo passo a passo.', {
				size: 9,
				color: CINZA,
			});
		}
	}

	await secao(ctx, 'Resultado');
	const alturaCaixa = 56;
	await garantirEspaco(ctx, alturaCaixa + 8);
	ctx.page.drawRectangle({
		x: MARGEM,
		y: ctx.y - alturaCaixa,
		width: LARGURA,
		height: alturaCaixa,
		color: AZUL_SUAVE,
		borderColor: AZUL,
		borderWidth: 0.8,
	});

	const valorPrincipal =
		dados.tipo === 'COTA'
			? dados.valorCota
			: dados.contrapartida;
	const rotuloPrincipal =
		dados.tipo === 'COTA' ? 'Valor da Cota de Solidariedade' : 'Contrapartida calculada (API de cálculo)';

	ctx.page.drawText(textoPdf(rotuloPrincipal.toUpperCase()), {
		x: MARGEM + 14,
		y: ctx.y - 18,
		size: 8,
		font: regular,
		color: AZUL,
	});
	ctx.page.drawText(textoPdf(valorPrincipal != null ? fmtBRL(valorPrincipal) : '-'), {
		x: MARGEM + 14,
		y: ctx.y - 42,
		size: 18,
		font: bold,
		color: VERDE,
	});
	ctx.y -= alturaCaixa + 12;

	const extras: { label: string; value: string }[] = [];
	if (dados.tipo === 'OUTORGA_COTA' && dados.valorCota != null) {
		extras.push({ label: 'Cota de Solidariedade', value: fmtBRL(dados.valorCota) });
	}
	if (dados.valorMulta != null && dados.valorMulta > 0) {
		extras.push({ label: 'Multa', value: fmtBRL(dados.valorMulta) });
	}
	if (extras.length) await kv(ctx, extras);

	const total =
		(dados.tipo === 'COTA' ? (dados.valorCota ?? 0) : (dados.contrapartida ?? 0)) +
		(dados.tipo === 'OUTORGA_COTA' ? (dados.valorCota ?? 0) : 0) +
		(dados.valorMulta ?? 0);
	if (extras.length) {
		await formulaLinha(ctx, 'Total informado neste cadastro', fmtBRL(total));
	}

	ctx.y -= 8;
	desenharLinha(ctx);
	ctx.y -= 14;
	await paragrafo(
		ctx,
		'Declaro que conferi os parâmetros e o valor calculado. Este memorial deve ser juntado ao processo SEI correspondente. Após a juntada, o processo segue para a CAP iniciar os trâmites administrativos de pagamento.',
		{ size: 8.5, color: CINZA },
	);
	ctx.y -= 28;
	await garantirEspaco(ctx, 48);
	const assinaturaW = 220;
	ctx.page.drawLine({
		start: { x: MARGEM, y: ctx.y },
		end: { x: MARGEM + assinaturaW, y: ctx.y },
		thickness: 0.7,
		color: CINZA,
	});
	ctx.page.drawText(textoPdf(dados.geradoPor || 'Técnico responsável'), {
		x: MARGEM,
		y: ctx.y - 14,
		size: 8,
		font: bold,
		color: PRETO,
	});
	ctx.page.drawText(textoPdf('DEUSO / SMUL'), {
		x: MARGEM,
		y: ctx.y - 26,
		size: 8,
		font: regular,
		color: CINZA,
	});

	const paginas = doc.getPages();
	for (let i = 0; i < paginas.length; i++) {
		const p = paginas[i];
		p.drawText(textoPdf(`Processo ${dados.numProcesso}  |  Página ${i + 1} de ${paginas.length}`), {
			x: MARGEM,
			y: 24,
			size: 7.5,
			font: regular,
			color: CINZA,
		});
		p.drawText(textoPdf('Portal de Outorga Onerosa - uso interno'), {
			x: A4_W - MARGEM - regular.widthOfTextAtSize('Portal de Outorga Onerosa - uso interno', 7.5),
			y: 24,
			size: 7.5,
			font: regular,
			color: CINZA,
		});
	}

	return doc.save();
}

export function nomeArquivoPdfCalculo(numProcesso: string): string {
	const seguro = numProcesso.replace(/[^\d]/g, '');
	return `memorial-calculo-${seguro || 'processo'}.pdf`;
}

import { prisma } from '@/lib/prisma';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';
import { parseDataCivil, dataCivilHoje } from '@/lib/datas';
import { classificarAntecipacao } from '@/lib/antecipacao';
import { atualizarValorTotalParcelas, buscarDetalheProcesso } from './processos';

export type AcaoParcela = 'antecipar' | 'quebra' | 'reverter' | 'reverter-antecipacao';

export type IDadosParcela = {
	num_parcela: number;
	valor: number;
	vencimento: string | Date;
};

export type IDadosParcelasEmLote = {
	quantidade: number;
	num_parcela_inicial: number;
	valor: number;
	vencimento_inicial: string | Date;
};

/** Soma `meses` à data preservando o dia (com ajuste para meses mais curtos). */
function adicionarMeses(data: Date, meses: number): Date {
	const ano = data.getUTCFullYear();
	const mes = data.getUTCMonth();
	const dia = data.getUTCDate();
	const ultimoDiaDoMesAlvo = new Date(Date.UTC(ano, mes + meses + 1, 0)).getUTCDate();
	return new Date(Date.UTC(ano, mes + meses, Math.min(dia, ultimoDiaDoMesAlvo)));
}

async function recalcularStatusEValorProcesso(processoId: string) {
	const parcelas = await prisma.parcela.findMany({ where: { processo_id: processoId } });
	await prisma.processo.update({
		where: { id: processoId },
		data: { status_pagamento: recalcularStatusPagamento(parcelas) },
	});
	await atualizarValorTotalParcelas(processoId);
}

export async function criarParcelaProcesso(processoId: string, dados: IDadosParcela) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	const vencimento = parseDataCivil(dados.vencimento);
	if (!vencimento) throw new Error('Vencimento inválido.');

	await prisma.parcela.create({
		data: {
			processo_id: processoId,
			num_parcela: dados.num_parcela,
			valor: dados.valor,
			vencimento,
		},
	});

	await recalcularStatusEValorProcesso(processoId);
	return buscarDetalheProcesso(processoId);
}

export async function criarParcelasEmLote(processoId: string, dados: IDadosParcelasEmLote) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
		throw new Error('Quantidade de parcelas inválida.');
	}
	if (dados.quantidade > 120) {
		throw new Error('Quantidade de parcelas acima do limite permitido (120).');
	}
	if (!Number.isInteger(dados.num_parcela_inicial) || dados.num_parcela_inicial < 1) {
		throw new Error('Número da primeira parcela inválido.');
	}
	if (!(dados.valor > 0)) {
		throw new Error('Valor da parcela inválido.');
	}

	const vencimentoInicial = parseDataCivil(dados.vencimento_inicial);
	if (!vencimentoInicial) throw new Error('Vencimento inválido.');

	// Gerar em lote SUBSTITUI o plano de parcelas do processo (não soma a um lote
	// anterior). Protege parcelas com histórico real — quitação ou quebra não podem
	// ser apagadas automaticamente.
	const existentes = await prisma.parcela.findMany({ where: { processo_id: processoId } });
	if (existentes.some((p) => p.status_quitacao || p.quebra)) {
		throw new Error(
			'Este processo já tem parcela quitada ou em quebra — não é possível gerar um novo lote automaticamente, pois isso apagaria histórico de pagamento. Edite as parcelas manualmente.',
		);
	}

	await prisma.$transaction([
		prisma.parcela.deleteMany({ where: { processo_id: processoId } }),
		prisma.parcela.createMany({
			data: Array.from({ length: dados.quantidade }, (_, i) => ({
				processo_id: processoId,
				num_parcela: dados.num_parcela_inicial + i,
				valor: dados.valor,
				vencimento: adicionarMeses(vencimentoInicial, i),
			})),
		}),
	]);

	await recalcularStatusEValorProcesso(processoId);
	return buscarDetalheProcesso(processoId);
}

export async function atualizarParcelaProcesso(parcelaId: string, dados: IDadosParcela) {
	const parcela = await prisma.parcela.findUnique({ where: { id: parcelaId } });
	if (!parcela) throw new Error('Parcela não encontrada.');

	const vencimento = parseDataCivil(dados.vencimento);
	if (!vencimento) throw new Error('Vencimento inválido.');

	await prisma.parcela.update({
		where: { id: parcelaId },
		data: {
			num_parcela: dados.num_parcela,
			valor: dados.valor,
			vencimento,
		},
	});

	await recalcularStatusEValorProcesso(parcela.processo_id);
	return buscarDetalheProcesso(parcela.processo_id);
}

export async function aplicarAcaoParcela(
	processoId: string,
	parcelaId: string,
	acao: AcaoParcela,
	dataQuitacao?: string | Date,
) {
	const parcela = await prisma.parcela.findFirst({
		where: { id: parcelaId, processo_id: processoId },
	});
	if (!parcela) throw new Error('Parcela não encontrada.');

	const hoje = dataCivilHoje();

	if (acao === 'antecipar') {
		if (parcela.status_quitacao) throw new Error('Parcela já quitada.');
		if (parcela.quebra) throw new Error('Parcela em quebra — reverta antes de antecipar.');

		const dataQuitacaoParsed = parseDataCivil(dataQuitacao);
		if (!dataQuitacaoParsed) throw new Error('Informe a data da quitação.');
		if (dataQuitacaoParsed.getTime() > hoje.getTime()) {
			throw new Error('Data de quitação não pode ser no futuro.');
		}

		const { antecipada, diasAntecipacao } = classificarAntecipacao(
			parcela.vencimento,
			dataQuitacaoParsed,
		);

		await prisma.parcela.update({
			where: { id: parcelaId },
			data: {
				status_quitacao: true,
				antecipada,
				data_quitacao: dataQuitacaoParsed,
				ano_pagamento: dataQuitacaoParsed.getFullYear(),
				dias_antecipacao: antecipada ? diasAntecipacao : null,
			},
		});
	} else if (acao === 'reverter-antecipacao') {
		if (!parcela.antecipada) throw new Error('Parcela não está antecipada.');
		await prisma.parcela.update({
			where: { id: parcelaId },
			data: {
				status_quitacao: false,
				antecipada: false,
				data_quitacao: null,
				ano_pagamento: null,
				dias_antecipacao: null,
			},
		});
	} else if (acao === 'quebra') {
		const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { status_pagamento: true } });
		if (processo?.status_pagamento === 'QUITADO') {
			throw new Error('Processo quitado não pode sofrer quebra.');
		}
		await prisma.parcela.update({
			where: { id: parcelaId },
			data: {
				quebra: true,
				status_quitacao: false,
				data_quitacao: null,
				ano_pagamento: null,
			},
		});
	} else if (acao === 'reverter') {
		if (!parcela.quebra) throw new Error('Parcela não está em quebra.');
		await prisma.parcela.update({
			where: { id: parcelaId },
			data: { quebra: false },
		});
	}

	const parcelas = await prisma.parcela.findMany({ where: { processo_id: processoId } });
	await prisma.processo.update({
		where: { id: processoId },
		data: { status_pagamento: recalcularStatusPagamento(parcelas) },
	});

	return buscarDetalheProcesso(processoId);
}

import { prisma } from '@/lib/prisma';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';
import { parseDataCivil } from '@/lib/datas';
import { atualizarValorTotalParcelas, buscarDetalheProcesso } from './processos';

export type AcaoParcela = 'antecipar' | 'quebra' | 'reverter' | 'reverter-antecipacao';

export type IDadosParcela = {
	num_parcela: number;
	valor: number;
	vencimento: string | Date;
	cpf_cnpj?: string | null;
};

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
			cpf_cnpj: dados.cpf_cnpj ?? undefined,
		},
	});

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
			cpf_cnpj: dados.cpf_cnpj ?? undefined,
		},
	});

	await recalcularStatusEValorProcesso(parcela.processo_id);
	return buscarDetalheProcesso(parcela.processo_id);
}

function hojeSemHora(): Date {
	const agora = new Date();
	return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export async function aplicarAcaoParcela(
	processoId: string,
	parcelaId: string,
	acao: AcaoParcela,
) {
	const parcela = await prisma.parcela.findFirst({
		where: { id: parcelaId, processo_id: processoId },
	});
	if (!parcela) throw new Error('Parcela não encontrada.');

	const hoje = hojeSemHora();

	if (acao === 'antecipar') {
		if (parcela.status_quitacao) throw new Error('Parcela já quitada.');
		if (parcela.quebra) throw new Error('Parcela em quebra — reverta antes de antecipar.');
		await prisma.parcela.update({
			where: { id: parcelaId },
			data: {
				status_quitacao: true,
				antecipada: true,
				data_quitacao: hoje,
				ano_pagamento: hoje.getFullYear(),
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

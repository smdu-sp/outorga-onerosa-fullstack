import { prisma } from '@/lib/prisma';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';
import { buscarDetalheProcesso } from './processos';

export type AcaoParcela = 'antecipar' | 'quebra' | 'reverter';

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
		await prisma.parcela.updateMany({
			where: { processo_id: processoId, status_quitacao: false, quebra: false },
			data: {
				status_quitacao: true,
				antecipada: true,
				data_quitacao: hoje,
				ano_pagamento: hoje.getFullYear(),
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

import { prisma } from '@/lib/prisma';
import { parseDataCivil, dataCivilHoje } from '@/lib/datas';
import { buscarDetalheProcesso } from './processos';

export type IDadosMulta = {
	valor: number;
	status_quitacao?: boolean;
	data_quitacao?: string | Date | null;
};

export async function salvarMultaProcesso(processoId: string, dados: IDadosMulta) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');
	if (!(dados.valor > 0)) throw new Error('Informe um valor de multa válido.');

	const quitada = Boolean(dados.status_quitacao);
	const dataQuitacao = quitada
		? parseDataCivil(dados.data_quitacao) ?? dataCivilHoje()
		: null;

	await prisma.multa.upsert({
		where: { processo_id: processoId },
		create: {
			processo_id: processoId,
			valor: dados.valor,
			status_quitacao: quitada,
			data_quitacao: dataQuitacao,
		},
		update: {
			valor: dados.valor,
			status_quitacao: quitada,
			data_quitacao: dataQuitacao,
		},
	});

	return buscarDetalheProcesso(processoId);
}

export async function quitarMultaProcesso(processoId: string, dataQuitacao?: string) {
	const multa = await prisma.multa.findUnique({ where: { processo_id: processoId } });
	if (!multa) throw new Error('Processo sem multa cadastrada.');
	if (multa.status_quitacao) throw new Error('Multa já quitada.');

	await prisma.multa.update({
		where: { processo_id: processoId },
		data: {
			status_quitacao: true,
			data_quitacao: parseDataCivil(dataQuitacao) ?? dataCivilHoje(),
		},
	});

	return buscarDetalheProcesso(processoId);
}

export async function reverterQuitarMultaProcesso(processoId: string) {
	const multa = await prisma.multa.findUnique({ where: { processo_id: processoId } });
	if (!multa) throw new Error('Processo sem multa cadastrada.');

	await prisma.multa.update({
		where: { processo_id: processoId },
		data: {
			status_quitacao: false,
			data_quitacao: null,
		},
	});

	return buscarDetalheProcesso(processoId);
}

export async function removerMultaProcesso(processoId: string) {
	const multa = await prisma.multa.findUnique({ where: { processo_id: processoId } });
	if (!multa) throw new Error('Processo sem multa cadastrada.');
	if (multa.status_quitacao) {
		throw new Error('Não é possível remover uma multa já quitada. Reverta a quitação antes.');
	}

	await prisma.multa.delete({ where: { processo_id: processoId } });
	return buscarDetalheProcesso(processoId);
}

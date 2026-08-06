import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { serializarRegistro } from '@/lib/serializar-prisma';
import {
	CoordenadoriaAnalise,
	Prisma,
	StatusCicloLicenciamento,
} from '@prisma/client';

export const processoLicenciamentoInclude = {
	divisao: true,
	assunto: true,
	situacao: true,
	tecnico_atual: { select: { id: true, nome: true, login: true } },
	imoveis: { orderBy: { ordem: 'asc' as const } },
	interessados: { orderBy: { ordem: 'asc' as const } },
	incidencias: true,
	categorias: { include: { categoria: true } },
	eventos: {
		orderBy: [{ data_inicio: 'desc' as const }, { criado_em: 'desc' as const }],
		include: {
			tipo_evento: true,
			tecnico: { select: { id: true, nome: true, login: true } },
		},
		take: 50,
	},
	oficios: { orderBy: { criado_em: 'desc' as const } },
	arquivamento: true,
	processo_outorga: {
		select: {
			id: true,
			num_processo: true,
			tipo: true,
			status_pagamento: true,
		},
	},
} satisfies Prisma.ProcessoLicenciamentoInclude;

export type ProcessoLicenciamentoDetalhe = Prisma.ProcessoLicenciamentoGetPayload<{
	include: typeof processoLicenciamentoInclude;
}>;

export async function buscarEstatisticasLicenciamento(
	coordenadoria?: CoordenadoriaAnalise,
) {
	const whereBase: Prisma.ProcessoLicenciamentoWhereInput = coordenadoria
		? { coordenadoria }
		: {};

	const [ativos, encerrados, semTecnico, prioritarios, porSituacao, porCoordenadoria] =
		await Promise.all([
			prisma.processoLicenciamento.count({
				where: { ...whereBase, status_ciclo: 'ATIVO' },
			}),
			prisma.processoLicenciamento.count({
				where: { ...whereBase, status_ciclo: 'ENCERRADO' },
			}),
			prisma.processoLicenciamento.count({
				where: {
					...whereBase,
					status_ciclo: 'ATIVO',
					tecnico_atual_id: null,
				},
			}),
			prisma.processoLicenciamento.count({
				where: {
					...whereBase,
					status_ciclo: 'ATIVO',
					prioritario: true,
				},
			}),
			prisma.processoLicenciamento.groupBy({
				by: ['situacao_id'],
				where: { ...whereBase, status_ciclo: 'ATIVO' },
				_count: { _all: true },
			}),
			coordenadoria
				? Promise.resolve([])
				: prisma.processoLicenciamento.groupBy({
						by: ['coordenadoria'],
						where: { status_ciclo: 'ATIVO' },
						_count: { _all: true },
					}),
		]);

	const situacaoIds = porSituacao
		.map((s) => s.situacao_id)
		.filter((id): id is string => !!id);

	const situacoes = situacaoIds.length
		? await prisma.situacaoLicenciamento.findMany({
				where: { id: { in: situacaoIds } },
				select: { id: true, nome: true, codigo: true },
			})
		: [];

	const mapaSituacao = new Map(situacoes.map((s) => [s.id, s]));

	return {
		ativos,
		encerrados,
		sem_tecnico: semTecnico,
		prioritarios,
		por_situacao: porSituacao.map((s) => ({
			situacao_id: s.situacao_id,
			nome: s.situacao_id
				? (mapaSituacao.get(s.situacao_id)?.nome ?? 'Sem nome')
				: 'Sem situação',
			total: s._count._all,
		})),
		por_coordenadoria: porCoordenadoria.map((c) => ({
			coordenadoria: c.coordenadoria,
			total: c._count._all,
		})),
	};
}

export async function buscarProcessosLicenciamento(params: {
	pagina?: number;
	limite?: number;
	busca?: string;
	coordenadoria?: CoordenadoriaAnalise | 'TODAS';
	statusCiclo?: StatusCicloLicenciamento | 'TODOS';
	tecnicoId?: string;
}) {
	let pagina = params.pagina ?? 1;
	let limite = params.limite ?? 10;
	[pagina, limite] = verificaPagina(pagina, limite);
	const busca = params.busca?.trim() ?? '';

	const where: Prisma.ProcessoLicenciamentoWhereInput = {};

	if (params.coordenadoria && params.coordenadoria !== 'TODAS') {
		where.coordenadoria = params.coordenadoria;
	}
	if (params.statusCiclo && params.statusCiclo !== 'TODOS') {
		where.status_ciclo = params.statusCiclo;
	}
	if (params.tecnicoId) {
		where.tecnico_atual_id = params.tecnicoId;
	}

	if (busca) {
		where.OR = [
			{ num_processo: { contains: busca } },
			{ protocolo: { contains: busca } },
			{ observacao: { contains: busca } },
			{ interessados: { some: { nome: { contains: busca } } } },
			{ imoveis: { some: { identificador: { contains: busca } } } },
			{ imoveis: { some: { logradouro: { contains: busca } } } },
			{ tecnico_atual: { nome: { contains: busca } } },
		];
	}

	const total = await prisma.processoLicenciamento.count({ where });
	if (total === 0) {
		return { pagina: 0, limite: 0, total: 0, data: [] };
	}

	[pagina, limite] = verificaLimite(pagina, limite, total);

	const rows = await prisma.processoLicenciamento.findMany({
		where,
		skip: (pagina - 1) * limite,
		take: limite,
		orderBy: [{ alterado_em: 'desc' }],
		include: {
			divisao: true,
			assunto: true,
			situacao: true,
			tecnico_atual: { select: { id: true, nome: true, login: true } },
			interessados: {
				where: { tipo_vinculo: 'PRINCIPAL' },
				take: 1,
				orderBy: { ordem: 'asc' },
			},
			imoveis: {
				where: { tipo: 'PRINCIPAL' },
				take: 1,
				orderBy: { ordem: 'asc' },
			},
			_count: { select: { eventos: true } },
		},
	});

	return {
		pagina,
		limite,
		total,
		data: rows.map((r) => serializarRegistro(r as unknown as Record<string, unknown>)),
	};
}

export async function buscarProcessoLicenciamentoPorId(id: string) {
	const processo = await prisma.processoLicenciamento.findUnique({
		where: { id },
		include: processoLicenciamentoInclude,
	});
	if (!processo) return null;
	return serializarRegistro(processo as unknown as Record<string, unknown>);
}

export async function buscarProcessoLicenciamentoPorNumero(numProcesso: string) {
	const processo = await prisma.processoLicenciamento.findUnique({
		where: { num_processo: numProcesso },
		include: processoLicenciamentoInclude,
	});
	if (!processo) return null;
	return serializarRegistro(processo as unknown as Record<string, unknown>);
}

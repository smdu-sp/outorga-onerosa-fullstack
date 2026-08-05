import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { serializarRegistro } from '@/lib/serializar-prisma';
import { ICreateProcesso, IPainelOperacional } from '@/types/processo';
import { Prisma, StatusPagamento } from '@prisma/client';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';
import { parseDataCivil } from '@/lib/datas';
import { resolverNomeInteressado } from '@/lib/interessado';
import {
	calcularPendencias,
	isCodigoPendencia,
	PENDENCIAS_META,
	wherePendencia,
	wherePendencias,
} from '@/lib/pendencias-processo';

export const processoDetalheInclude = {
	parcelas: { orderBy: { num_parcela: 'asc' as const } },
	sqls: {
		orderBy: { criado_em: 'asc' as const },
		include: { enderecos: { orderBy: { ordem: 'asc' as const } } },
	},
	multa: true,
	monitoramento: {
		include: {
			coordenada: true,
			localizacao_lote: true,
			enderecos: { orderBy: { ordem: 'asc' as const } },
			enquadramento_urbanistico: true,
			subcategorias_uso: true,
			calculo_outorga: true,
			situacao: true,
			licencas: true,
			anotacoes_deuso: true,
		},
	},
	monitoramento_cota: true,
} satisfies Prisma.ProcessoInclude;

function mapParcelasCreate(parcelas: ICreateProcesso['parcelas']) {
	return (parcelas ?? []).map((parcela) => ({
		valor: parcela.valor || 0,
		vencimento: parcela.vencimento,
		num_parcela: parcela.num_parcela,
		data_quitacao: parcela.data_quitacao || undefined,
		status_quitacao: parcela.status_quitacao || false,
		antecipada: false,
		quebra: parcela.quebra || false,
		ano_pagamento: parcela.ano_pagamento || undefined,
		cpf_cnpj: parcela.cpf_cnpj,
	}));
}

function statusInicialProcesso(parcelas: ICreateProcesso['parcelas']): StatusPagamento {
	if (!parcelas?.length) return 'EM_PAGAMENTO';
	return recalcularStatusPagamento(
		parcelas.map((p) => ({
			status_quitacao: p.status_quitacao ?? false,
			quebra: p.quebra ?? false,
		})),
	);
}

export async function importarProcessos(createProcessoDto: ICreateProcesso[], usuarioId?: string) {
	const resultado = {
		erros: [] as { num_processo: string; erro: unknown }[],
		novos_registros: [] as string[],
	};

	await Promise.all(
		createProcessoDto.map(async (processo) => {
			try {
				await prisma.processo.create({
					data: {
						tipo: processo.tipo as 'PDE' | 'COTA' | 'AIU' | undefined,
						num_processo: processo.num_processo,
						protocolo_ad: processo.protocolo_ad,
						data_entrada: processo.data_entrada,
						criado_por: usuarioId,
						parcelas: {
							create: mapParcelasCreate(processo.parcelas),
						},
					},
				});
				resultado.novos_registros.push(processo.num_processo);
			} catch (error) {
				resultado.erros.push({ num_processo: processo.num_processo, erro: error });
			}
		}),
	);

	return resultado;
}

export async function criarProcesso(createProcessoDto: ICreateProcesso, usuarioId?: string) {
	const { num_processo, parcelas, ...processo } = createProcessoDto;
	const processoExiste = await prisma.processo.findUnique({
		where: { num_processo },
	});
	if (processoExiste) {
		throw new Error('Processo já cadastrado.');
	}

	return prisma.processo.create({
		data: {
			num_processo,
			tipo: processo.tipo as 'PDE' | 'COTA' | 'AIU' | undefined,
			protocolo_ad: processo.protocolo_ad,
			data_entrada: processo.data_entrada,
			origem: processo.origem as 'APROVA_DIGITAL' | 'SEI' | 'FISICO' | 'PORTAL' | undefined,
			status_pagamento: statusInicialProcesso(parcelas),
			criado_por: usuarioId,
			...(parcelas &&
				parcelas.length > 0 && {
					parcelas: { create: mapParcelasCreate(parcelas) },
				}),
		},
		include: { parcelas: true },
	});
}

export type IAtualizarDadosIniciais = Partial<{
	tipo: string;
	codigo: string;
	num_processo: string;
	protocolo_ad: string;
	data_entrada: string | Date;
	data_autuacao: string | Date;
	interessado: string;
	cnpj: string;
	sql_incra: string;
	sql_formatado: string;
	origem: string;
}>;

export async function atualizarProcesso(processoId: string, dados: IAtualizarDadosIniciais) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	const data: Prisma.ProcessoUpdateInput = {
		...(dados.tipo !== undefined && { tipo: dados.tipo as 'PDE' | 'COTA' | 'AIU' }),
		...(dados.codigo !== undefined && { codigo: dados.codigo }),
		...(dados.num_processo !== undefined && { num_processo: dados.num_processo }),
		...(dados.protocolo_ad !== undefined && { protocolo_ad: dados.protocolo_ad }),
		...(dados.data_entrada !== undefined && { data_entrada: parseDataCivil(dados.data_entrada) }),
		...(dados.data_autuacao !== undefined && { data_autuacao: parseDataCivil(dados.data_autuacao) }),
		...(dados.interessado !== undefined && { interessado: dados.interessado || null }),
		...(dados.cnpj !== undefined && { cnpj: dados.cnpj || null }),
		...(dados.sql_incra !== undefined && { sql_incra: dados.sql_incra || null }),
		...(dados.sql_formatado !== undefined && { sql_formatado: dados.sql_formatado || null }),
		...(dados.origem !== undefined && {
			origem: (dados.origem || null) as 'APROVA_DIGITAL' | 'SEI' | 'FISICO' | 'PORTAL' | null,
		}),
	};

	await prisma.processo.update({ where: { id: processoId }, data });
	return buscarDetalheProcesso(processoId);
}

export async function somaParcelasProcesso(processoId: string) {
	const agregada = await prisma.parcela.aggregate({
		where: { processo_id: processoId },
		_sum: { valor: true },
	});
	return agregada._sum.valor ?? 0;
}

export async function atualizarValorTotalParcelas(processoId: string) {
	const soma = await somaParcelasProcesso(processoId);
	await prisma.processo.update({
		where: { id: processoId },
		data: { valor_total_parcelas: soma },
	});
	return soma;
}

export async function recalcularContrapartidaProcesso(processoId: string) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	// valor_total_parcelas continua somando tudo (Outorga + Cota, quando houver as
	// duas — regra de ouro do domínio). Já contrapartida_total é campo exclusivo de
	// Outorga (monitoramento_calculo_outorga) — não pode incluir parcelas de Cota.
	await atualizarValorTotalParcelas(processoId);

	// OR explícito (em vez de `obrigacao: { not: 'COTA' }`) para não depender de como
	// o Prisma trata NULL em filtros de negação num enum opcional — parcela sem
	// obrigacao (legada) precisa continuar contando como Outorga, sem ambiguidade.
	const somaOutorga = await prisma.parcela.aggregate({
		where: {
			processo_id: processoId,
			OR: [{ obrigacao: 'PDE' }, { obrigacao: 'AIU' }, { obrigacao: null }],
		},
		_sum: { valor: true },
	});

	const ficha = await prisma.monitoramentoFicha.findUnique({ where: { processo_id: processoId } });
	if (ficha) {
		await prisma.monitoramentoCalculoOutorga.updateMany({
			where: { monitoramento_ficha_id: ficha.id },
			data: { contrapartida_total: somaOutorga._sum.valor ?? 0 },
		});
	}

	return buscarDetalheProcesso(processoId);
}

export async function buscarDetalheProcesso(id: string) {
	const processo = await prisma.processo.findUnique({
		where: { id },
		include: processoDetalheInclude,
	});
	if (!processo) throw new Error('Processo não encontrado.');
	return serializarRegistro(processo as unknown as Record<string, unknown>);
}

export type FiltroAcessoProcessos = { criadoPor?: string; apenasQuitados?: boolean };

/** Processo criado pelo fluxo do Técnico (origem PORTAL) e ainda sem nenhuma parcela cadastrada pelo CAP. */
const FILTRO_PROCESSOS_NOVOS: Prisma.ProcessoWhereInput = {
	origem: 'PORTAL',
	criado_por: { not: null },
	parcelas: { none: {} },
};

function whereAcessoProcesso(
	filtroAcesso?: FiltroAcessoProcessos,
): Prisma.ProcessoWhereInput | undefined {
	if (filtroAcesso?.criadoPor) return { criado_por: filtroAcesso.criadoPor };
	if (filtroAcesso?.apenasQuitados) return { status_pagamento: 'QUITADO' };
	return undefined;
}

const processoPainelSelect = {
	id: true,
	tipo: true,
	num_processo: true,
	interessado: true,
	cnpj: true,
	status_pagamento: true,
	data_entrada: true,
	criado_em: true,
	monitoramento: {
		select: {
			proprietario_interessado: true,
			enquadramento_urbanistico: {
				select: {
					distrito: true,
					subprefeitura: true,
					zona_uso_1_18081: true,
					zona_uso_2_17975: true,
					zona_uso_3_16402: true,
					zona_uso_4_16050: true,
					zona_uso_5_13885: true,
					zona_uso_6_13885: true,
				},
			},
		},
	},
	monitoramento_cota: { select: { proprietario_interessado: true } },
	parcelas: {
		select: {
			status_quitacao: true,
			quebra: true,
			data_quitacao: true,
		},
	},
} satisfies Prisma.ProcessoSelect;

/** Painel operacional da home: alertas + filas do dia (não é dashboard analítico). */
export async function painelOperacional(
	filtroAcesso?: FiltroAcessoProcessos,
): Promise<IPainelOperacional> {
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);
	const em30 = new Date(hoje);
	em30.setDate(em30.getDate() + 30);
	em30.setHours(23, 59, 59, 999);

	const acessoProcesso = whereAcessoProcesso(filtroAcesso);
	const acessoParcela = acessoProcesso ? { processo: acessoProcesso } : {};

	const baseAberta: Prisma.ParcelaWhereInput = {
		status_quitacao: false,
		quebra: false,
		...acessoParcela,
	};

	const wherePendenciasCriticas: Prisma.ProcessoWhereInput = {
		AND: [
			...(acessoProcesso ? [acessoProcesso] : []),
			{
				OR: [
					wherePendencia('SEM_PARCELAS'),
					wherePendencia('FALTA_DISTRITO'),
					wherePendencia('FALTA_SUBPREFEITURA'),
				],
			},
		],
	};

	const whereNovos: Prisma.ProcessoWhereInput = {
		AND: [...(acessoProcesso ? [acessoProcesso] : []), FILTRO_PROCESSOS_NOVOS],
	};

	const [
		parcelasVencidas,
		parcelasAVencer30d,
		processosNovos,
		pendenciasCriticas,
		parcelasProximas,
		processosRecentesRaw,
	] = await Promise.all([
		prisma.parcela.count({
			where: { ...baseAberta, vencimento: { lt: hoje } },
		}),
		prisma.parcela.count({
			where: { ...baseAberta, vencimento: { gte: hoje, lte: em30 } },
		}),
		prisma.processo.count({ where: whereNovos }),
		prisma.processo.count({ where: wherePendenciasCriticas }),
		prisma.parcela.findMany({
			where: { ...baseAberta, vencimento: { gte: hoje, lte: em30 } },
			orderBy: { vencimento: 'asc' },
			take: 15,
			include: {
				processo: {
					select: {
						id: true,
						tipo: true,
						num_processo: true,
						interessado: true,
						cnpj: true,
						monitoramento: { select: { proprietario_interessado: true } },
						monitoramento_cota: { select: { proprietario_interessado: true } },
					},
				},
			},
		}),
		prisma.processo.findMany({
			where: acessoProcesso,
			orderBy: { criado_em: 'desc' },
			take: 10,
			select: processoPainelSelect,
		}),
	]);

	const vencimentos30d = parcelasProximas.map((p) => {
		const dias = Math.ceil(
			(p.vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
		);
		return {
			parcelaId: p.id,
			processoId: p.processo.id,
			numProcesso: p.processo.num_processo,
			interessado: resolverNomeInteressado(p.processo),
			tipo: p.processo.tipo ?? 'PDE',
			valor: p.valor,
			vencimento: p.vencimento.toISOString().slice(0, 10),
			dias,
			numParcela: p.num_parcela,
		};
	});

	const processosRecentes = processosRecentesRaw.map((proc) => {
		const pendencias = calcularPendencias({
			tipo: proc.tipo ?? null,
			parcelas: proc.parcelas,
			enquadramento: proc.monitoramento?.enquadramento_urbanistico ?? null,
		});
		const temPendenciaCritica = pendencias.some(
			(c) => PENDENCIAS_META[c].severidade === 'critica',
		);
		return {
			id: proc.id,
			numProcesso: proc.num_processo,
			interessado: resolverNomeInteressado(proc),
			tipo: proc.tipo,
			statusPagamento: proc.status_pagamento,
			dataEntrada: proc.data_entrada
				? proc.data_entrada.toISOString().slice(0, 10)
				: null,
			criadoEm: proc.criado_em.toISOString(),
			pendencias,
			temPendenciaCritica,
		};
	});

	return {
		contagens: {
			parcelasVencidas,
			parcelasAVencer30d,
			processosNovos,
			pendenciasCriticas,
		},
		vencimentos30d,
		processosRecentes,
	};
}

const processoListaInclude = {
	parcelas: { orderBy: { num_parcela: 'asc' as const } },
	monitoramento: {
		select: {
			proprietario_interessado: true,
			enquadramento_urbanistico: {
				select: {
					distrito: true,
					subprefeitura: true,
					zona_uso_1_18081: true,
					zona_uso_2_17975: true,
					zona_uso_3_16402: true,
					zona_uso_4_16050: true,
					zona_uso_5_13885: true,
					zona_uso_6_13885: true,
				},
			},
		},
	},
	monitoramento_cota: { select: { proprietario_interessado: true, valor_devido: true } },
} satisfies Prisma.ProcessoInclude;

function mapProcessoLista(
	processo: Prisma.ProcessoGetPayload<{ include: typeof processoListaInclude }>,
) {
	const parcelas = processo.parcelas ?? [];
	const pagas = parcelas.filter((p) => p.status_quitacao).length;
	const interessado =
		processo.interessado ??
		processo.monitoramento?.proprietario_interessado ??
		processo.monitoramento_cota?.proprietario_interessado ??
		null;
	const cpf_cnpj = processo.cnpj ?? null;

	let valor_devido = 0;
	const valorPlanilha = processo.monitoramento_cota?.valor_devido;
	if (valorPlanilha) {
		valor_devido = Number(valorPlanilha);
	} else if (processo.status_pagamento !== 'QUITADO') {
		valor_devido = parcelas
			.filter((p) => !p.status_quitacao)
			.reduce((acc, p) => acc + p.valor, 0);
	}

	const pendencias = calcularPendencias({
		tipo: processo.tipo ?? null,
		parcelas,
		enquadramento: processo.monitoramento?.enquadramento_urbanistico ?? null,
	});

	return {
		id: processo.id,
		tipo: processo.tipo ?? undefined,
		codigo: processo.codigo ?? undefined,
		num_processo: processo.num_processo,
		protocolo_ad: processo.protocolo_ad ?? undefined,
		data_entrada: processo.data_entrada ?? undefined,
		status_pagamento: processo.status_pagamento,
		origem: processo.origem ?? undefined,
		criado_por: processo.criado_por ?? undefined,
		parcelas,
		total_parcelas: parcelas.length,
		interessado,
		cpf_cnpj,
		valor_devido,
		parcelas_pagas: pagas,
		parcelas_total: parcelas.length,
		pendencias,
	};
}

function montarFiltrosProcessos(
	busca?: string,
	tipo?: string,
	status?: string,
	vencimento?: string,
	pendencia?: string,
	filtroAcesso?: FiltroAcessoProcessos,
	novo?: string,
) {
	const termo = busca?.trim();
	const filtros: Prisma.ProcessoWhereInput[] = [];

	if (filtroAcesso?.criadoPor) {
		filtros.push({ criado_por: filtroAcesso.criadoPor });
	}
	if (filtroAcesso?.apenasQuitados) {
		filtros.push({ status_pagamento: 'QUITADO' });
	}
	if (novo === 'SIM') {
		filtros.push(FILTRO_PROCESSOS_NOVOS);
	}

	if (termo) {
		filtros.push({
			OR: [
				{ num_processo: { contains: termo } },
				{ protocolo_ad: { contains: termo } },
				{ interessado: { contains: termo } },
				{ cnpj: { contains: termo } },
				{ monitoramento: { proprietario_interessado: { contains: termo } } },
				{
					monitoramento_cota: { proprietario_interessado: { contains: termo } },
				},
			],
		});
	}

	if (tipo && tipo !== 'TODOS') {
		filtros.push({ tipo: tipo as 'PDE' | 'COTA' });
	}

	if (status && status !== 'TODOS') {
		filtros.push({ status_pagamento: status as 'EM_PAGAMENTO' | 'QUITADO' | 'QUEBRA' });
	}

	if (pendencia && pendencia !== 'TODOS') {
		if (pendencia === 'TODAS') filtros.push(wherePendencias());
		else if (isCodigoPendencia(pendencia)) filtros.push(wherePendencia(pendencia));
	}

	if (vencimento === 'MES') {
		const hoje = new Date();
		const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
		const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
		filtros.push({ parcelas: { some: { status_quitacao: false, vencimento: { gte: inicio, lte: fim } } } });
	} else if (vencimento === '7DIAS') {
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const em7 = new Date(hoje);
		em7.setDate(em7.getDate() + 7);
		em7.setHours(23, 59, 59);
		filtros.push({ parcelas: { some: { status_quitacao: false, vencimento: { gte: hoje, lte: em7 } } } });
	}

	return filtros.length > 0 ? { AND: filtros } : {};
}

export async function buscarEstatisticasProcessos() {
	const [total, em_pagamento, quitados, quebras, processosQuebra] =
		await Promise.all([
			prisma.processo.count(),
			prisma.processo.count({ where: { status_pagamento: 'EM_PAGAMENTO' } }),
			prisma.processo.count({ where: { status_pagamento: 'QUITADO' } }),
			prisma.processo.count({ where: { status_pagamento: 'QUEBRA' } }),
			prisma.processo.findMany({
				where: { status_pagamento: 'QUEBRA' },
				include: {
					parcelas: true,
					monitoramento_cota: { select: { valor_devido: true } },
				},
			}),
		]);

	// Valor não pago pelos processos em quebra (dinheiro que o município deixou de receber).
	const valor_quebra = processosQuebra.reduce((acc, processo) => {
		const valorPlanilha = processo.monitoramento_cota?.valor_devido;
		if (valorPlanilha) return acc + Number(valorPlanilha);
		return (
			acc +
			processo.parcelas
				.filter((p) => !p.status_quitacao)
				.reduce((s, p) => s + p.valor, 0)
		);
	}, 0);

	return { total, em_pagamento, quitados, quebras, valor_quebra };
}

/** Processos enviados pelo Técnico (fluxo de cálculo) que CAP ainda não cadastrou parcela. */
export async function contarProcessosNovos() {
	return prisma.processo.count({ where: FILTRO_PROCESSOS_NOVOS });
}

export async function buscarTodosProcessos(
	pagina = 1,
	limite = 10,
	busca?: string,
	tipo?: string,
	status?: string,
	vencimento?: string,
	pendencia?: string,
	filtroAcesso?: FiltroAcessoProcessos,
	novo?: string,
) {
	[pagina, limite] = verificaPagina(pagina, limite);
	const where = montarFiltrosProcessos(busca, tipo, status, vencimento, pendencia, filtroAcesso, novo);

	const total = await prisma.processo.count({ where });
	if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };

	[pagina, limite] = verificaLimite(pagina, limite, total);

	const processos = await prisma.processo.findMany({
		where,
		skip: (pagina - 1) * limite,
		take: limite,
		orderBy: { data_entrada: 'desc' },
		include: processoListaInclude,
	});

	return {
		total,
		pagina,
		limite,
		data: processos.map(mapProcessoLista),
	};
}

export async function relatoriosPrincipal(data_inicio?: string, data_fim?: string) {
	const data_inicio_date = data_inicio ? new Date(data_inicio) : new Date();
	const data_fim_date = data_fim ? new Date(data_fim) : new Date();
	const gte = new Date(data_inicio_date.getFullYear(), data_inicio_date.getMonth(), 1);
	const lte = new Date(data_fim_date.getFullYear(), data_fim_date.getMonth() + 1, 0);

	const valor_mes = await prisma.parcela.aggregate({
		_sum: { valor: true },
		where: { vencimento: { gte, lte } },
	});

	const processos_mes = await prisma.parcela.findMany({
		where: { vencimento: { gte, lte } },
		select: { processo_id: true },
		distinct: ['processo_id'],
	});

	return {
		valor_mes: +(valor_mes._sum.valor ?? 0),
		processos_mes: processos_mes.length,
	};
}

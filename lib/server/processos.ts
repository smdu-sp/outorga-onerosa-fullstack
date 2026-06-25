import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { serializarRegistro } from '@/lib/serializar-prisma';
import { ICreateProcesso } from '@/types/processo';
import { Prisma, StatusPagamento } from '@prisma/client';
import { recalcularStatusPagamento } from '@/lib/parcelas-utils';

export const processoDetalheInclude = {
	parcelas: { orderBy: { num_parcela: 'asc' as const } },
	sqls: {
		orderBy: { criado_em: 'asc' as const },
		include: { enderecos: { orderBy: { ordem: 'asc' as const } } },
	},
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

export async function importarProcessos(createProcessoDto: ICreateProcesso[]) {
	const resultado = {
		erros: [] as { num_processo: string; erro: unknown }[],
		novos_registros: [] as string[],
	};

	await Promise.all(
		createProcessoDto.map(async (processo) => {
			try {
				await prisma.processo.create({
					data: {
						tipo: processo.tipo as 'PDE' | 'COTA' | undefined,
						num_processo: processo.num_processo,
						protocolo_ad: processo.protocolo_ad,
						data_entrada: processo.data_entrada,
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

export async function criarProcesso(createProcessoDto: ICreateProcesso) {
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
			tipo: processo.tipo as 'PDE' | 'COTA' | undefined,
			protocolo_ad: processo.protocolo_ad,
			data_entrada: processo.data_entrada,
			status_pagamento: statusInicialProcesso(parcelas),
			...(parcelas &&
				parcelas.length > 0 && {
					parcelas: { create: mapParcelasCreate(parcelas) },
				}),
		},
		include: { parcelas: true },
	});
}

export async function buscarDetalheProcesso(id: string) {
	const processo = await prisma.processo.findUnique({
		where: { id },
		include: processoDetalheInclude,
	});
	if (!processo) throw new Error('Processo não encontrado.');
	return serializarRegistro(processo as unknown as Record<string, unknown>);
}

export async function dashboardProcessos() {
	const meses = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
	];
	const data = new Date();
	const gte = new Date(data.getFullYear(), data.getMonth(), 1);
	const lte = new Date(data.getFullYear(), data.getMonth() + 1, 0);

	const parcelas = await prisma.parcela.findMany({
		where: { vencimento: { gte, lte } },
		include: { processo: true },
	});

	const pde = parcelas.filter((p) => p.processo.tipo === 'PDE');
	const cota = parcelas.filter((p) => p.processo.tipo === 'COTA');

	const quantidadeTipo = [
		{ label: 'PDE', value: pde.length },
		{ label: 'COTA', value: cota.length },
	];
	const valorTipo = [
		{ label: 'PDE', value: pde.reduce((acc, p) => acc + p.valor, 0).toFixed(2) },
		{ label: 'COTA', value: cota.reduce((acc, p) => acc + p.valor, 0).toFixed(2) },
	];

	const processosTotal = await prisma.processo.count();

	const parcelasRecebidas = await prisma.parcela.findMany({
		where: {
			status_quitacao: true,
			vencimento: {
				gte: new Date(data.getFullYear(), 0, 1),
				lt: new Date(data.getFullYear(), data.getMonth(), data.getDate()),
			},
		},
	});

	const parcelasReceber = await prisma.parcela.findMany({
		where: {
			status_quitacao: false,
			processo: { status_pagamento: 'EM_PAGAMENTO' },
			vencimento: {
				gte: new Date(data.getFullYear(), data.getMonth(), data.getDate()),
				lt: new Date(data.getFullYear() + 1, 0, 1),
			},
		},
	});

	const totalRecebido = parcelasRecebidas
		.reduce((acc, p) => acc + p.valor, 0)
		.toFixed(2);
	const totalReceber = parcelasReceber
		.reduce((acc, p) => acc + p.valor, 0)
		.toFixed(2);

	const mesAtual = data.getMonth();
	const anoAtual = data.getFullYear();
	const projecaoMensal: { label: string; value: number }[] = [];
	const recebidoMensal: { label: string; value: number }[] = [];

	for (let i = mesAtual; i < 12; i++) {
		const doMes = parcelasReceber.filter(
			(p) => p.vencimento.getMonth() === i && p.vencimento.getFullYear() === anoAtual,
		);
		projecaoMensal.push({
			label: `${meses[i]}/${anoAtual}`,
			value: +doMes.reduce((acc, p) => acc + p.valor, 0).toFixed(2),
		});
	}
	for (let i = 0; i < mesAtual; i++) {
		const doMes = parcelasRecebidas.filter(
			(p) => p.vencimento.getMonth() === i && p.vencimento.getFullYear() === anoAtual,
		);
		recebidoMensal.push({
			label: `${meses[i]}/${anoAtual}`,
			value: +doMes.reduce((acc, p) => acc + p.valor, 0).toFixed(2),
		});
	}

	return {
		quantidadeTipo,
		valorTipo,
		processosTotal,
		totalRecebido,
		totalReceber,
		projecaoMensal,
		recebidoMensal,
	};
}

const processoListaInclude = {
	parcelas: { orderBy: { num_parcela: 'asc' as const } },
	monitoramento: { select: { proprietario_interessado: true } },
	monitoramento_cota: { select: { proprietario_interessado: true, valor_devido: true } },
} satisfies Prisma.ProcessoInclude;

function parseValorMonetario(valor?: string | null): number {
	if (!valor?.trim()) return 0;
	const normalizado = valor
		.replace(/[^\d,.-]/g, '')
		.replace(/\.(?=\d{3}(?:\D|$))/g, '')
		.replace(',', '.');
	const n = Number.parseFloat(normalizado);
	return Number.isFinite(n) ? n : 0;
}

function mapProcessoLista(
	processo: Prisma.ProcessoGetPayload<{ include: typeof processoListaInclude }>,
) {
	const parcelas = processo.parcelas ?? [];
	const pagas = parcelas.filter((p) => p.status_quitacao).length;
	const interessado =
		processo.monitoramento?.proprietario_interessado ??
		processo.monitoramento_cota?.proprietario_interessado ??
		null;
	const cpf_cnpj = parcelas.find((p) => p.cpf_cnpj)?.cpf_cnpj ?? null;

	let valor_devido = 0;
	const valorPlanilha = processo.monitoramento_cota?.valor_devido;
	if (valorPlanilha) {
		valor_devido = parseValorMonetario(valorPlanilha);
	} else if (processo.status_pagamento !== 'QUITADO') {
		valor_devido = parcelas
			.filter((p) => !p.status_quitacao)
			.reduce((acc, p) => acc + p.valor, 0);
	}

	return {
		id: processo.id,
		tipo: processo.tipo ?? undefined,
		codigo: processo.codigo ?? undefined,
		num_processo: processo.num_processo,
		protocolo_ad: processo.protocolo_ad ?? undefined,
		data_entrada: processo.data_entrada ?? undefined,
		status_pagamento: processo.status_pagamento,
		parcelas,
		total_parcelas: parcelas.length,
		interessado,
		cpf_cnpj,
		valor_devido,
		parcelas_pagas: pagas,
		parcelas_total: parcelas.length,
	};
}

function montarFiltrosProcessos(busca?: string, tipo?: string, status?: string, vencimento?: string) {
	const termo = busca?.trim();
	const filtros: Prisma.ProcessoWhereInput[] = [];

	if (termo) {
		filtros.push({
			OR: [
				{ num_processo: { contains: termo } },
				{ protocolo_ad: { contains: termo } },
				{ parcelas: { some: { cpf_cnpj: { contains: termo } } } },
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
	const [total, em_pagamento, quitados, quebras, processosComValor] =
		await Promise.all([
			prisma.processo.count(),
			prisma.processo.count({ where: { status_pagamento: 'EM_PAGAMENTO' } }),
			prisma.processo.count({ where: { status_pagamento: 'QUITADO' } }),
			prisma.processo.count({ where: { status_pagamento: 'QUEBRA' } }),
			prisma.processo.findMany({
				where: { status_pagamento: { in: ['EM_PAGAMENTO', 'QUEBRA'] } },
				include: {
					parcelas: true,
					monitoramento_cota: { select: { valor_devido: true } },
				},
			}),
		]);

	const a_receber = processosComValor.reduce((acc, processo) => {
		const valorPlanilha = processo.monitoramento_cota?.valor_devido;
		if (valorPlanilha) return acc + parseValorMonetario(valorPlanilha);
		return (
			acc +
			processo.parcelas
				.filter((p) => !p.status_quitacao)
				.reduce((s, p) => s + p.valor, 0)
		);
	}, 0);

	return { total, em_pagamento, quitados, quebras, a_receber };
}

export async function buscarTodosProcessos(
	pagina = 1,
	limite = 10,
	busca?: string,
	tipo?: string,
	status?: string,
	vencimento?: string,
) {
	[pagina, limite] = verificaPagina(pagina, limite);
	const where = montarFiltrosProcessos(busca, tipo, status, vencimento);

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

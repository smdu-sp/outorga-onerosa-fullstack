import { prisma } from '@/lib/prisma';
import { mesArrecadacaoParcela, parcelaArrecadadaNoPeriodo } from '@/lib/parcelas-utils';
import type {
	IComparativoPlanejamentoExecutado,
	IConfiguracaoPlanejamento,
	IHistoricoAnoArrecadado,
	IPlanejamentoOrcamentario,
	IPlanejamentoParametroCorrecao,
	IPlanejamentoOrcamentarioMes,
	IPlanejamentoResumo,
	IPlanejamentoRevisao,
	ISugestaoPlanejamento,
	MetodoDistribuicao,
} from '@/types/planejamento-orcamentario';

const MESES_NOME = [
	'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
	'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Prazo default (10/dez) até o DEV configurar `ConfiguracaoPlanejamento` explicitamente. */
const PRAZO_PADRAO = { dia_limite: 10, mes_limite: 12 };

export interface ParametroCorrecaoInput {
	nome: string;
	percentual: number;
}

export interface MesInput {
	mes: number;
	valor: number;
	editado_manualmente: boolean;
}

export interface HistoricoOverrideInput {
	ano: number;
	valor: number | null;
}

/**
 * Arrecadação real (parcelas + multas quitadas) de um ano, mês a mês.
 * Mesma regra de "arrecadado" do resto do sistema — ver golden rule #2 do CLAUDE.md
 * e o loop histórico de lib/server/relatorios.ts.
 */
export async function arrecadacaoAnualPorMes(
	ano: number,
): Promise<{ ano: number; mensal: number[]; total: number }> {
	const inicio = new Date(ano, 0, 1);
	const fim = new Date(ano + 1, 0, 1);

	const [parcelas, multas] = await Promise.all([
		prisma.parcela.findMany({
			where: { status_quitacao: true },
			select: {
				valor: true,
				vencimento: true,
				data_quitacao: true,
				ano_pagamento: true,
				status_quitacao: true,
			},
		}),
		prisma.multa.findMany({
			where: { status_quitacao: true, data_quitacao: { gte: inicio, lt: fim } },
			select: { valor: true, data_quitacao: true },
		}),
	]);

	const mensal = Array(12).fill(0) as number[];
	for (const p of parcelas) {
		if (!parcelaArrecadadaNoPeriodo(p, { ano })) continue;
		const mes = mesArrecadacaoParcela(p);
		if (mes == null) continue;
		mensal[mes] += p.valor;
	}
	for (const m of multas) {
		if (!m.data_quitacao) continue;
		mensal[m.data_quitacao.getMonth()] += Number(m.valor);
	}

	const total = mensal.reduce((s, v) => s + v, 0);
	return { ano, mensal, total };
}

/** Prazo de edição configurado, ou o default (10/dez) se o DEV ainda não configurou. */
export async function buscarConfiguracaoPlanejamento(): Promise<IConfiguracaoPlanejamento> {
	const config = await prisma.configuracaoPlanejamento.findFirst();
	if (config) {
		return {
			dia_limite: config.dia_limite,
			mes_limite: config.mes_limite,
			alterado_em: config.alterado_em,
		};
	}
	return { ...PRAZO_PADRAO, alterado_em: null };
}

export async function salvarConfiguracaoPlanejamento(
	dia_limite: number,
	mes_limite: number,
	usuarioId: string,
): Promise<IConfiguracaoPlanejamento> {
	if (!Number.isInteger(dia_limite) || dia_limite < 1 || dia_limite > 31) {
		throw new Error('Dia limite inválido.');
	}
	if (!Number.isInteger(mes_limite) || mes_limite < 1 || mes_limite > 12) {
		throw new Error('Mês limite inválido.');
	}

	const existente = await prisma.configuracaoPlanejamento.findFirst();
	const salvo = existente
		? await prisma.configuracaoPlanejamento.update({
				where: { id: existente.id },
				data: { dia_limite, mes_limite, alterado_por: usuarioId },
			})
		: await prisma.configuracaoPlanejamento.create({
				data: { dia_limite, mes_limite, alterado_por: usuarioId },
			});

	return { dia_limite: salvo.dia_limite, mes_limite: salvo.mes_limite, alterado_em: salvo.alterado_em };
}

/**
 * Prazo normal de edição (o mesmo para todo mundo, sem o bypass de DEV) — contado a
 * partir do ano anterior ao planejado (ex.: planejamento de 2027, prazo 10/12 →
 * editável até 10/12/2026). Usado para decidir se uma edição de DEV conta como
 * "revisão" (fora do prazo normal, precisa de motivo e fica registrada).
 */
export async function dentroDoPrazoNormal(ano: number, hoje: Date = new Date()): Promise<boolean> {
	const config = await buscarConfiguracaoPlanejamento();
	const prazo = new Date(ano - 1, config.mes_limite - 1, config.dia_limite, 23, 59, 59, 999);
	return hoje.getTime() <= prazo.getTime();
}

/**
 * DEV pode editar qualquer ano, a qualquer momento (inclusive anos passados, para
 * carga histórica). Admin comum só até o prazo configurado — ver `dentroDoPrazoNormal`.
 */
export async function podeEditarPlanejamento(
	ano: number,
	isDev: boolean,
	hoje: Date = new Date(),
): Promise<boolean> {
	if (isDev) return true;
	return dentroDoPrazoNormal(ano, hoje);
}

function mapearPlanejamento(plano: {
	id: string;
	ano: number;
	media_base_3_anos: unknown;
	valor_anual: unknown;
	metodo_distribuicao: MetodoDistribuicao;
	criado_em: Date;
	alterado_em: Date;
	parametros: { id: string; nome: string; percentual: unknown; ordem: number }[];
	meses: { id: string; mes: number; valor: unknown; editado_manualmente: boolean }[];
	historicoAno: { ano: number; valor_real: unknown; valor_ajustado: unknown }[];
}): IPlanejamentoOrcamentario {
	return {
		id: plano.id,
		ano: plano.ano,
		media_base_3_anos: Number(plano.media_base_3_anos),
		valor_anual: Number(plano.valor_anual),
		metodo_distribuicao: plano.metodo_distribuicao,
		criado_em: plano.criado_em,
		alterado_em: plano.alterado_em,
		parametros: plano.parametros
			.sort((a, b) => a.ordem - b.ordem)
			.map((p) => ({ id: p.id, nome: p.nome, percentual: Number(p.percentual), ordem: p.ordem })),
		meses: plano.meses
			.sort((a, b) => a.mes - b.mes)
			.map((m): IPlanejamentoOrcamentarioMes => ({
				id: m.id,
				mes: m.mes,
				valor: Number(m.valor),
				editado_manualmente: m.editado_manualmente,
			})),
		historico: plano.historicoAno
			.sort((a, b) => a.ano - b.ano)
			.map((h): IHistoricoAnoArrecadado => ({
				ano: h.ano,
				total: Number(h.valor_real),
				valor_ajustado: h.valor_ajustado === null ? null : Number(h.valor_ajustado),
			})),
	};
}

export async function buscarPlanejamento(ano: number): Promise<IPlanejamentoOrcamentario | null> {
	const plano = await prisma.planejamentoOrcamentario.findUnique({
		where: { ano },
		include: { parametros: true, meses: true, historicoAno: true },
	});
	return plano ? mapearPlanejamento(plano) : null;
}

export async function listarPlanejamentos(): Promise<IPlanejamentoResumo[]> {
	const planos = await prisma.planejamentoOrcamentario.findMany({
		orderBy: { ano: 'desc' },
		select: { ano: true, valor_anual: true, alterado_em: true },
	});
	return Promise.all(
		planos.map(async (p) => ({
			ano: p.ano,
			valor_anual: Number(p.valor_anual),
			alterado_em: p.alterado_em,
			editavel: await podeEditarPlanejamento(p.ano, false),
		})),
	);
}

/** Histórico bruto dos 3 anos anteriores a `ano` (sem aplicar parâmetros de correção). */
export async function buscarHistoricoBase(
	ano: number,
): Promise<{ ano: number; total: number }[]> {
	const anosBase = [ano - 3, ano - 2, ano - 1];
	const historico = await Promise.all(anosBase.map((a) => arrecadacaoAnualPorMes(a)));
	return historico.map((h) => ({ ano: h.ano, total: h.total }));
}

export async function listarAnosComPlanejamento(): Promise<number[]> {
	const planos = await prisma.planejamentoOrcamentario.findMany({
		select: { ano: true },
		orderBy: { ano: 'desc' },
	});
	return planos.map((p) => p.ano);
}

/**
 * Divide `valorAnualBruto` em 12 parcelas iguais (o último mês absorve a diferença de
 * arredondamento) — mesmo padrão de `calculoParcelas` em `app/utils/funcoes-utilitarias.ts`.
 */
function distribuirIgualmente(valorAnualBruto: number): number[] {
	const porMes = Math.floor((valorAnualBruto / 12) * 100) / 100;
	const valores = Array(12).fill(porMes) as number[];
	const diferenca = Math.round((valorAnualBruto - valores.reduce((s, v) => s + v, 0)) * 100) / 100;
	valores[11] = Math.round((valores[11] + diferenca) * 100) / 100;
	return valores;
}

/**
 * Aplica os overrides informados sobre o histórico real, retornando o valor "efetivo"
 * de cada ano-base (override, se houver, senão a arrecadação real) junto com os dados
 * originais para exibição.
 */
function aplicarOverridesHistorico(
	historico: { ano: number; mensal: number[]; total: number }[],
	overrides: HistoricoOverrideInput[] | undefined,
): { ano: number; mensal: number[]; total: number; efetivo: number }[] {
	const overridesPorAno = new Map((overrides ?? []).map((o) => [o.ano, o.valor]));
	return historico.map((h) => {
		const override = overridesPorAno.get(h.ano);
		return { ...h, efetivo: override != null ? override : h.total };
	});
}

/**
 * Gera a sugestão de planejamento (não persiste): média dos 3 anos anteriores (ou dos
 * valores ajustados manualmente, se informados) × produto dos parâmetros de correção,
 * quebrada em 12 meses pela distribuição histórica (`MEDIA_HISTORICA`) ou em partes
 * iguais (`IGUAL`), conforme escolhido.
 */
export async function sugerirPlanejamento(
	ano: number,
	parametros: ParametroCorrecaoInput[],
	opts: { historicoOverrides?: HistoricoOverrideInput[]; distribuicao?: MetodoDistribuicao } = {},
): Promise<ISugestaoPlanejamento> {
	const distribuicao = opts.distribuicao ?? 'MEDIA_HISTORICA';
	const anosBase = [ano - 3, ano - 2, ano - 1];
	const historicoReal = await Promise.all(anosBase.map((a) => arrecadacaoAnualPorMes(a)));
	const historico = aplicarOverridesHistorico(historicoReal, opts.historicoOverrides);
	const comDado = historico.filter((h) => h.efetivo > 0);

	const mediaBase = comDado.length
		? comDado.reduce((s, h) => s + h.efetivo, 0) / comDado.length
		: 0;

	const fator = parametros.reduce((f, p) => f * (1 + p.percentual / 100), 1);
	const valorAnualBruto = mediaBase * fator;

	let valoresMensais: number[];
	if (distribuicao === 'IGUAL') {
		valoresMensais = distribuirIgualmente(valorAnualBruto);
	} else {
		// Média das proporções mês/total real de cada ano com dado, normalizada para somar 100%.
		// O override só reescala o total do ano — o formato mensal continua vindo do real.
		const proporcoes = Array(12).fill(0) as number[];
		const comDadoReal = historico.filter((h) => h.total > 0);
		if (comDadoReal.length) {
			for (const h of comDadoReal) {
				for (let m = 0; m < 12; m++) proporcoes[m] += h.mensal[m] / h.total;
			}
			for (let m = 0; m < 12; m++) proporcoes[m] /= comDadoReal.length;
		}
		const somaProporcoes = proporcoes.reduce((s, v) => s + v, 0);
		const proporcoesNormalizadas =
			somaProporcoes > 0 ? proporcoes.map((v) => v / somaProporcoes) : Array(12).fill(1 / 12);
		valoresMensais = proporcoesNormalizadas.map((p) => Math.round(valorAnualBruto * p * 100) / 100);
	}

	const meses: IPlanejamentoOrcamentarioMes[] = valoresMensais.map((valor, i) => ({
		mes: i + 1,
		valor,
		editado_manualmente: false,
	}));

	const parametrosResposta: IPlanejamentoParametroCorrecao[] = parametros.map((p, i) => ({
		nome: p.nome,
		percentual: p.percentual,
		ordem: i,
	}));

	return {
		ano,
		media_base_3_anos: Math.round(mediaBase * 100) / 100,
		// Total = soma dos meses já arredondados, para bater exatamente com o que será salvo.
		valor_anual: Math.round(meses.reduce((s, m) => s + m.valor, 0) * 100) / 100,
		metodo_distribuicao: distribuicao,
		parametros: parametrosResposta,
		meses,
		historico: historico.map((h) => {
			const override = (opts.historicoOverrides ?? []).find((o) => o.ano === h.ano);
			return { ano: h.ano, total: h.total, valor_ajustado: override?.valor ?? null };
		}),
	};
}

/**
 * Persiste o planejamento de um ano. `valor_anual` nunca é aceito como input direto —
 * é sempre recalculado como a soma dos 12 meses (mesma filosofia do golden rule #1 do
 * CLAUDE.md: total de contrapartida = soma das parcelas).
 *
 * Fora do prazo normal de edição, só um DEV pode salvar — e só informando `motivoRevisao`,
 * que dispara uma revisão: o estado anterior do plano é registrado em `PlanejamentoRevisao`
 * antes de aplicar as mudanças, formando um histórico auditável.
 */
export async function salvarPlanejamento(
	ano: number,
	parametros: ParametroCorrecaoInput[],
	meses: MesInput[],
	historicoOverrides: HistoricoOverrideInput[],
	distribuicao: MetodoDistribuicao,
	usuarioId: string,
	isDev: boolean,
	motivoRevisao?: string,
): Promise<IPlanejamentoOrcamentario> {
	const dentroPrazo = await dentroDoPrazoNormal(ano);
	if (!isDev && !dentroPrazo) {
		throw new Error('Prazo de edição deste planejamento já foi encerrado.');
	}
	const ehRevisao = isDev && !dentroPrazo;
	if (ehRevisao && (!motivoRevisao || !motivoRevisao.trim())) {
		throw new Error('Informe o motivo da revisão.');
	}

	const mesesUnicos = new Set(meses.map((m) => m.mes));
	if (meses.length !== 12 || mesesUnicos.size !== 12 || [...mesesUnicos].some((m) => m < 1 || m > 12)) {
		throw new Error('É preciso informar exatamente os 12 meses do ano (1 a 12).');
	}

	const anosBase = [ano - 3, ano - 2, ano - 1];
	const historicoReal = await Promise.all(anosBase.map((a) => arrecadacaoAnualPorMes(a)));
	const historico = aplicarOverridesHistorico(historicoReal, historicoOverrides);
	const comDado = historico.filter((h) => h.efetivo > 0);
	const mediaBase = comDado.length
		? comDado.reduce((s, h) => s + h.efetivo, 0) / comDado.length
		: 0;

	const valorAnual = meses.reduce((s, m) => s + m.valor, 0);

	await prisma.$transaction(async (tx) => {
		const anterior = ehRevisao
			? await tx.planejamentoOrcamentario.findUnique({
					where: { ano },
					include: { parametros: true, meses: true, historicoAno: true },
				})
			: null;

		const registro = await tx.planejamentoOrcamentario.upsert({
			where: { ano },
			create: {
				ano,
				media_base_3_anos: mediaBase,
				valor_anual: valorAnual,
				metodo_distribuicao: distribuicao,
				criado_por: usuarioId,
			},
			update: { media_base_3_anos: mediaBase, valor_anual: valorAnual, metodo_distribuicao: distribuicao },
		});

		if (anterior) {
			await tx.planejamentoRevisao.create({
				data: {
					planejamento_id: registro.id,
					motivo: motivoRevisao!.trim(),
					valor_anual_anterior: anterior.valor_anual,
					valor_anual_novo: valorAnual,
					snapshot_parametros_anterior: anterior.parametros.map((p) => ({
						nome: p.nome,
						percentual: Number(p.percentual),
						ordem: p.ordem,
					})),
					snapshot_meses_anterior: anterior.meses.map((m) => ({
						mes: m.mes,
						valor: Number(m.valor),
						editado_manualmente: m.editado_manualmente,
					})),
					snapshot_historico_anterior: anterior.historicoAno.map((h) => ({
						ano: h.ano,
						valor_real: Number(h.valor_real),
						valor_ajustado: h.valor_ajustado === null ? null : Number(h.valor_ajustado),
					})),
					revisado_por: usuarioId,
				},
			});
		}

		await tx.planejamentoParametroCorrecao.deleteMany({ where: { planejamento_id: registro.id } });
		if (parametros.length) {
			await tx.planejamentoParametroCorrecao.createMany({
				data: parametros.map((p, i) => ({
					planejamento_id: registro.id,
					nome: p.nome,
					percentual: p.percentual,
					ordem: i,
				})),
			});
		}

		for (const m of meses) {
			await tx.planejamentoOrcamentarioMes.upsert({
				where: { planejamento_id_mes: { planejamento_id: registro.id, mes: m.mes } },
				create: {
					planejamento_id: registro.id,
					mes: m.mes,
					valor: m.valor,
					editado_manualmente: m.editado_manualmente,
				},
				update: { valor: m.valor, editado_manualmente: m.editado_manualmente },
			});
		}

		for (const h of historico) {
			const override = historicoOverrides.find((o) => o.ano === h.ano);
			await tx.planejamentoHistoricoAno.upsert({
				where: { planejamento_id_ano: { planejamento_id: registro.id, ano: h.ano } },
				create: {
					planejamento_id: registro.id,
					ano: h.ano,
					valor_real: h.total,
					valor_ajustado: override?.valor ?? null,
				},
				update: { valor_real: h.total, valor_ajustado: override?.valor ?? null },
			});
		}
	});

	const completo = await buscarPlanejamento(ano);
	if (!completo) throw new Error('Falha ao salvar o planejamento.');
	return completo;
}

/** Histórico de revisões de um planejamento (mais recente primeiro), para auditoria. */
export async function buscarRevisoes(ano: number): Promise<IPlanejamentoRevisao[]> {
	const plano = await prisma.planejamentoOrcamentario.findUnique({ where: { ano }, select: { id: true } });
	if (!plano) return [];

	const revisoes = await prisma.planejamentoRevisao.findMany({
		where: { planejamento_id: plano.id },
		orderBy: { revisado_em: 'desc' },
		include: { usuario: { select: { nome: true } } },
	});

	return revisoes.map((r) => ({
		id: r.id,
		motivo: r.motivo,
		valor_anual_anterior: Number(r.valor_anual_anterior),
		valor_anual_novo: Number(r.valor_anual_novo),
		revisado_por_nome: r.usuario?.nome ?? null,
		revisado_em: r.revisado_em,
	}));
}

/** Compara o planejado (salvo) com o executado (arrecadação real) mês a mês, para um ano. */
export async function buscarComparativoPlanejadoExecutado(
	ano: number,
): Promise<IComparativoPlanejamentoExecutado | null> {
	const plano = await buscarPlanejamento(ano);
	if (!plano) return null;

	const executado = await arrecadacaoAnualPorMes(ano);

	const meses = plano.meses.map((m) => ({
		mes: m.mes,
		nome_mes: MESES_NOME[m.mes - 1],
		planejado: m.valor,
		executado: executado.mensal[m.mes - 1] ?? 0,
	}));

	const totalPlanejado = plano.valor_anual;
	const totalExecutado = executado.total;

	return {
		ano,
		meses,
		total_planejado: totalPlanejado,
		total_executado: totalExecutado,
		percentual_executado:
			totalPlanejado > 0 ? Math.round((totalExecutado / totalPlanejado) * 1000) / 10 : 0,
		saldo: totalPlanejado - totalExecutado,
	};
}

/**
 * GET /api/relatorios/excel?tipo=home|mes|subprefeituras|distritos|saude|zonas|tipologia
 * + mesmos query params de filtro (ano, mes, de, ate).
 * Para tipo=mes: também ?ano=YYYY&mes=M (1–12).
 *
 * @format
 */

import { auth } from '@/lib/auth/auth';
import { sessaoValida } from '@/lib/auth/session';
import { temIntervaloDatas, type FiltroArrecadacao } from '@/lib/parcelas-utils';
import { montarWorkbook, respostaExcel, type AbaExcel } from '@/lib/server/export-excel';
import { parseFiltroPeriodo } from '@/lib/server/periodo-relatorio';
import { buscarRelatorio } from '@/lib/server/relatorios';
import { buscarRelatorioMes } from '@/lib/server/relatorio-mes';
import { buscarSaudeArrecadacao } from '@/lib/server/relatorio-saude';
import { buscarOutorgaPorZona } from '@/lib/server/relatorio-zonas';
import { buscarRelatorioTipologiaUso } from '@/lib/server/relatorio-tipologia';
import { buscarArrecadacaoPorSubprefeitura } from '@/lib/server/relatorios-subprefeituras';
import { buscarArrecadacaoPorDistrito } from '@/lib/server/relatorios-distritos';

export const dynamic = 'force-dynamic';

function filtroHome(params: URLSearchParams): Parameters<typeof buscarRelatorio>[0] {
	const obj: Record<string, string | string[] | undefined> = {};
	params.forEach((v, k) => {
		obj[k] = v;
	});
	const filtro = parseFiltroPeriodo(obj, { anoPadrao: 'corrente', mesPadrao: 'omitir' });
	if (temIntervaloDatas(filtro)) {
		return { dataInicio: filtro.dataInicio, dataFim: filtro.dataFim };
	}
	if (params.get('ano') === 'todos') return { todosAnos: true };
	return { ano: filtro.ano };
}

function filtroPeriodo(params: URLSearchParams, opts?: { mesPadrao?: 'corrente' | 'omitir' | 'todos' }): FiltroArrecadacao {
	const obj: Record<string, string | string[] | undefined> = {};
	params.forEach((v, k) => {
		obj[k] = v;
	});
	return parseFiltroPeriodo(obj, {
		anoPadrao: 'corrente',
		mesPadrao: opts?.mesPadrao ?? 'omitir',
	});
}

export async function GET(req: Request) {
	const session = await auth();
	if (!sessaoValida(session)) {
		return new Response('Não autenticado', { status: 401 });
	}

	const url = new URL(req.url);
	const tipo = url.searchParams.get('tipo') ?? 'home';

	try {
		let abas: AbaExcel[] = [];
		let filename = `relatorio-${tipo}.xlsx`;

		switch (tipo) {
			case 'home': {
				const d = await buscarRelatorio(filtroHome(url.searchParams));
				abas = [
					{
						nome: 'KPIs',
						colunas: ['Métrica', 'Valor (R$ milhões)'],
						linhas: [
							['Arrecadado FUNDURB', d.fundurb.arrecadado],
							['Quebras', d.fundurb.quebras],
							['Antecipações', d.fundurb.antecipacoes],
							['Previsto restante', d.fundurb.prevRestante],
							['Processos', d.fundurb.processos],
							['Outorga', d.arrecadadoTipo.outorga],
							['Cota', d.arrecadadoTipo.cota],
							['AIU', d.arrecadadoTipo.aiu],
							['Multa', d.arrecadadoTipo.multa],
						],
					},
					{
						nome: 'Mensal',
						colunas: ['Mês', 'Previsto', 'Realizado', 'Quebras', 'Antecipações'],
						linhas: d.meses.map((m, i) => [
							m,
							d.d26.prev[i],
							d.d26.real[i],
							d.d26.quebras[i],
							d.d26.antec[i],
						]),
					},
					{
						nome: 'Top 10',
						colunas: [
							'Processo',
							'Interessado',
							'Tipo',
							'Uso',
							'Total',
							'Pago',
							'Status',
							'Subprefeitura',
							'Sistema',
						],
						linhas: d.top.ano.map((p) => [
							p.num,
							p.int,
							p.tipo,
							p.uso === 'R'
								? 'Residencial'
								: p.uso === 'nR'
									? 'Não Residencial'
									: p.uso === 'R/nR'
										? 'Uso Misto'
										: '',
							p.total,
							p.pago,
							p.status,
							p.sub,
							p.sistema,
						]),
					},
					{
						nome: 'Origem',
						colunas: ['Sistema', 'Processos', 'Arrecadado (R$)'],
						linhas: d.origemSistema.map((o) => [
							o.sistema,
							o.qtdProcessos,
							o.valorArrecadado,
						]),
					},
					{
						nome: 'Tipologia',
						colunas: [
							'Tipologia',
							'Processos',
							'Total',
							'Arrecadado',
							'Em aberto',
							'Quebra',
						],
						linhas: d.tipologiaUso.linhas.map((l) => [
							l.label,
							l.qtdProcessos,
							l.valorTotal,
							l.valorArrecadado,
							l.valorEmAberto,
							l.valorQuebra,
						]),
					},
					{
						nome: 'PDE Cota AIU',
						colunas: ['Tipo', 'Total', 'Pago', 'Processos', 'Andamento', 'Quitado', 'Quebra'],
						linhas: [
							['PDE', d.pde.total, d.pde.pago, d.pde.count, d.pde.andamento, d.pde.quitado, d.pde.quebra],
							['COTA', d.cota.total, d.cota.pago, d.cota.count, d.cota.andamento, d.cota.quitado, d.cota.quebra],
							['AIU', d.aiu.total, d.aiu.pago, d.aiu.count, d.aiu.andamento, d.aiu.quitado, d.aiu.quebra],
						],
					},
				];
				filename = `relatorio-arrecadacao-${d.anoAtual}.xlsx`;
				break;
			}
			case 'mes': {
				const ano = Number(url.searchParams.get('ano'));
				const mes = Number(url.searchParams.get('mes'));
				if (!ano || !mes || mes < 1 || mes > 12) {
					return new Response('Parâmetros ano/mes inválidos', { status: 400 });
				}
				const d = await buscarRelatorioMes(ano, mes);
				abas = [
					{
						nome: 'KPIs',
						colunas: ['Métrica', 'Valor'],
						linhas: [
							['Previsto', d.previsto],
							['Realizado', d.realizado],
							['Quebras', d.quebras],
							['Antecipações', d.antecipacoes],
						],
					},
					{
						nome: 'Semanas',
						colunas: ['Semana', 'Previsto', 'Realizado'],
						linhas: d.semanas.map((s) => [s.label, s.previsto, s.realizado]),
					},
					{
						nome: 'Processos',
						colunas: [
							'Processo',
							'Interessado',
							'Tipo',
							'Valor',
							'Status',
							'Vencimento',
							'Quitação',
							'Sistema',
							'Distrito',
							'Subprefeitura',
						],
						linhas: d.processos.map((p) => [
							p.num,
							p.interessado,
							p.tipo,
							p.valor,
							p.status,
							p.vencimento,
							p.quitacao,
							p.sistema,
							p.distrito,
							p.subprefeitura,
						]),
					},
					{
						nome: 'Subprefeituras',
						colunas: ['Nome', 'Valor (R$)', 'Processos'],
						linhas: d.subprefeituras.map((s) => [s.nome, s.valBrl, s.proc]),
					},
					{
						nome: 'Distritos',
						colunas: ['Nome', 'Valor (R$)', 'Processos'],
						linhas: d.distritos.map((s) => [s.nome, s.valBrl, s.proc]),
					},
				];
				filename = `relatorio-mes-${ano}-${String(mes).padStart(2, '0')}.xlsx`;
				break;
			}
			case 'subprefeituras': {
				const filtro = filtroPeriodo(url.searchParams, { mesPadrao: 'corrente' });
				const data = await buscarArrecadacaoPorSubprefeitura(filtro);
				abas = [
					{
						nome: 'Subprefeituras',
						colunas: ['Subprefeitura', 'Valor (R$)', 'Processos'],
						linhas: data.map((s) => [s.nome, s.valBrl, s.proc]),
					},
					{
						nome: 'Processos',
						colunas: ['Subprefeitura', 'Processo', 'Interessado', 'Valor (R$)'],
						linhas: data.flatMap((s) =>
							s.processos.map((p) => [s.nome, p.num, p.interessado, p.valBrl]),
						),
					},
				];
				filename = 'relatorio-subprefeituras.xlsx';
				break;
			}
			case 'distritos': {
				const filtro = filtroPeriodo(url.searchParams, { mesPadrao: 'corrente' });
				const data = await buscarArrecadacaoPorDistrito(filtro);
				abas = [
					{
						nome: 'Distritos',
						colunas: ['Distrito', 'Valor (R$)', 'Processos'],
						linhas: data.map((s) => [s.nome, s.valBrl, s.proc]),
					},
					{
						nome: 'Processos',
						colunas: ['Distrito', 'Processo', 'Interessado', 'Valor (R$)'],
						linhas: data.flatMap((s) =>
							s.processos.map((p) => [s.nome, p.num, p.interessado, p.valBrl]),
						),
					},
				];
				filename = 'relatorio-distritos.xlsx';
				break;
			}
			case 'saude': {
				const filtro = filtroPeriodo(url.searchParams);
				const intervalo = temIntervaloDatas(filtro)
					? { dataInicio: filtro.dataInicio, dataFim: filtro.dataFim }
					: undefined;
				const ano = intervalo ? undefined : filtro.ano;
				const d = await buscarSaudeArrecadacao(ano, intervalo);
				abas = [
					{
						nome: 'KPIs',
						colunas: ['Métrica', 'Valor'],
						linhas: [
							['Previsto', d.kpis.previsto],
							['Arrecadado', d.kpis.arrecadado],
							['Quebra', d.kpis.quebraValor],
							['Em aberto', d.kpis.emAbertoValor],
							['Vencido', d.kpis.vencidoValor],
							['Antecipado', d.kpis.antecipadoValor],
							['Taxa quebra %', d.kpis.taxaQuebra],
							['Taxa inadimplência %', d.kpis.taxaInadimplencia],
							['Taxa arrecadação %', d.kpis.taxaArrecadacao],
						],
					},
					{
						nome: 'Subprefeituras',
						colunas: [
							'Nome',
							'Previsto',
							'Arrecadado',
							'Em aberto',
							'Quebra',
							'Vencido',
							'Taxa quebra',
							'Taxa inadimplência',
							'Processos',
						],
						linhas: d.porSubprefeitura.map((s) => [
							s.nome,
							s.previsto,
							s.arrecadado,
							s.emAbertoValor,
							s.quebraValor,
							s.vencidoValor,
							s.taxaQuebra,
							s.taxaInadimplencia,
							s.proc,
						]),
					},
					{
						nome: 'Por tipo',
						colunas: ['Tipo', 'Previsto', 'Arrecadado', 'Quebra', 'Taxa quebra'],
						linhas: d.porTipo.map((t) => [
							t.tipo,
							t.previsto,
							t.arrecadado,
							t.quebraValor,
							t.taxaQuebra,
						]),
					},
				];
				filename = 'relatorio-saude-arrecadacao.xlsx';
				break;
			}
			case 'zonas': {
				const filtro = filtroPeriodo(url.searchParams);
				const intervalo = temIntervaloDatas(filtro)
					? { dataInicio: filtro.dataInicio, dataFim: filtro.dataFim }
					: undefined;
				const d = await buscarOutorgaPorZona(
					intervalo ? undefined : filtro.ano,
					intervalo ? undefined : filtro.mes,
					intervalo,
				);
				abas = [
					{
						nome: 'Zonas',
						colunas: [
							'Zona',
							'Outorga (R$)',
							'Outorga proc.',
							'Cota (R$)',
							'Cota proc.',
							'Total (R$)',
							'Total proc.',
						],
						linhas: d.linhas.map((l) => [
							l.zona,
							l.outorgaValor,
							l.outorgaProc,
							l.cotaValor,
							l.cotaProc,
							l.totalValor,
							l.totalProc,
						]),
					},
				];
				filename = 'relatorio-zonas-uso.xlsx';
				break;
			}
			case 'tipologia': {
				const filtro = filtroPeriodo(url.searchParams, { mesPadrao: 'omitir' });
				const d = await buscarRelatorioTipologiaUso(filtro);
				abas = [
					{
						nome: 'Tipologia',
						colunas: [
							'Tipologia',
							'Processos',
							'Total',
							'Arrecadado',
							'Em aberto',
							'Quebra',
						],
						linhas: d.linhas.map((l) => [
							l.label,
							l.qtdProcessos,
							l.valorTotal,
							l.valorArrecadado,
							l.valorEmAberto,
							l.valorQuebra,
						]),
					},
					{
						nome: 'Totais',
						colunas: ['Métrica', 'Valor'],
						linhas: [
							['Processos', d.totais.qtdProcessos],
							['Total', d.totais.valorTotal],
							['Arrecadado', d.totais.valorArrecadado],
							['Em aberto', d.totais.valorEmAberto],
							['Quebra', d.totais.valorQuebra],
						],
					},
				];
				filename = 'relatorio-tipologia-uso.xlsx';
				break;
			}
			default:
				return new Response('Tipo de relatório inválido', { status: 400 });
		}

		const buffer = await montarWorkbook(abas);
		return respostaExcel(buffer, filename);
	} catch (err) {
		console.error('[excel]', err);
		return new Response(
			err instanceof Error ? err.message : 'Erro ao gerar Excel',
			{ status: 500 },
		);
	}
}

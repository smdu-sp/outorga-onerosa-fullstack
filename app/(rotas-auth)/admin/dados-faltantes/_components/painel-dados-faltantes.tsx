'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import {
	aplicarCategoriasEncontradas,
	backfillBiGeosampa,
	listarConsultasDadosFaltantes,
	listarDadosFaltantes,
	pesquisarFiltradosNasApis,
} from '@/services/admin/dados-faltantes';
import type {
	ConsultaSalva,
	ProcessoDadoFaltante,
	ResultadoBackfillBiGeosampa,
	ResultadoPesquisaApi,
} from '@/lib/server/admin-dados-faltantes';
import {
	Loader2,
	RefreshCw,
	Search,
	CheckCheck,
	ExternalLink,
	Database,
	Download,
	Check,
	X,
	AlertTriangle,
} from 'lucide-react';
import { MENSAGEM_SEI_INVALIDO } from '@/lib/mascara-processo';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const MOTIVO_LABEL: Record<ProcessoDadoFaltante['motivo'], string> = {
	sem_ficha: 'Sem ficha de monitoramento',
	sem_enquadramento: 'Sem enquadramento urbanístico',
	sem_categoria: 'Sem categoria de uso (ou inválida)',
};

const TIPOLOGIA_LABEL: Record<string, string> = {
	R: 'Residencial',
	nR: 'Não Residencial',
	'R/nR': 'Uso Misto',
};

/** Tamanho dos lotes enviados ao servidor (o progresso avança a cada lote). */
const LOTE_PESQUISA = 20;
/** O servidor processa 3 por vez dentro do lote (só o SQL principal vai ao GeoSampa). */
const LOTE_BACKFILL = 6;

type Motivo = ProcessoDadoFaltante['motivo'];
type Situacao = 'pendente' | 'encontrado' | 'nao_encontrado' | 'erro';

const SITUACAO_LABEL: Record<Situacao, string> = {
	pendente: 'Não pesquisado',
	encontrado: 'Encontrado',
	nao_encontrado: 'Não encontrado',
	erro: 'Erro',
};

function situacaoDe(
	r: ResultadoPesquisaApi | undefined,
	b: ResultadoBackfillBiGeosampa | undefined,
	s?: ConsultaSalva,
): Situacao {
	// Sem resultado nesta sessão, vale a última consulta gravada no banco.
	if (!r && !b && s) {
		return s.status === 'ENCONTRADO'
			? 'encontrado'
			: s.status === 'ERRO'
				? 'erro'
				: 'nao_encontrado';
	}
	if (b) {
		if (b.status === 'atualizado') return 'encontrado';
		if (b.status === 'erro') return 'erro';
		if (!r?.tipologiaSugerida) return 'nao_encontrado';
	}
	if (r) {
		if (r.tipologiaSugerida) return 'encontrado';
		return r.erro ? 'erro' : 'nao_encontrado';
	}
	return 'pendente';
}

/** Processo localizado no BI? null = ainda não pesquisado (ou consulta ao BI falhou). */
function encontradoNoBi(
	r: ResultadoPesquisaApi | undefined,
	b: ResultadoBackfillBiGeosampa | undefined,
	s?: ConsultaSalva,
): boolean | null {
	if (r && r.encontradoBi !== null) return r.encontradoBi;
	if (!r && !b && s) return s.encontradoBi;
	// O backfill só confirma o BI quando gravou dados dele; fora isso é indeterminado.
	if (b?.fonte?.includes('bi')) return true;
	return null;
}

/** Campos que faltam em cada processo (derivado dos flags da listagem). */
function camposFaltantes(p: ProcessoDadoFaltante) {
	return [
		{ nome: 'Ficha', ok: p.temFicha },
		{ nome: 'Enquadramento', ok: p.temEnquadramento },
		{ nome: 'Categoria de uso', ok: p.motivo !== 'sem_categoria' && p.temEnquadramento },
	];
}

type Props = {
	inicial: ProcessoDadoFaltante[];
	consultasIniciais: ConsultaSalva[];
};

export function PainelDadosFaltantes({ inicial, consultasIniciais }: Props) {
	const [lista, setLista] = useState(inicial);
	const [salvas, setSalvas] = useState<Map<string, ConsultaSalva>>(
		() => new Map(consultasIniciais.map((c) => [c.processoId, c])),
	);

	/** Recarrega do banco as consultas gravadas (após pesquisa/backfill). */
	const recarregarSalvas = useCallback(async () => {
		const resp = await listarConsultasDadosFaltantes();
		if (resp.ok && resp.data) setSalvas(new Map(resp.data.map((c) => [c.processoId, c])));
	}, []);
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
	const [resultados, setResultados] = useState<Map<string, ResultadoPesquisaApi>>(new Map());
	const [backfill, setBackfill] = useState<Map<string, ResultadoBackfillBiGeosampa>>(new Map());
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<
		'idle' | 'listar' | 'pesquisar' | 'aplicar' | 'backfill'
	>('idle');

	const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

	const [filtroMotivo, setFiltroMotivo] = useState<Motivo | 'todos'>('todos');
	const [filtroSituacao, setFiltroSituacao] = useState<Situacao | 'todas'>('todas');
	const [busca, setBusca] = useState('');
	const [apenasSeiInvalido, setApenasSeiInvalido] = useState(false);

	const qtdSeiInvalido = useMemo(() => lista.filter((p) => p.seiInvalido).length, [lista]);

	const situacoes = useMemo(() => {
		const m = new Map<string, Situacao>();
		for (const p of lista) {
			m.set(p.id, situacaoDe(resultados.get(p.id), backfill.get(p.id), salvas.get(p.id)));
		}
		return m;
	}, [lista, resultados, backfill, salvas]);

	const contagemMotivo = useMemo(() => {
		const c: Record<Motivo, number> = { sem_ficha: 0, sem_enquadramento: 0, sem_categoria: 0 };
		for (const p of lista) c[p.motivo]++;
		return c;
	}, [lista]);

	const contagemSituacao = useMemo(() => {
		const c: Record<Situacao, number> = {
			pendente: 0,
			encontrado: 0,
			nao_encontrado: 0,
			erro: 0,
		};
		for (const s of situacoes.values()) c[s]++;
		return c;
	}, [situacoes]);

	const filtrada = useMemo(() => {
		const q = busca.trim().toLowerCase();
		return lista.filter((p) => {
			if (apenasSeiInvalido && !p.seiInvalido) return false;
			if (filtroMotivo !== 'todos' && p.motivo !== filtroMotivo) return false;
			if (filtroSituacao !== 'todas' && situacoes.get(p.id) !== filtroSituacao) return false;
			if (q && !`${p.num_processo} ${p.interessado ?? ''}`.toLowerCase().includes(q)) {
				return false;
			}
			return true;
		});
	}, [lista, filtroMotivo, filtroSituacao, busca, situacoes, apenasSeiInvalido]);

	const todosIds = useMemo(() => filtrada.map((p) => p.id), [filtrada]);
	const todosSelecionados =
		todosIds.length > 0 && todosIds.every((id) => selecionados.has(id));

	const toggleTodos = useCallback(() => {
		setSelecionados((prev) => {
			if (todosIds.length > 0 && todosIds.every((id) => prev.has(id))) return new Set();
			return new Set(todosIds);
		});
	}, [todosIds]);

	const exportarCsv = () => {
		const linhas = [
			[
				'Processo',
				'Interessado',
				'Tipo',
				'Origem',
				'Motivo',
				'Nº SEI válido',
				'Situação',
				'No BI',
				'Última consulta',
				'Tentativas',
				'Detalhe',
			],
			...filtrada.map((p) => [
				p.num_processo,
				p.interessado ?? '',
				p.tipo ?? '',
				p.origem ?? '',
				MOTIVO_LABEL[p.motivo],
				p.seiInvalido ? 'Não (dígito verificador)' : 'Sim',
				SITUACAO_LABEL[situacoes.get(p.id) ?? 'pendente'],
				(() => {
					const bi = encontradoNoBi(resultados.get(p.id), backfill.get(p.id), salvas.get(p.id));
					return bi === null ? '—' : bi ? 'Sim' : 'Não';
				})(),
				salvas.get(p.id)
					? new Date(salvas.get(p.id)!.consultadoEm).toLocaleString('pt-BR')
					: '',
				salvas.get(p.id)?.tentativas ?? '',
				salvas.get(p.id)?.detalhe ?? '',
			]),
		];
		const csv = linhas
			.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
			.join('\r\n');
		const url = URL.createObjectURL(
			new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
		);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'dados-faltantes.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	const toggleUm = useCallback((id: string) => {
		setSelecionados((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const recarregar = () => {
		startTransition(async () => {
			setEtapa('listar');
			const resp = await listarDadosFaltantes('categoria_uso');
			setEtapa('idle');
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Falha ao recarregar');
				return;
			}
			setLista(resp.data);
			setSelecionados(new Set());
			setResultados(new Map());
			setBackfill(new Map());
			toast.success(`${resp.data.length} processo(s) com categoria faltando`);
		});
	};

	const pesquisar = () => {
		const ids = selecionados.size > 0 ? [...selecionados] : todosIds;
		if (!ids.length) {
			toast.message('Nenhum processo na lista.');
			return;
		}
		startTransition(async () => {
			setEtapa('pesquisar');
			setProgresso({ feitos: 0, total: ids.length });
			const acumulado: ResultadoPesquisaApi[] = [];
			const anteriores = new Map(resultados);
			let falhou: string | null = null;
			for (let i = 0; i < ids.length; i += LOTE_PESQUISA) {
				const lote = ids.slice(i, i + LOTE_PESQUISA);
				let dadosLote: ResultadoPesquisaApi[];
				try {
					const resp = await pesquisarFiltradosNasApis(lote);
					if (!resp.ok || !resp.data) throw new Error(resp.error ?? 'Falha na pesquisa');
					dadosLote = resp.data;
				} catch (e) {
					falhou = e instanceof Error ? e.message : 'Falha na pesquisa';
					dadosLote = lote.map((id) => ({
						processoId: id,
						num_processo: lista.find((p) => p.id === id)?.num_processo ?? '?',
						tipologiaSugerida: null,
						fonte: null,
						encontradoBi: null,
						detalheBi: null,
						detalheGeosampa: null,
						erro: `Lote não processado: ${falhou}`,
						podeAplicar: false,
					}));
				}
				acumulado.push(...dadosLote);
				setResultados(
					new Map([...anteriores, ...acumulado.map((r) => [r.processoId, r] as const)]),
				);
				setProgresso({ feitos: Math.min(i + lote.length, ids.length), total: ids.length });
			}
			setEtapa('idle');
			setProgresso(null);
			if (falhou) toast.error(`${falhou} (${acumulado.length}/${ids.length} pesquisados)`);
			const achados = acumulado.filter((r) => r.tipologiaSugerida).length;
			if (acumulado.length) {
				toast.success(`APIs: ${achados}/${acumulado.length} com categoria encontrada`);
			await recarregarSalvas();
			}
		});
	};

	const aplicar = () => {
		const itens = [...resultados.values()]
			.filter((r) => r.podeAplicar && r.tipologiaSugerida)
			.map((r) => ({
				processoId: r.processoId,
				tipologia: r.tipologiaSugerida!,
			}));
		if (!itens.length) {
			toast.message('Nada aplicável (precisa de sugestão + enquadramento).');
			return;
		}
		startTransition(async () => {
			setEtapa('aplicar');
			const resp = await aplicarCategoriasEncontradas(itens);
			setEtapa('idle');
			if (!resp.ok) {
				toast.error(resp.error ?? 'Falha ao aplicar');
				return;
			}
			toast.success(
				`Aplicados: ${resp.aplicados}` +
					(resp.ignorados ? ` · Ignorados: ${resp.ignorados}` : ''),
			);
			const listaResp = await listarDadosFaltantes('categoria_uso');
			if (listaResp.ok && listaResp.data) {
				setLista(listaResp.data);
				setSelecionados(new Set());
				setResultados(new Map());
				setBackfill(new Map());
			}
		});
	};

	const executarBackfill = () => {
		const ids = selecionados.size > 0 ? [...selecionados] : todosIds;
		if (!ids.length) {
			toast.message('Nenhum processo na lista.');
			return;
		}
		startTransition(async () => {
			setEtapa('backfill');
			setProgresso({ feitos: 0, total: ids.length });
			const acumulado: ResultadoBackfillBiGeosampa[] = [];
			const anteriores = new Map(backfill);
			for (let i = 0; i < ids.length; i += LOTE_BACKFILL) {
				const lote = ids.slice(i, i + LOTE_BACKFILL);
				// Uma falha (timeout, rede, exceção no servidor) não interrompe o restante:
				// os processos do lote ficam marcados como erro e a fila segue.
				let dadosLote: ResultadoBackfillBiGeosampa[];
				try {
					const resp = await backfillBiGeosampa(lote);
					if (!resp.ok || !resp.data) throw new Error(resp.error ?? 'Falha no backfill');
					dadosLote = resp.data;
				} catch (e) {
					const msg = e instanceof Error ? e.message : 'Falha no backfill';
					dadosLote = lote.map((id) => ({
						processoId: id,
						num_processo: lista.find((p) => p.id === id)?.num_processo ?? '?',
						status: 'erro' as const,
						fonte: null,
						sql: null,
						tipologiaAplicada: null,
						detalhe: `Lote não processado: ${msg}`,
					}));
				}
				acumulado.push(...dadosLote);
				setBackfill(
					new Map([...anteriores, ...acumulado.map((r) => [r.processoId, r] as const)]),
				);
				setProgresso({ feitos: Math.min(i + lote.length, ids.length), total: ids.length });
			}
			setEtapa('idle');
			setProgresso(null);
			const dados = acumulado;
			const ok = dados.filter((r) => r.status === 'atualizado').length;
			const nao = dados.filter((r) => r.status === 'nao_encontrado').length;
			const err = dados.filter((r) => r.status === 'erro').length;
			toast.success(
				`Backfill: ${ok} atualizado(s)` +
					(nao ? ` · ${nao} sem dados` : '') +
					(err ? ` · ${err} erro(s)` : ''),
			);
			const listaResp = await listarDadosFaltantes('categoria_uso');
			if (listaResp.ok && listaResp.data) {
				setLista(listaResp.data);
				setSelecionados(new Set());
				setResultados(new Map());
			}
			await recarregarSalvas();
			// Leva o usuário direto aos que precisam de resolução manual.
			if (nao + err > 0) {
				setFiltroMotivo('todos');
				setFiltroSituacao('nao_encontrado');
				toast.message(
					`${nao + err} processo(s) não encontrados/com erro — filtrados abaixo para resolução manual.`,
				);
			}
		});
	};

	const labelBtn =
		etapa === 'pesquisar'
			? 'Consultando APIs…'
			: etapa === 'aplicar'
				? 'Aplicando…'
				: etapa === 'listar'
					? 'Atualizando…'
					: etapa === 'backfill'
						? 'Backfill BI + GeoSampa…'
						: null;

	return (
		<div className="flex flex-col gap-5">
			{/* Resumo / filtros */}
			<div className="grid gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
				<div className="flex flex-wrap items-center gap-2">
					<span className="w-24 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						O que falta
					</span>
					{(
						[
							['todos', 'Todos', lista.length],
							['sem_ficha', 'Sem ficha', contagemMotivo.sem_ficha],
							['sem_enquadramento', 'Sem enquadramento', contagemMotivo.sem_enquadramento],
							['sem_categoria', 'Sem categoria de uso', contagemMotivo.sem_categoria],
						] as const
					).map(([k, label, n]) => (
						<button
							key={k}
							type="button"
							onClick={() => {
								setFiltroMotivo(k);
								setSelecionados(new Set());
							}}
							className={`rounded-full border px-3 py-1 text-xs font-medium ${
								filtroMotivo === k
									? 'border-foreground bg-foreground text-background'
									: 'border-border hover:bg-muted'
							}`}>
							{label} <span className="tabular-nums opacity-70">({n})</span>
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="w-24 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Pesquisa
					</span>
					{(
						[
							['todas', 'Todas', lista.length],
							['pendente', SITUACAO_LABEL.pendente, contagemSituacao.pendente],
							['encontrado', SITUACAO_LABEL.encontrado, contagemSituacao.encontrado],
							['nao_encontrado', SITUACAO_LABEL.nao_encontrado, contagemSituacao.nao_encontrado],
							['erro', SITUACAO_LABEL.erro, contagemSituacao.erro],
						] as const
					).map(([k, label, n]) => (
						<button
							key={k}
							type="button"
							onClick={() => {
								setFiltroSituacao(k);
								setSelecionados(new Set());
							}}
							className={`rounded-full border px-3 py-1 text-xs font-medium ${
								filtroSituacao === k
									? 'border-foreground bg-foreground text-background'
									: 'border-border hover:bg-muted'
							}`}>
							{label} <span className="tabular-nums opacity-70">({n})</span>
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setApenasSeiInvalido((v) => !v);
							setSelecionados(new Set());
						}}
						title="Número SEI de 16 dígitos cujo dígito verificador não confere — provavelmente cadastrado errado"
						className={`rounded-full border px-3 py-1 text-xs font-medium ${
							apenasSeiInvalido
								? 'border-destructive bg-destructive text-white'
								: qtdSeiInvalido > 0
									? 'border-destructive/40 text-destructive hover:bg-destructive/10'
									: 'border-border hover:bg-muted'
						}`}>
						Nº SEI inválido <span className="tabular-nums opacity-70">({qtdSeiInvalido})</span>
					</button>
					<input
						type="search"
						value={busca}
						onChange={(e) => {
							setBusca(e.target.value);
							setSelecionados(new Set());
						}}
						placeholder="Buscar por processo ou interessado…"
						className="h-8 w-64 rounded-md border border-border bg-background px-2.5 text-xs"
					/>
					<button
						type="button"
						onClick={exportarCsv}
						disabled={filtrada.length === 0}
						className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
						<Download className="h-3.5 w-3.5" />
						Exportar CSV
					</button>
					<span className="ml-auto text-xs text-muted-foreground">
						{filtrada.length} de {lista.length} processo{lista.length === 1 ? '' : 's'}
						{selecionados.size > 0 ? ` · ${selecionados.size} selecionado(s)` : ''}
					</span>
				</div>
			</div>

			{/* Ações */}
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					disabled={pending || filtrada.length === 0}
					onClick={pesquisar}
					className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
					{etapa === 'pesquisar' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Search className="h-3.5 w-3.5" />
					)}
					{selecionados.size > 0
						? `Pesquisar selecionados nas APIs (${selecionados.size})`
						: `Pesquisar filtrados nas APIs (${filtrada.length})`}
				</button>

				<button
					type="button"
					disabled={pending || [...resultados.values()].every((r) => !r.podeAplicar)}
					onClick={aplicar}
					className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
					{etapa === 'aplicar' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<CheckCheck className="h-3.5 w-3.5" />
					)}
					Aplicar categorias encontradas
				</button>

				<button
					type="button"
					disabled={pending || filtrada.length === 0}
					onClick={executarBackfill}
					title="Consulta BI (SQL, categorias, licenças) e GeoSampa; grava ficha, SQL e tipologia"
					className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-100">
					{etapa === 'backfill' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Database className="h-3.5 w-3.5" />
					)}
					{selecionados.size > 0
						? `Backfill BI + GeoSampa (${selecionados.size})`
						: `Backfill BI + GeoSampa (${filtrada.length})`}
				</button>

				<button
					type="button"
					disabled={pending}
					onClick={recarregar}
					className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
					<RefreshCw className={`h-3.5 w-3.5 ${etapa === 'listar' ? 'animate-spin' : ''}`} />
					Atualizar lista
				</button>

				{labelBtn && (
					<span className="text-xs text-muted-foreground">{labelBtn}</span>
				)}
			</div>

			{progresso && (
				<div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3">
					<div className="flex items-center justify-between text-xs">
						<span className="font-medium">{labelBtn}</span>
						<span className="tabular-nums text-muted-foreground">
							{progresso.feitos}/{progresso.total} ·{' '}
							{Math.round((progresso.feitos / progresso.total) * 100)}%
						</span>
					</div>
					<Progress value={(progresso.feitos / progresso.total) * 100} />
				</div>
			)}

			<p className="text-xs text-muted-foreground">
				A pesquisa consulta só a categoria no BI (
				<code className="rounded bg-muted px-1">prata_categoria</code>) e, se necessário, o
				GeoSampa. O backfill grava todos os campos disponíveis (SQLs do BI → lote de cada
				um no GeoSampa, enquadramento, licenças, tipologia — BI preferido). Ambos
				processam todos os processos listados (ou selecionados), em lotes, com barra de
				andamento.
			</p>

			{backfill.size > 0 && (
				<div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
					Último backfill:{' '}
					<span className="text-foreground">
						{[...backfill.values()].filter((r) => r.status === 'atualizado').length}{' '}
						atualizado(s)
					</span>
					{' · '}
					{[...backfill.values()].filter((r) => r.status === 'nao_encontrado').length} sem
					dados
					{' · '}
					{[...backfill.values()].filter((r) => r.status === 'erro').length} erro(s).
					Processos com categoria preenchida saem da lista abaixo.
				</div>
			)}

			{/* Tabela */}
			<div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-primary text-left">
							<th className="w-10 whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">
								<input
									type="checkbox"
									checked={todosSelecionados}
									onChange={toggleTodos}
									aria-label="Selecionar todos"
								/>
							</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Processo</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Interessado</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">O que falta</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Atual</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">No BI</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">API / Backfill</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground" />
						</tr>
					</thead>
					<tbody>
						{filtrada.length === 0 ? (
							<tr>
								<td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
									{lista.length === 0
										? 'Nenhum processo sem categoria de uso canônica.'
										: 'Nenhum processo corresponde aos filtros.'}
								</td>
							</tr>
						) : (
							filtrada.map((p) => {
								const r = resultados.get(p.id);
								const b = backfill.get(p.id);
								const s = salvas.get(p.id);
								return (
									<tr key={p.id} className="border-t border-border align-top transition-colors hover:bg-primary-soft">
										<td className="px-3 py-2">
											<input
												type="checkbox"
												checked={selecionados.has(p.id)}
												onChange={() => toggleUm(p.id)}
												aria-label={`Selecionar ${p.num_processo}`}
											/>
										</td>
										<td className="px-3 py-2 font-mono text-xs">
											<div>{p.num_processo}</div>
											{p.seiInvalido && (
												<div
													title={MENSAGEM_SEI_INVALIDO}
													className="mt-0.5 inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 font-sans text-[10px] font-medium text-destructive">
													<AlertTriangle className="h-2.5 w-2.5" /> Nº SEI inválido
												</div>
											)}
											<div className="mt-0.5 text-[10px] text-muted-foreground">
												{p.tipo ?? '—'} · {p.status_pagamento}
												{p.origem ? ` · ${p.origem}` : ''}
											</div>
										</td>
										<td className="px-3 py-2 text-xs max-w-[180px] truncate">
											{p.interessado ?? '—'}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											<div className="flex flex-wrap gap-1">
												{camposFaltantes(p).map((c) => (
													<span
														key={c.nome}
														className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
															c.ok
																? 'bg-muted text-muted-foreground'
																: 'bg-destructive/10 font-medium text-destructive'
														}`}>
														{c.ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
														{c.nome}
													</span>
												))}
											</div>
										</td>
										<td className="px-3 py-2 font-mono text-xs">
											{p.tipologiaAtual ?? '—'}
										</td>
										<td className="px-3 py-2 text-xs">
											{(() => {
												const bi = encontradoNoBi(r, b, s);
												if (bi === null) {
													return <span className="text-muted-foreground/50">—</span>;
												}
												return bi ? (
													<span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
														<Check className="h-2.5 w-2.5" /> Encontrado
													</span>
												) : (
													<span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
														<X className="h-2.5 w-2.5" /> Não encontrado
													</span>
												);
											})()}
										</td>
										<td className="px-3 py-2 text-xs">
											{b ? (
												<div>
													<span
														className={
															b.status === 'atualizado'
																? 'font-semibold text-foreground'
																: b.status === 'erro'
																	? 'text-destructive'
																	: 'text-muted-foreground'
														}>
														{b.status === 'atualizado'
															? 'Backfill ok'
															: b.status === 'nao_encontrado'
																? 'Sem dados'
																: 'Erro'}
													</span>
													{b.fonte && (
														<span className="ml-1 text-[10px] uppercase text-muted-foreground">
															{b.fonte}
														</span>
													)}
													{b.tipologiaAplicada && (
														<div className="mt-0.5 text-[10px] text-muted-foreground">
															Tipologia:{' '}
															{TIPOLOGIA_LABEL[b.tipologiaAplicada] ??
																b.tipologiaAplicada}
														</div>
													)}
													{b.detalhe && (
														<div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
															{b.detalhe}
														</div>
													)}
												</div>
											) : r ? (
												r.tipologiaSugerida ? (
													<div>
														<span className="font-semibold text-foreground">
															{TIPOLOGIA_LABEL[r.tipologiaSugerida] ??
																r.tipologiaSugerida}
														</span>
														<span className="ml-1 text-[10px] uppercase text-muted-foreground">
															{r.fonte}
														</span>
														{r.detalheBi && (
															<div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
																BI: {r.detalheBi}
															</div>
														)}
														{r.detalheGeosampa && (
															<div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
																Geo: {r.detalheGeosampa}
															</div>
														)}
														{!r.podeAplicar && (
															<div className="mt-0.5 text-[10px] text-amber-600">
																Sem enquadramento — não aplica
															</div>
														)}
													</div>
												) : (
													<span className="text-muted-foreground">
														{r.erro ?? 'Não encontrado'}
													</span>
												)
											) : s ? (
												<div>
													<span
														className={
															s.status === 'ENCONTRADO'
																? 'font-semibold text-foreground'
																: s.status === 'ERRO'
																	? 'text-destructive'
																	: 'text-amber-600'
														}>
														{s.status === 'ENCONTRADO'
															? 'Encontrado'
															: s.status === 'ERRO'
																? 'Erro'
																: 'Não encontrado'}
													</span>
													<span className="ml-1 text-[10px] uppercase text-muted-foreground">
														{s.tipoConsulta === 'BACKFILL' ? 'backfill' : 'pesquisa'}
														{s.fonte ? ` · ${s.fonte}` : ''}
													</span>
													{s.tipologia && (
														<div className="mt-0.5 text-[10px] text-muted-foreground">
															Tipologia: {TIPOLOGIA_LABEL[s.tipologia] ?? s.tipologia}
														</div>
													)}
													{s.detalhe && (
														<div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
															{s.detalhe}
														</div>
													)}
													<div className="mt-0.5 text-[10px] text-muted-foreground/70">
														{new Date(s.consultadoEm).toLocaleString('pt-BR')} · {s.tentativas}{' '}
														tentativa{s.tentativas === 1 ? '' : 's'}
													</div>
												</div>
											) : (
												<span className="text-muted-foreground/50">—</span>
											)}
										</td>
										<td className="px-3 py-2">
											<Link
												href={`/processos/${p.id}`}
												className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
												target="_blank">
												Abrir
												<ExternalLink className="h-3 w-3" />
											</Link>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
			</div>
		</div>
	);
}

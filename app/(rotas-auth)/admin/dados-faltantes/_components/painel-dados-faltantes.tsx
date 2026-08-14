'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import {
	aplicarCategoriasEncontradas,
	backfillBiGeosampa,
	listarDadosFaltantes,
	pesquisarFiltradosNasApis,
} from '@/services/admin/dados-faltantes';
import type {
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
} from 'lucide-react';
import { toast } from 'sonner';

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

type Props = {
	inicial: ProcessoDadoFaltante[];
};

export function PainelDadosFaltantes({ inicial }: Props) {
	const [lista, setLista] = useState(inicial);
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
	const [resultados, setResultados] = useState<Map<string, ResultadoPesquisaApi>>(new Map());
	const [backfill, setBackfill] = useState<Map<string, ResultadoBackfillBiGeosampa>>(new Map());
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<
		'idle' | 'listar' | 'pesquisar' | 'aplicar' | 'backfill'
	>('idle');

	const todosIds = useMemo(() => lista.map((p) => p.id), [lista]);
	const todosSelecionados = selecionados.size > 0 && selecionados.size === lista.length;

	const toggleTodos = useCallback(() => {
		setSelecionados((prev) => {
			if (prev.size === lista.length) return new Set();
			return new Set(todosIds);
		});
	}, [lista.length, todosIds]);

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
			const resp = await pesquisarFiltradosNasApis(ids);
			setEtapa('idle');
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Falha na pesquisa');
				return;
			}
			const mapa = new Map(resp.data.map((r) => [r.processoId, r]));
			setResultados(mapa);
			const achados = resp.data.filter((r) => r.tipologiaSugerida).length;
			toast.success(`APIs: ${achados}/${resp.data.length} com categoria encontrada`);
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
		const lote = ids.slice(0, 50);
		if (ids.length > 50) {
			toast.message(`Backfill limitado a 50 por vez — processando os primeiros ${lote.length}.`);
		}
		startTransition(async () => {
			setEtapa('backfill');
			const resp = await backfillBiGeosampa(lote);
			setEtapa('idle');
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Falha no backfill');
				return;
			}
			const mapa = new Map(resp.data.map((r) => [r.processoId, r]));
			setBackfill(mapa);
			const ok = resp.data.filter((r) => r.status === 'atualizado').length;
			const nao = resp.data.filter((r) => r.status === 'nao_encontrado').length;
			const err = resp.data.filter((r) => r.status === 'erro').length;
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
			{/* Filtros */}
			<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
				<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					Campo faltante
				</span>
				<span className="rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background">
					Categoria de uso
				</span>
				<span className="ml-auto text-xs text-muted-foreground">
					{lista.length} processo{lista.length === 1 ? '' : 's'}
					{selecionados.size > 0 ? ` · ${selecionados.size} selecionado(s)` : ''}
				</span>
			</div>

			{/* Ações */}
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					disabled={pending || lista.length === 0}
					onClick={pesquisar}
					className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
					{etapa === 'pesquisar' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Search className="h-3.5 w-3.5" />
					)}
					{selecionados.size > 0
						? `Pesquisar selecionados nas APIs (${selecionados.size})`
						: `Pesquisar filtrados nas APIs (${lista.length})`}
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
					disabled={pending || lista.length === 0}
					onClick={executarBackfill}
					title="Consulta BI (SQL, categorias, licenças) e GeoSampa; grava ficha, SQL e tipologia"
					className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-100">
					{etapa === 'backfill' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Database className="h-3.5 w-3.5" />
					)}
					{selecionados.size > 0
						? `Backfill BI + GeoSampa (${Math.min(selecionados.size, 50)})`
						: `Backfill BI + GeoSampa (${Math.min(lista.length, 50)})`}
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

			<p className="text-xs text-muted-foreground">
				A pesquisa consulta só a categoria no BI (
				<code className="rounded bg-muted px-1">prata_categoria</code>) e, se necessário, o
				GeoSampa. O backfill grava todos os campos disponíveis (SQLs do BI → lote de cada
				um no GeoSampa, enquadramento, licenças, tipologia — BI preferido). Máx. 50 no
				backfill / 100 na pesquisa.
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
			<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
							<th className="px-3 py-2.5 w-10">
								<input
									type="checkbox"
									checked={todosSelecionados}
									onChange={toggleTodos}
									aria-label="Selecionar todos"
								/>
							</th>
							<th className="px-3 py-2.5 font-semibold">Processo</th>
							<th className="px-3 py-2.5 font-semibold">Interessado</th>
							<th className="px-3 py-2.5 font-semibold">Motivo</th>
							<th className="px-3 py-2.5 font-semibold">Atual</th>
							<th className="px-3 py-2.5 font-semibold">API / Backfill</th>
							<th className="px-3 py-2.5 font-semibold" />
						</tr>
					</thead>
					<tbody>
						{lista.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
									Nenhum processo sem categoria de uso canônica.
								</td>
							</tr>
						) : (
							lista.map((p) => {
								const r = resultados.get(p.id);
								const b = backfill.get(p.id);
								return (
									<tr key={p.id} className="border-b border-border/60 align-top">
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
											<div className="mt-0.5 text-[10px] text-muted-foreground">
												{p.tipo ?? '—'} · {p.status_pagamento}
												{p.origem ? ` · ${p.origem}` : ''}
											</div>
										</td>
										<td className="px-3 py-2 text-xs max-w-[180px] truncate">
											{p.interessado ?? '—'}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											{MOTIVO_LABEL[p.motivo]}
										</td>
										<td className="px-3 py-2 font-mono text-xs">
											{p.tipologiaAtual ?? '—'}
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
	);
}

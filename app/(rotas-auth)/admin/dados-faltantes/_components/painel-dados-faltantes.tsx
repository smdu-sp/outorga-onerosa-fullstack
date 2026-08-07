'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import {
	aplicarCategoriasEncontradas,
	listarDadosFaltantes,
	pesquisarFiltradosNasApis,
} from '@/services/admin/dados-faltantes';
import type {
	ProcessoDadoFaltante,
	ResultadoPesquisaApi,
} from '@/lib/server/admin-dados-faltantes';
import { Loader2, RefreshCw, Search, CheckCheck, ExternalLink } from 'lucide-react';
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
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<'idle' | 'listar' | 'pesquisar' | 'aplicar'>('idle');

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
				A pesquisa consulta o BI (<code className="rounded bg-muted px-1">prata_categoria</code>)
				e, se necessário, o GeoSampa. Só aplica em processos que já têm enquadramento urbanístico.
				Máx. 100 por vez.
			</p>

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
							<th className="px-3 py-2.5 font-semibold">API</th>
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
											{r ? (
												r.tipologiaSugerida ? (
													<div>
														<span className="font-semibold text-foreground">
															{TIPOLOGIA_LABEL[r.tipologiaSugerida] ?? r.tipologiaSugerida}
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

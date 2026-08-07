'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import {
	aplicarCategoriasEncontradas,
	compararSeiVsBi,
	listarSeiComProtocoloAd,
} from '@/services/admin/dados-faltantes';
import type {
	ProcessoSeiComProtocoloAd,
	ResultadoComparacaoSeiBi,
	StatusComparacaoSeiBi,
} from '@/lib/server/admin-dados-faltantes';
import { Loader2, RefreshCw, Search, CheckCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const TIPOLOGIA_LABEL: Record<string, string> = {
	R: 'Residencial',
	nR: 'Não Residencial',
	'R/nR': 'Uso Misto',
};

const STATUS_LABEL: Record<StatusComparacaoSeiBi, string> = {
	igual: 'Igual',
	divergente: 'Divergente',
	sem_bi: 'Sem BI',
	sem_local: 'Sem local',
	erro: 'Erro',
};

const STATUS_CLS: Record<StatusComparacaoSeiBi, string> = {
	igual: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
	divergente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
	sem_bi: 'bg-muted text-muted-foreground',
	sem_local: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
	erro: 'bg-destructive/15 text-destructive',
};

type FiltroStatus = 'todos' | StatusComparacaoSeiBi;

type Props = {
	inicial: ProcessoSeiComProtocoloAd[];
};

export function PainelSeiVsBi({ inicial }: Props) {
	const [lista, setLista] = useState(inicial);
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
	const [resultados, setResultados] = useState<Map<string, ResultadoComparacaoSeiBi>>(
		new Map(),
	);
	const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<'idle' | 'listar' | 'comparar' | 'aplicar'>('idle');

	const todosIds = useMemo(() => lista.map((p) => p.id), [lista]);

	const visiveis = useMemo(() => {
		if (filtroStatus === 'todos') return lista;
		return lista.filter((p) => {
			const r = resultados.get(p.id);
			if (!r) return filtroStatus === 'todos';
			return r.status === filtroStatus;
		});
	}, [lista, resultados, filtroStatus]);

	const todosSelecionados =
		visiveis.length > 0 && visiveis.every((p) => selecionados.has(p.id));

	const contagemStatus = useMemo(() => {
		const c: Record<StatusComparacaoSeiBi | 'sem_resultado', number> = {
			igual: 0,
			divergente: 0,
			sem_bi: 0,
			sem_local: 0,
			erro: 0,
			sem_resultado: 0,
		};
		for (const p of lista) {
			const r = resultados.get(p.id);
			if (!r) c.sem_resultado++;
			else c[r.status]++;
		}
		return c;
	}, [lista, resultados]);

	const toggleTodos = useCallback(() => {
		setSelecionados((prev) => {
			if (visiveis.every((p) => prev.has(p.id))) {
				const next = new Set(prev);
				for (const p of visiveis) next.delete(p.id);
				return next;
			}
			const next = new Set(prev);
			for (const p of visiveis) next.add(p.id);
			return next;
		});
	}, [visiveis]);

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
			const resp = await listarSeiComProtocoloAd();
			setEtapa('idle');
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Falha ao recarregar');
				return;
			}
			setLista(resp.data);
			setSelecionados(new Set());
			setResultados(new Map());
			setFiltroStatus('todos');
			toast.success(`${resp.data.length} processo(s) com protocolo AD`);
		});
	};

	const comparar = () => {
		const ids = selecionados.size > 0 ? [...selecionados] : todosIds;
		if (!ids.length) {
			toast.message('Nenhum processo na lista.');
			return;
		}
		startTransition(async () => {
			setEtapa('comparar');
			const resp = await compararSeiVsBi(ids);
			setEtapa('idle');
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Falha na comparação');
				return;
			}
			setResultados((prev) => {
				const mapa = new Map(prev);
				for (const r of resp.data!) mapa.set(r.processoId, r);
				return mapa;
			});
			const div = resp.data.filter((r) => r.status === 'divergente').length;
			toast.success(
				`Comparados ${resp.data.length}: ${div} divergente(s)`,
			);
		});
	};

	const aplicar = () => {
		const itens = [...resultados.values()]
			.filter((r) => r.podeAplicar && r.tipologiaBi)
			.map((r) => ({
				processoId: r.processoId,
				tipologia: r.tipologiaBi!,
			}));
		if (!itens.length) {
			toast.message('Nada aplicável (precisa divergência/sem local + BI + enquadramento).');
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
			const listaResp = await listarSeiComProtocoloAd();
			if (listaResp.ok && listaResp.data) {
				setLista(listaResp.data);
				setSelecionados(new Set());
				setResultados(new Map());
				setFiltroStatus('todos');
			}
		});
	};

	const labelBtn =
		etapa === 'comparar'
			? 'Consultando BI…'
			: etapa === 'aplicar'
				? 'Aplicando…'
				: etapa === 'listar'
					? 'Atualizando…'
					: null;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
				<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					Cruzamento
				</span>
			<span className="rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background">
				Protocolo AD × BI
			</span>
				<span className="ml-auto text-xs text-muted-foreground">
					{lista.length} processo{lista.length === 1 ? '' : 's'}
					{selecionados.size > 0 ? ` · ${selecionados.size} selecionado(s)` : ''}
					{resultados.size > 0
						? ` · ${contagemStatus.divergente} divergente(s)`
						: ''}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					disabled={pending || lista.length === 0}
					onClick={comparar}
					className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
					{etapa === 'comparar' ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Search className="h-3.5 w-3.5" />
					)}
					{selecionados.size > 0
						? `Comparar selecionados no BI (${selecionados.size})`
						: `Comparar todos no BI (${lista.length})`}
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
					Aplicar tipologia do BI
				</button>

				<button
					type="button"
					disabled={pending}
					onClick={recarregar}
					className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
					<RefreshCw className={`h-3.5 w-3.5 ${etapa === 'listar' ? 'animate-spin' : ''}`} />
					Atualizar lista
				</button>

				{labelBtn && <span className="text-xs text-muted-foreground">{labelBtn}</span>}
			</div>

			{resultados.size > 0 && (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Status
					</span>
					{(
						[
							['todos', 'Todos'],
							['divergente', `Divergente (${contagemStatus.divergente})`],
							['sem_local', `Sem local (${contagemStatus.sem_local})`],
							['sem_bi', `Sem BI (${contagemStatus.sem_bi})`],
							['igual', `Igual (${contagemStatus.igual})`],
							['erro', `Erro (${contagemStatus.erro})`],
						] as const
					).map(([f, label]) => (
						<button
							key={f}
							type="button"
							onClick={() => setFiltroStatus(f)}
							className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
								filtroStatus === f
									? 'bg-foreground text-background'
									: 'bg-muted text-muted-foreground hover:bg-accent'
							}`}>
							{label}
						</button>
					))}
				</div>
			)}

			<p className="text-xs text-muted-foreground">
				Cruzamento pela coluna <code className="rounded bg-muted px-1">protocolo</code> do BI.
				Normaliza variantes da planilha (<code className="rounded bg-muted px-1">#33287-23</code>,{' '}
				<code className="rounded bg-muted px-1">33287-23-SP-ALV</code>,{' '}
				<code className="rounded bg-muted px-1">AD: …</code>) pelo núcleo número-ano. Máx. 100 por vez.
			</p>

			<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
							<th className="w-10 px-3 py-2.5">
								<input
									type="checkbox"
									checked={todosSelecionados}
									onChange={toggleTodos}
									aria-label="Selecionar todos"
								/>
							</th>
							<th className="px-3 py-2.5 font-semibold">SEI</th>
							<th className="px-3 py-2.5 font-semibold">Protocolo AD</th>
							<th className="px-3 py-2.5 font-semibold">Local</th>
							<th className="px-3 py-2.5 font-semibold">BI</th>
							<th className="px-3 py-2.5 font-semibold">Status</th>
							<th className="px-3 py-2.5 font-semibold" />
						</tr>
					</thead>
					<tbody>
						{visiveis.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
									{lista.length === 0
										? 'Nenhum processo com protocolo AD.'
										: 'Nenhum processo neste filtro.'}
								</td>
							</tr>
						) : (
							visiveis.map((p) => {
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
											<div className="mt-0.5 max-w-[160px] truncate text-[10px] text-muted-foreground">
												{p.interessado ?? '—'} · {p.tipo ?? '—'}
												{p.origem ? ` · ${p.origem}` : ''}
											</div>
										</td>
										<td className="px-3 py-2 font-mono text-xs">
											<div>{p.protocolo_ad}</div>
											{p.protocoloNucleo &&
												p.protocoloNucleo !== p.protocolo_ad.replace(/^#+/, '') && (
													<div className="mt-0.5 text-[10px] text-muted-foreground">
														núcleo {p.protocoloNucleo}
													</div>
												)}
										</td>
										<td className="px-3 py-2 text-xs">
											{(r?.tipologiaLocal ?? p.tipologiaLocal) ? (
												<span className="font-semibold">
													{TIPOLOGIA_LABEL[r?.tipologiaLocal ?? p.tipologiaLocal!] ??
														(r?.tipologiaLocal ?? p.tipologiaLocal)}
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
											{p.tipologiaLocalRaw &&
												p.tipologiaLocalRaw !== (r?.tipologiaLocal ?? p.tipologiaLocal) && (
													<div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
														{p.tipologiaLocalRaw}
													</div>
												)}
										</td>
										<td className="px-3 py-2 text-xs">
											{r ? (
												r.tipologiaBi ? (
													<div>
														<span className="font-semibold">
															{TIPOLOGIA_LABEL[r.tipologiaBi] ?? r.tipologiaBi}
														</span>
														{r.detalheBi && (
															<div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
																{r.detalheBi}
															</div>
														)}
														{!r.podeAplicar &&
															r.status !== 'igual' &&
															!p.temEnquadramento && (
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
											{r ? (
												<span
													className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLS[r.status]}`}>
													{STATUS_LABEL[r.status]}
												</span>
											) : (
												<span className="text-[10px] text-muted-foreground/50">
													Não comparado
												</span>
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

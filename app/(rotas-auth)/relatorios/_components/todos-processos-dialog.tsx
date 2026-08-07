'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
} from '@/components/ui/pagination';
import type { FiltroPeriodoRanking } from '@/lib/server/relatorios';
import { rankingProcessos } from '@/services/relatorios';
import { IRelatorioTop10 } from '@/types/relatorio';
import { ChevronDown, ChevronLeft, ChevronRight, List } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState, useTransition } from 'react';

const MESES = [
	'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
	'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const ORIGEM_LABEL: Record<string, string> = {
	SISACOE: 'SISACOE',
	SEI: 'SEI',
	APROVA_DIGITAL: 'Aprova Digital',
	PORTAL: 'Portal',
	SLCE: 'SLCe',
	OUTRO: 'Outro',
};

const fmtOrigem = (v: string | null) => (v ? (ORIGEM_LABEL[v] ?? v) : '—');

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
const fmtPct = (v: number) => v.toFixed(0) + '%';

const STATUS_LABEL: Record<string, string> = {
	quitado: 'Quitado',
	andamento: 'Em andamento',
	quebra: 'Quebra',
};

const STATUS_CLS: Record<string, string> = {
	quitado: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
	andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
	quebra: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const TIPO_CLS: Record<string, string> = {
	PDE: 'bg-primary/10 text-primary',
	COTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const USO_LABEL: Record<string, string> = {
	R: 'Residencial',
	nR: 'Não Residencial',
	'R/nR': 'Uso Misto',
};

const USO_CLS: Record<string, string> = {
	R: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
	nR: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
	'R/nR': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
};

const PAGE_SIZE = 20;

type FiltroStatus = 'todos' | 'andamento' | 'quitado' | 'quebra';
type FiltroUso = 'todos' | 'R' | 'nR' | 'R/nR' | 'sem';

interface TodosProcessosDialogProps {
	anosDisponiveis: number[];
	anoInicial?: number;
	mesInicial?: number;
	filtroTipo?: string;
	filtroStatus?: string;
	filtroSub?: string;
}

function filtroInicial(anoInicial?: number, mesInicial?: number): FiltroPeriodoRanking {
	const hoje = new Date();
	return {
		ano: anoInicial ?? hoje.getFullYear(),
		mes: mesInicial != null && mesInicial >= 0 ? mesInicial : hoje.getMonth(),
	};
}

export function TodosProcessosDialog({
	anosDisponiveis,
	anoInicial,
	mesInicial,
	filtroTipo = 'todos',
	filtroStatus = 'todos',
	filtroSub = 'todas',
}: TodosProcessosDialogProps) {
	const [open, setOpen] = useState(false);
	const [filtro, setFiltro] = useState<FiltroPeriodoRanking>(() =>
		filtroInicial(anoInicial, mesInicial),
	);
	const [lista, setLista] = useState<IRelatorioTop10[]>([]);
	const [erro, setErro] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [pagina, setPagina] = useState(1);
	const [statusLocal, setStatusLocal] = useState<FiltroStatus>('todos');
	const [filtroUso, setFiltroUso] = useState<FiltroUso>('todos');
	const [expandido, setExpandido] = useState<Set<string>>(new Set());

	const carregar = useCallback(
		(f: FiltroPeriodoRanking) => {
			startTransition(async () => {
				const resp = await rankingProcessos(f);
				if (!resp.ok || !resp.data) {
					setErro(resp.error ?? 'Erro ao carregar processos');
					setLista([]);
					return;
				}
				setErro(null);
				setLista(resp.data);
				setPagina(1);
			});
		},
		[],
	);

	useEffect(() => {
		if (!open) return;
		carregar(filtro);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- só recarrega ao abrir
	}, [open]);

	const anoVal = filtro.ano != null ? String(filtro.ano) : 'todos';
	const mesVal = filtro.mes != null ? String(filtro.mes) : 'todos';
	const temFiltro = filtro.ano != null || filtro.mes != null;

	function aplicar(ano: string, mes: string) {
		const next: FiltroPeriodoRanking = {};
		if (ano !== 'todos') next.ano = Number(ano);
		if (mes !== 'todos') next.mes = Number(mes);
		setFiltro(next);
		carregar(next);
	}

	function update(key: 'ano' | 'mes', value: string) {
		const ano = key === 'ano' ? value : anoVal;
		const mes = key === 'mes' ? value : mesVal;
		aplicar(ano, mes);
	}

	function toggleExpandido(id: string) {
		setExpandido((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const filtrados = lista
		.filter((p) => filtroTipo === 'todos' || p.tipo === filtroTipo)
		.filter((p) => filtroStatus === 'todos' || p.status === filtroStatus)
		.filter((p) => filtroSub === 'todas' || p.sub === filtroSub)
		.filter((p) => statusLocal === 'todos' || p.status === statusLocal)
		.filter((p) => {
			if (filtroUso === 'todos') return true;
			if (filtroUso === 'sem') return p.uso == null;
			return p.uso === filtroUso;
		});

	const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
	const paginaAtual = Math.min(pagina, totalPaginas);
	const inicio = (paginaAtual - 1) * PAGE_SIZE;
	const visiveis = filtrados.slice(inicio, inicio + PAGE_SIZE);

	const selectCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50';
	const labelCls =
		'text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground';
	const sepCls = 'mx-1 h-4 w-px bg-border shrink-0';

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
					<List className="h-3.5 w-3.5" />
					Ver todos
				</button>
			</DialogTrigger>

			<DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
				<DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
					<DialogTitle>Todos os processos</DialogTitle>
					<DialogDescription>
						Ranking por valor total das parcelas com vencimento no período selecionado.
					</DialogDescription>
				</DialogHeader>

				<div className="shrink-0 border-b border-border px-5 py-3">
					<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
						<span className={labelCls}>Ano</span>
						<select
							className={selectCls}
							value={anoVal}
							disabled={pending}
							onChange={(e) => update('ano', e.target.value)}>
							<option value="todos">Todos</option>
							{anosDisponiveis.map((y) => (
								<option key={y} value={String(y)}>
									{y}
								</option>
							))}
						</select>

						<div className={sepCls} />

						<span className={labelCls}>Mês</span>
						<select
							className={selectCls}
							value={mesVal}
							disabled={pending}
							onChange={(e) => update('mes', e.target.value)}>
							<option value="todos">Todos</option>
							{MESES.map((nome, i) => (
								<option key={nome} value={String(i)}>
									{nome}
								</option>
							))}
						</select>

						{temFiltro && (
							<button
								type="button"
								onClick={() => aplicar('todos', 'todos')}
								disabled={pending}
								className="ml-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
								Limpar filtros
							</button>
						)}

						<div className={sepCls} />

						<span className="text-xs text-muted-foreground">
							{pending
								? 'Atualizando…'
								: `${filtrados.length} processo${filtrados.length === 1 ? '' : 's'}`}
						</span>
					</div>

					<div className="mt-3 flex flex-wrap gap-1.5">
						{(['todos', 'andamento', 'quitado', 'quebra'] as FiltroStatus[]).map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => {
									setStatusLocal(f);
									setPagina(1);
								}}
								className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
									statusLocal === f
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground hover:bg-accent'
								}`}>
								{f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
							</button>
						))}
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-1.5">
						<span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							Uso
						</span>
						{(
							[
								['todos', 'Todos'],
								['R', 'Residencial'],
								['nR', 'Não Residencial'],
								['R/nR', 'Uso Misto'],
								['sem', 'Sem uso'],
							] as const
						).map(([f, label]) => (
							<button
								key={f}
								type="button"
								onClick={() => {
									setFiltroUso(f);
									setPagina(1);
								}}
								className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
									filtroUso === f
										? f === 'todos' || f === 'sem'
											? 'bg-foreground text-background'
											: USO_CLS[f]
										: 'bg-muted text-muted-foreground hover:bg-accent'
								} ${filtroUso === f && f !== 'todos' && f !== 'sem' ? 'ring-1 ring-current/30' : ''}`}>
								{label}
							</button>
						))}
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-auto px-5 py-3">
					{erro && (
						<div className="py-8 text-center text-sm text-destructive">{erro}</div>
					)}
					{!erro && (
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-border text-left">
									<th className="w-6 pb-2 pr-1" aria-label="Detalhes"></th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">#</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Processo</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Interessado</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Tipo</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Uso</th>
									<th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Total</th>
									<th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Pago</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Progresso</th>
									<th className="pb-2 pr-3 font-semibold text-muted-foreground">Status</th>
									<th className="pb-2 font-semibold text-muted-foreground">Subpref.</th>
								</tr>
							</thead>
							<tbody>
								{!pending && visiveis.length === 0 && (
									<tr>
										<td colSpan={11} className="py-8 text-center text-muted-foreground">
											Nenhum processo encontrado.
										</td>
									</tr>
								)}
								{visiveis.map((p, i) => {
									const pct =
										p.status === 'quebra'
											? 0
											: p.total > 0
												? (p.pago / p.total) * 100
												: 0;
									const barColor =
										p.status === 'quebra'
											? '#f59e0b'
											: pct >= 100
												? '#16a34a'
												: '#3b82f6';
									const aberto = expandido.has(p.id);
									const rank = inicio + i + 1;
									return (
										<Fragment key={p.id}>
											<tr
												onClick={() => toggleExpandido(p.id)}
												className="cursor-pointer border-b border-border/50 hover:bg-muted/30">
												<td className="py-2.5 pr-1 text-center">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															toggleExpandido(p.id);
														}}
														aria-expanded={aberto}
														aria-label={aberto ? 'Ocultar detalhes' : 'Ver origem da outorga'}
														className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
														<ChevronDown
															className={`h-3.5 w-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`}
														/>
													</button>
												</td>
												<td className="py-2.5 pr-3">
													<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold">
														{rank}
													</span>
												</td>
												<td className="py-2.5 pr-3" onClick={(e) => e.stopPropagation()}>
													<Link
														href={`/processos/${p.id}`}
														className="font-mono text-[11px] text-primary underline-offset-2 hover:underline">
														{p.num}
													</Link>
												</td>
												<td
													className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap py-2.5 pr-3"
													title={p.int}>
													{p.int}
												</td>
												<td className="py-2.5 pr-3">
													<span
														className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TIPO_CLS[p.tipo] ?? 'bg-muted text-muted-foreground'}`}>
														{p.tipo}
													</span>
												</td>
												<td className="py-2.5 pr-3">
													{p.uso ? (
														<span
															className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${USO_CLS[p.uso] ?? 'bg-muted text-muted-foreground'}`}>
															{USO_LABEL[p.uso] ?? p.uso}
														</span>
													) : (
														<span className="text-[10px] text-muted-foreground">—</span>
													)}
												</td>
												<td className="py-2.5 pr-3 text-right font-mono font-semibold">
													{fmtM(p.total)}
												</td>
												<td
													className="py-2.5 pr-3 text-right font-mono"
													style={{ color: p.status === 'quebra' ? '#dc2626' : undefined }}>
													{p.status === 'quebra' ? '—' : fmtM(p.pago)}
												</td>
												<td className="py-2.5 pr-3">
													<div className="flex items-center gap-1.5">
														<div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
															<div
																style={{
																	height: '100%',
																	width: `${pct}%`,
																	background: barColor,
																	borderRadius: 9999,
																}}
															/>
														</div>
														<span className="text-[10px] text-muted-foreground">
															{fmtPct(pct)}
														</span>
													</div>
												</td>
												<td className="py-2.5 pr-3">
													<span
														className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLS[p.status] ?? 'bg-muted text-muted-foreground'}`}>
														{STATUS_LABEL[p.status]}
													</span>
												</td>
												<td className="py-2.5 text-[11px] text-muted-foreground">{p.sub}</td>
											</tr>
											{aberto && (
												<tr className="border-b border-border/50 bg-muted/20">
													<td></td>
													<td colSpan={10} className="px-1 pb-3 pt-1">
														<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
															De onde vem a outorga
														</div>
														<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
															<DetalheItem rotulo="Sistema" valor={fmtOrigem(p.sistema)} />
															<DetalheItem
																rotulo="Empreendimento"
																valor={p.empreendimento ?? '—'}
															/>
															<DetalheItem rotulo="Distrito" valor={p.distrito ?? '—'} />
															<DetalheItem rotulo="Subprefeitura" valor={p.sub || '—'} />
														</div>
													</td>
												</tr>
											)}
										</Fragment>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{filtrados.length > 0 && (
					<div className="shrink-0 border-t border-border px-5 py-3">
						<Pagination className="mx-0 w-auto justify-between">
							<span className="text-xs text-muted-foreground">
								{inicio + 1}–{Math.min(inicio + PAGE_SIZE, filtrados.length)} de{' '}
								{filtrados.length}
							</span>
							<PaginationContent>
								<PaginationItem>
									<PaginationLink
										size="default"
										onClick={(e) => {
											e.preventDefault();
											if (paginaAtual > 1) setPagina(paginaAtual - 1);
										}}
										className={paginaAtual <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}>
										<ChevronLeft className="h-4 w-4" />
										<span className="sr-only">Anterior</span>
									</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<span className="px-2 text-xs text-muted-foreground">
										{paginaAtual} / {totalPaginas}
									</span>
								</PaginationItem>
								<PaginationItem>
									<PaginationLink
										size="default"
										onClick={(e) => {
											e.preventDefault();
											if (paginaAtual < totalPaginas) setPagina(paginaAtual + 1);
										}}
										className={
											paginaAtual >= totalPaginas
												? 'pointer-events-none opacity-40'
												: 'cursor-pointer'
										}>
										<ChevronRight className="h-4 w-4" />
										<span className="sr-only">Próxima</span>
									</PaginationLink>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function DetalheItem({ rotulo, valor }: { rotulo: string; valor: string }) {
	return (
		<div className="min-w-0">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{rotulo}
			</div>
			<div className="mt-0.5 break-words text-xs font-medium text-foreground">{valor}</div>
		</div>
	);
}

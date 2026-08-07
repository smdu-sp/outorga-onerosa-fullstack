'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IRelatorio, IRelatorioTop10 } from '@/types/relatorio';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { TodosProcessosDialog } from './todos-processos-dialog';

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

type FiltroStatus = 'todos' | 'andamento' | 'quitado' | 'quebra';
type FiltroUso = 'todos' | 'R' | 'nR' | 'R/nR' | 'sem';
type PeriodoTop = 'ano' | 'mes' | 'todo';

interface Top10Props {
	d: IRelatorio | null;
	anosDisponiveis?: number[];
	filtroTipo?: string;
	filtroStatus?: string;
	filtroSub?: string;
}

export function Top10Processos({
	d,
	anosDisponiveis = [],
	filtroTipo = 'todos',
	filtroStatus = 'todos',
	filtroSub = 'todas',
}: Top10Props) {
	const [filtroLocal, setFiltroLocal] = useState<FiltroStatus>('todos');
	const [filtroUso, setFiltroUso] = useState<FiltroUso>('todos');
	const [periodo, setPeriodo] = useState<PeriodoTop>('ano');
	const [expandido, setExpandido] = useState<Set<string>>(new Set());

	function toggleExpandido(id: string) {
		setExpandido((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const nomeMes = d?.meses[d.mesAtual] ?? '';
	const anoLabel = d?.anoAtual != null ? String(d.anoAtual) : 'Ano';
	const mesLabel = nomeMes && d?.anoAtual != null ? `${nomeMes}/${d.anoAtual}` : 'Mês';

	function filtrarLista(top: IRelatorioTop10[]) {
		return top
			.filter((p) => filtroTipo === 'todos' || p.tipo === filtroTipo)
			.filter((p) => filtroStatus === 'todos' || p.status === filtroStatus)
			.filter((p) => filtroSub === 'todas' || p.sub === filtroSub)
			.filter((p) => filtroLocal === 'todos' || p.status === filtroLocal)
			.filter((p) => {
				if (filtroUso === 'todos') return true;
				if (filtroUso === 'sem') return p.uso == null;
				return p.uso === filtroUso;
			})
			.slice(0, 10);
	}

	const listas: Record<PeriodoTop, IRelatorioTop10[]> = {
		ano: filtrarLista(d?.top?.ano ?? []),
		mes: filtrarLista(d?.top?.mes ?? []),
		todo: filtrarLista(d?.top?.todo ?? []),
	};

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<TrendingUp className="h-4 w-4 text-muted-foreground" />
					Top 10 — Maiores Processos
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{(['todos', 'andamento', 'quitado', 'quebra'] as FiltroStatus[]).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFiltroLocal(f)}
							className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
								filtroLocal === f
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-accent'
							}`}>
							{f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
						</button>
					))}
					<TodosProcessosDialog
						anosDisponiveis={anosDisponiveis}
						anoInicial={d?.anoAtual}
						mesInicial={d?.mesAtual}
						filtroTipo={filtroTipo}
						filtroStatus={filtroStatus}
						filtroSub={filtroSub}
					/>
				</div>
			</div>

			<div className="mb-3 flex flex-wrap items-center gap-1.5">
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
						onClick={() => setFiltroUso(f)}
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

			<Tabs
				value={periodo}
				onValueChange={(v) => setPeriodo(v as PeriodoTop)}
				className="gap-3">
				<TabsList>
					<TabsTrigger value="ano">Ano ({anoLabel})</TabsTrigger>
					<TabsTrigger value="mes">Mês ({mesLabel})</TabsTrigger>
					<TabsTrigger value="todo">Todo o tempo</TabsTrigger>
				</TabsList>

				{(['ano', 'mes', 'todo'] as PeriodoTop[]).map((p) => (
					<TabsContent key={p} value={p} className="mt-0">
						<TabelaTop
							lista={listas[p]}
							expandido={expandido}
							toggleExpandido={toggleExpandido}
						/>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}

function TabelaTop({
	lista,
	expandido,
	toggleExpandido,
}: {
	lista: IRelatorioTop10[];
	expandido: Set<string>;
	toggleExpandido: (id: string) => void;
}) {
	return (
		<div className="overflow-x-auto">
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
					{lista.length === 0 && (
						<tr>
							<td colSpan={11} className="py-6 text-center text-muted-foreground">
								Nenhum processo encontrado.
							</td>
						</tr>
					)}
					{lista.map((p, i) => {
						const pct =
							p.status === 'quebra' ? 0 : p.total > 0 ? (p.pago / p.total) * 100 : 0;
						const barColor =
							p.status === 'quebra'
								? '#f59e0b'
								: pct >= 100
									? '#16a34a'
									: '#3b82f6';
						const aberto = expandido.has(p.id);
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
										<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
											{i + 1}
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
		</div>
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

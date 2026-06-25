'use client';

import { IRelatorio } from '@/types/relatorio';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

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

type FiltroStatus = 'todos' | 'andamento' | 'quitado' | 'quebra';

interface Top10Props {
	d: IRelatorio | null;
	filtroTipo?: string;
	filtroStatus?: string;
	filtroSub?: string;
}

export function Top10Processos({ d, filtroTipo = 'todos', filtroStatus = 'todos', filtroSub = 'todas' }: Top10Props) {
	const [filtroLocal, setFiltroLocal] = useState<FiltroStatus>('todos');
	const top = d?.top ?? [];
	const lista = top
		.filter((p) => filtroTipo === 'todos' || p.tipo === filtroTipo)
		.filter((p) => filtroStatus === 'todos' || p.status === filtroStatus)
		.filter((p) => filtroSub === 'todas' || p.sub === filtroSub)
		.filter((p) => filtroLocal === 'todos' || p.status === filtroLocal)
		.slice(0, 10);

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<TrendingUp className="h-4 w-4 text-muted-foreground" />
					Top {top.length} — Maiores Processos
				</div>
				<div className="flex flex-wrap gap-1.5">
					{(['todos', 'andamento', 'quitado', 'quebra'] as FiltroStatus[]).map((f) => (
						<button
							key={f}
							onClick={() => setFiltroLocal(f)}
							className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
								filtroLocal === f
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-accent'
							}`}>
							{f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
						</button>
					))}
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-border text-left">
							<th className="pb-2 pr-3 font-semibold text-muted-foreground">#</th>
							<th className="pb-2 pr-3 font-semibold text-muted-foreground">Processo</th>
							<th className="pb-2 pr-3 font-semibold text-muted-foreground">Interessado</th>
							<th className="pb-2 pr-3 font-semibold text-muted-foreground">Tipo</th>
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
								<td colSpan={9} className="py-6 text-center text-muted-foreground">
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
							return (
								<tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
									<td className="py-2.5 pr-3">
										<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
											{i + 1}
										</span>
									</td>
									<td className="py-2.5 pr-3">
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
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

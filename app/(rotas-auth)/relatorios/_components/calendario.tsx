'use client';

import { IRelatorio } from '@/types/relatorio';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const fmtM = (v: number | null, d = 1) =>
	v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}M`;
const fmtPct = (v: number, d = 0) => v.toFixed(d) + '%';

function MonthCard({
	mes,
	idx,
	mesAtual,
	prev,
	real,
	quebra,
	antec,
	ano,
}: {
	mes: string;
	idx: number;
	mesAtual: number;
	prev: number | null;
	real: number | null;
	quebra: number | null;
	antec: number | null;
	ano: number;
}) {
	const isFuturo = idx > mesAtual;
	const isAtual = idx === mesAtual;
	const pct = real != null && prev ? Math.round((real / prev) * 100) : null;

	const fillColor = isAtual
		? '#3b82f6'
		: pct == null
			? '#e2e8f0'
			: pct >= 95
				? '#16a34a'
				: pct >= 80
					? '#d97706'
					: '#dc2626';

	const dotColor = isFuturo
		? '#cbd5e1'
		: isAtual
			? '#3b82f6'
			: pct == null
				? '#94a3b8'
				: pct >= 95
					? '#16a34a'
					: pct >= 80
						? '#d97706'
						: '#dc2626';

	const cardCls = [
		'rounded-xl border p-3 flex flex-col gap-1',
		isAtual ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800' : '',
		isFuturo ? 'opacity-60 bg-muted/30 border-border' : 'bg-card border-border',
		!isAtual && !isFuturo && (quebra ?? 0) > 2
			? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20'
			: '',
	]
		.filter(Boolean)
		.join(' ');

	const isPast = idx <= mesAtual;
	const href = isPast ? `/relatorios/mes/${ano}/${idx + 1}` : undefined;
	const Wrapper = href
		? ({ children }: { children: ReactNode }) => (
				<Link href={href} className={`${cardCls} cursor-pointer transition-opacity hover:opacity-80`}>
					{children}
				</Link>
			)
		: ({ children }: { children: ReactNode }) => <div className={cardCls}>{children}</div>;

	return (
		<Wrapper>
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold text-foreground">{mes}</span>
				<span
					className="h-2 w-2 rounded-full"
					style={{
						background: dotColor,
						boxShadow: isAtual ? '0 0 0 3px rgba(59,130,246,0.18)' : undefined,
					}}
				/>
			</div>
			<div
				className="text-[15px] font-bold"
				style={{ color: isFuturo ? 'var(--muted-foreground)' : undefined }}>
				{real != null ? fmtM(real) : <span className="text-[13px]">—</span>}
			</div>
			<div className="text-[10px] text-muted-foreground">prev. {fmtM(prev)}</div>
			<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
				{real != null && pct != null && (
					<div
						className="h-full rounded-full"
						style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }}
					/>
				)}
			</div>
			<div
				className="text-[10px] font-semibold"
				style={{ color: !isAtual && pct != null && pct < 80 ? '#dc2626' : 'var(--muted-foreground)' }}>
				{isAtual
					? pct != null ? `${fmtPct(pct)} · em andamento` : 'em andamento'
					: pct != null ? fmtPct(pct) : 'previsto'}
			</div>
			{((quebra ?? 0) > 0 || (antec ?? 0) > 0) && (
				<div className="mt-0.5 flex flex-wrap gap-1">
					{(quebra ?? 0) > 0 && (
						<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
							⚠ Quebra {fmtM(quebra)}
						</span>
					)}
					{(antec ?? 0) > 0 && (
						<span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
							↑ Antec. {fmtM(antec)}
						</span>
					)}
				</div>
			)}
		</Wrapper>
	);
}

export function CalendarioArrecadacao({ d }: { d: IRelatorio | null }) {
	const meses = d?.meses ?? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const anoAtual = d?.anoAtual ?? new Date().getFullYear();

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Calendar className="h-4 w-4 text-muted-foreground" />
				Calendário de Arrecadação — {anoAtual}
				<span className="ml-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
					Ano corrente
				</span>
			</div>
			<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12">
				{meses.map((mes, i) => (
					<MonthCard
						key={mes}
						mes={mes}
						idx={i}
						mesAtual={mesAtual}
						prev={d?.d26.prev[i] ?? null}
						real={d?.d26.real[i] ?? null}
						quebra={d?.d26.quebras[i] ?? null}
						antec={d?.d26.antec[i] ?? null}
						ano={anoAtual}
					/>
				))}
			</div>
		</div>
	);
}

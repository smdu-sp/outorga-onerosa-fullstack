'use client';

import { IRelatorio } from '@/types/relatorio';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

const fmtM = (v: number | null, d = 1) =>
	v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}M`;
const fmtPct = (v: number, d = 0) => v.toFixed(d) + '%';

type MesDados = {
	prev: number | null;
	real: number | null;
	estimado: number | null;
	quebra: number | null;
	antec: number | null;
};

function statusColor(pct: number | null, isAtual: boolean, isFuturo: boolean) {
	if (isFuturo) return '#cbd5e1';
	if (isAtual) return '#3b82f6';
	if (pct == null) return '#94a3b8';
	if (pct >= 95) return '#16a34a';
	if (pct >= 80) return '#d97706';
	return '#dc2626';
}

function Wrapper({ href, className, onFocus, children }: { href?: string; className: string; onFocus: () => void; children: ReactNode }) {
	return href ? (
		<Link href={href} className={className} onMouseEnter={onFocus} onFocus={onFocus}>
			{children}
		</Link>
	) : (
		<div className={className} onMouseEnter={onFocus} onFocus={onFocus} tabIndex={0}>
			{children}
		</div>
	);
}

function MonthChip({
	mes,
	idx,
	mesAtual,
	ano,
	emFoco,
	onFoco,
	...d
}: MesDados & { mes: string; idx: number; mesAtual: number; ano: number; emFoco: boolean; onFoco: () => void }) {
	const isFuturo = idx > mesAtual;
	const isAtual = idx === mesAtual;
	const pct = d.real != null && d.prev ? Math.round((d.real / d.prev) * 100) : null;
	const cor = statusColor(pct, isAtual, isFuturo);
	const href = idx <= mesAtual ? `/relatorios/mes/${ano}/${idx + 1}` : undefined;

	return (
		<Wrapper
			href={href}
			onFocus={onFoco}
			className={cn(
				'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2 transition-all',
				emFoco ? 'border-border bg-card shadow-xs' : 'border-transparent hover:bg-muted/60',
			)}>
			<span className={cn('text-[11px] font-semibold', isFuturo ? 'text-muted-foreground' : 'text-foreground')}>{mes}</span>
			<span
				className="h-2 w-2 rounded-full transition-shadow"
				style={{ background: cor, boxShadow: emFoco ? `0 0 0 3px ${cor}2E` : undefined }}
			/>
			<div className="h-1 w-full max-w-8 overflow-hidden rounded-full bg-muted">
				{pct != null && <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />}
			</div>
		</Wrapper>
	);
}

function MonthDetail({ mes, idx, mesAtual, ano, ...d }: MesDados & { mes: string; idx: number; mesAtual: number; ano: number }) {
	const isFuturo = idx > mesAtual;
	const isAtual = idx === mesAtual;
	const pct = d.real != null && d.prev ? Math.round((d.real / d.prev) * 100) : null;
	const cor = statusColor(pct, isAtual, isFuturo);
	const href = idx <= mesAtual ? `/relatorios/mes/${ano}/${idx + 1}` : undefined;

	return (
		<div className="flex min-h-[172px] flex-col gap-3 rounded-xl border border-border bg-muted/30 p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="text-base font-bold text-foreground">
						{mes} de {ano}
					</span>
					{isAtual && (
						<span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
							Mês atual
						</span>
					)}
					{isFuturo && (
						<span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
							Futuro
						</span>
					)}
				</div>
				{href && (
					<Link href={href} className="text-xs font-medium text-primary hover:underline">
						Ver relatório do mês →
					</Link>
				)}
			</div>

			<div className="flex flex-wrap items-end gap-x-8 gap-y-2">
				<div>
					<div className="text-[11px] text-muted-foreground">Arrecadado</div>
					<div className="text-2xl font-bold text-foreground">{d.real != null ? fmtM(d.real) : '—'}</div>
				</div>
				<div>
					<div className="text-[11px] text-muted-foreground">Previsto</div>
					<div className="text-base font-semibold text-muted-foreground">{fmtM(d.prev)}</div>
				</div>
				{pct != null && (
					<div>
						<div className="text-[11px] text-muted-foreground">{isAtual ? 'Em andamento' : 'Atingido'}</div>
						<div className="text-base font-semibold" style={{ color: cor }}>
							{fmtPct(pct)}
						</div>
					</div>
				)}
			</div>

			{(d.estimado ?? 0) > 0 && (
				<div className="text-xs text-muted-foreground">Inclui {fmtM(d.estimado)} com mês estimado pelo vencimento.</div>
			)}

			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				{d.real != null && pct != null && (
					<div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
				)}
			</div>

			{((d.quebra ?? 0) > 0 || (d.antec ?? 0) > 0) && (
				<div className="flex flex-wrap gap-1.5">
					{(d.quebra ?? 0) > 0 && (
						<span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
							⚠ Quebra {fmtM(d.quebra)}
						</span>
					)}
					{(d.antec ?? 0) > 0 && (
						<span className="rounded bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
							↑ Antecipação {fmtM(d.antec)}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

export function CalendarioArrecadacao({ d }: { d: IRelatorio | null }) {
	const meses = d?.meses ?? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
	const mesAtual = d?.mesAtual ?? new Date().getMonth();
	const anoAtual = d?.anoAtual ?? new Date().getFullYear();

	// Destaque: mês atual por padrão, mas muda pro mês em que o mouse/foco está.
	// null = nenhum hover ativo → cai no mês atual (sem precisar sincronizar via effect).
	const [focoManual, setFocoManual] = useState<number | null>(null);
	const foco = focoManual ?? mesAtual;

	const dadosDoMes = (i: number): MesDados => ({
		prev: d?.d26.prev[i] ?? null,
		real: d?.d26.real[i] ?? null,
		estimado: d?.d26.estimado?.[i] ?? null,
		quebra: d?.d26.quebras[i] ?? null,
		antec: d?.d26.antec[i] ?? null,
	});

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Calendar className="h-4 w-4 text-muted-foreground" />
				Calendário de Arrecadação — {anoAtual}
				<span className="ml-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
					Ano corrente
				</span>
			</div>

			<div
				className="mb-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12"
				onMouseLeave={() => setFocoManual(null)}>
				{meses.map((mes, i) => (
					<MonthChip
						key={mes}
						mes={mes}
						idx={i}
						mesAtual={mesAtual}
						ano={anoAtual}
						emFoco={foco === i}
						onFoco={() => setFocoManual(i)}
						{...dadosDoMes(i)}
					/>
				))}
			</div>

			<MonthDetail mes={meses[foco]} idx={foco} mesAtual={mesAtual} ano={anoAtual} {...dadosDoMes(foco)} />
		</div>
	);
}

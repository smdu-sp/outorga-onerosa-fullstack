'use client';

import { IRelatorio } from '@/types/relatorio';
import { PieChart } from 'lucide-react';

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
const fmtPct = (v: number) => v.toFixed(1) + '%';

const STATUS_LABEL: Record<string, string> = {
	quitado: 'Quitados',
	andamento: 'Em andamento',
	quebra: 'Quebras',
};

export function PdeCota({ d }: { d: IRelatorio | null }) {
	const pdeData = d?.pde;
	const cotaData = d?.cota;
	const totalGeral = (pdeData?.total ?? 0) + (cotaData?.total ?? 0) || 1;

	const tipos = [
		{ label: 'PDE', data: pdeData, pct: ((pdeData?.total ?? 0) / totalGeral) * 100, color: '#1e3a7a' },
		{ label: 'COTA', data: cotaData, pct: ((cotaData?.total ?? 0) / totalGeral) * 100, color: '#c2410c' },
	];

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<PieChart className="h-4 w-4 text-muted-foreground" />
				PDE vs COTA
			</div>
			<div className="mb-4 grid grid-cols-2 gap-3">
				{tipos.map((t) => (
					<div
						key={t.label}
						className="rounded-lg border border-border p-3 text-center">
						<div
							className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]"
							style={{ color: t.color }}>
							{t.label}
						</div>
						<div className="font-mono text-lg font-bold">{fmtM(t.data?.total ?? 0)}</div>
						<div className="mt-0.5 text-[11px] text-muted-foreground">
							{fmtPct(t.pct)} · {t.data?.count ?? 0} proc.
						</div>
						<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full"
								style={{ width: `${t.pct}%`, background: t.color }}
							/>
						</div>
					</div>
				))}
			</div>
			<div className="divide-y divide-border">
				{(['andamento', 'quitado', 'quebra'] as const).map((st) => (
					<div
						key={st}
						className="flex items-center justify-between py-2 text-xs">
						<span className="text-muted-foreground">{STATUS_LABEL[st]}</span>
						<span>
							<b style={{ color: '#1e3a7a' }}>{pdeData?.[st] ?? 0}</b> PDE
							<span className="mx-1 text-muted-foreground">·</span>
							<b style={{ color: '#c2410c' }}>{cotaData?.[st] ?? 0}</b> COTA
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

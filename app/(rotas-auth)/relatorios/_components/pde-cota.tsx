'use client';

import { IRelatorio, IRelatorioPdeCota } from '@/types/relatorio';
import { PieChart } from 'lucide-react';

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
const fmtPct = (v: number) => v.toFixed(1) + '%';

const STATUS_LABEL: Record<string, string> = {
	quitado: 'Quitados',
	andamento: 'Em andamento',
	quebra: 'Quebras',
};

const CORES = {
	outorga: '#1e3a7a',
	cota: '#c2410c',
	aiu: '#7c3aed',
};

export function PdeCota({ d }: { d: IRelatorio | null }) {
	const outorgaData = d?.pde;
	const cotaData = d?.cota;
	const aiuData = d?.aiu;
	const totalGeral =
		(outorgaData?.total ?? 0) + (cotaData?.total ?? 0) + (aiuData?.total ?? 0) || 1;

	const tipos: { label: string; data?: IRelatorioPdeCota; pct: number; color: string }[] = [
		{ label: 'Outorga', data: outorgaData, pct: ((outorgaData?.total ?? 0) / totalGeral) * 100, color: CORES.outorga },
		{ label: 'Cota', data: cotaData, pct: ((cotaData?.total ?? 0) / totalGeral) * 100, color: CORES.cota },
		{ label: 'AIU', data: aiuData, pct: ((aiuData?.total ?? 0) / totalGeral) * 100, color: CORES.aiu },
	];

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-1 flex items-center gap-2 text-sm font-semibold">
				<PieChart className="h-4 w-4 text-muted-foreground" />
				Composição por tipo
			</div>
			<p className="mb-4 text-[11px] text-muted-foreground">
				Outorga + Cota compõem o <strong>FUNDURB</strong>; a AIU é arrecadada à parte.
			</p>
			<div className="mb-4 grid grid-cols-3 gap-2">
				{tipos.map((t) => (
					<div key={t.label} className="rounded-lg border border-border p-3 text-center">
						<div
							className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]"
							style={{ color: t.color }}>
							{t.label}
						</div>
						<div className="font-mono text-base font-bold">{fmtM(t.data?.total ?? 0)}</div>
						<div className="mt-0.5 text-[10px] text-muted-foreground">
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
					<div key={st} className="flex items-center justify-between py-2 text-xs">
						<span className="text-muted-foreground">{STATUS_LABEL[st]}</span>
						<span className="flex items-center gap-2">
							<span>
								<b style={{ color: CORES.outorga }}>{outorgaData?.[st] ?? 0}</b> Out.
							</span>
							<span className="text-muted-foreground">·</span>
							<span>
								<b style={{ color: CORES.cota }}>{cotaData?.[st] ?? 0}</b> Cota
							</span>
							<span className="text-muted-foreground">·</span>
							<span>
								<b style={{ color: CORES.aiu }}>{aiuData?.[st] ?? 0}</b> AIU
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

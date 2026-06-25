'use client';

import { IRelatorio } from '@/types/relatorio';
import { Bell } from 'lucide-react';

const fmtM = (v: number) =>
	`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

const TIPO_CLS: Record<string, string> = {
	PDE: 'bg-primary/10 text-primary',
	COTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

function urgCls(dias: number) {
	if (dias <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
	if (dias <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
	return 'bg-muted text-muted-foreground';
}

export function VencimentosProximos({ d }: { d: IRelatorio | null }) {
	const alertas = d?.alertas ?? [];

	return (
		<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Bell className="h-4 w-4 text-muted-foreground" />
				Vencimentos Próximos — 7 dias
				{alertas.length > 0 && (
					<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
						{alertas.length}
					</span>
				)}
			</div>
			{alertas.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhum vencimento nos próximos 7 dias.
				</p>
			) : (
				<div className="flex flex-col gap-2.5">
					{alertas.map((a, i) => (
						<div
							key={i}
							className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
							<div
								className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center ${urgCls(a.dias)}`}>
								<div className="text-sm font-bold leading-none">{a.dias}</div>
								<div className="mt-0.5 text-[9px]">dias</div>
							</div>
							<div className="min-w-0 flex-1">
								<div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] font-semibold">
									{a.num}
								</div>
								<div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">
									{a.int}
								</div>
							</div>
							<span
								className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${TIPO_CLS[a.tipo] ?? 'bg-muted text-muted-foreground'}`}>
								{a.tipo}
							</span>
							<div className="shrink-0 text-right">
								<div className="font-mono text-sm font-bold">{fmtM(a.val)}</div>
								<div className="text-[10px] text-muted-foreground">{a.venc}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

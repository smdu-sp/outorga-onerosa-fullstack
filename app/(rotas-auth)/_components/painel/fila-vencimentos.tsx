import Link from 'next/link';
import { Bell } from 'lucide-react';
import { formatarDataCivil } from '@/lib/datas';
import type { IPainelVencimento } from '@/types/processo';

const fmtBrl = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

const TIPO_CLS: Record<string, string> = {
	PDE: 'bg-primary/10 text-primary',
	COTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
	AIU: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
};

function urgCls(dias: number) {
	if (dias <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
	if (dias <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
	return 'bg-muted text-muted-foreground';
}

export function FilaVencimentos({ itens }: { itens: IPainelVencimento[] }) {
	return (
		<section className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Bell className="h-4 w-4 text-muted-foreground" />
					Vencimentos — 30 dias
					{itens.length > 0 && (
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
							{itens.length}
						</span>
					)}
				</div>
				<Link
					href="/processos?vencimento=MES"
					className="text-xs text-muted-foreground hover:text-primary">
					Ver na lista →
				</Link>
			</div>

			{itens.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhuma parcela a vencer nos próximos 30 dias.
				</p>
			) : (
				<div className="flex flex-col gap-2.5">
					{itens.map((a) => (
						<Link
							key={a.parcelaId}
							href={`/processos/${a.processoId}`}
							className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
							<div
								className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center ${urgCls(a.dias)}`}>
								<div className="text-sm font-bold leading-none">{a.dias}</div>
								<div className="mt-0.5 text-[9px]">dias</div>
							</div>
							<div className="min-w-0 flex-1">
								<div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] font-semibold">
									{a.numProcesso}
									<span className="ml-1.5 font-sans font-normal text-muted-foreground">
										· parc. {a.numParcela}
									</span>
								</div>
								<div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">
									{a.interessado}
								</div>
							</div>
							<span
								className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${TIPO_CLS[a.tipo] ?? 'bg-muted text-muted-foreground'}`}>
								{a.tipo}
							</span>
							<div className="shrink-0 text-right">
								<div className="font-mono text-sm font-bold">{fmtBrl.format(a.valor)}</div>
								<div className="text-[10px] text-muted-foreground">
									{formatarDataCivil(a.vencimento)}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</section>
	);
}

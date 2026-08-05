import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { formatarDataCivil } from '@/lib/datas';
import { PENDENCIAS_META, type CodigoPendencia } from '@/lib/pendencias-processo';
import type { IPainelProcessoRecente } from '@/types/processo';

const STATUS_LABEL: Record<string, string> = {
	EM_PAGAMENTO: 'Em pagamento',
	QUITADO: 'Quitado',
	QUEBRA: 'Quebra',
};

const TIPO_CLS: Record<string, string> = {
	PDE: 'bg-primary/10 text-primary',
	COTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
	AIU: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
};

export function FilaRecentes({ itens }: { itens: IPainelProcessoRecente[] }) {
	return (
		<section className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Clock3 className="h-4 w-4 text-muted-foreground" />
					Processos recentes
				</div>
				<Link href="/processos" className="text-xs text-muted-foreground hover:text-primary">
					Ver todos →
				</Link>
			</div>

			{itens.length === 0 ? (
				<p className="text-sm text-muted-foreground">Nenhum processo recente.</p>
			) : (
				<div className="flex flex-col gap-2.5">
					{itens.map((p) => {
						const pendCriticas = p.pendencias.filter(
							(c) =>
								PENDENCIAS_META[c as CodigoPendencia]?.severidade === 'critica',
						);
						return (
							<Link
								key={p.id}
								href={`/processos/${p.id}`}
								className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-1.5">
										<span className="font-mono text-[11px] font-semibold">
											{p.numProcesso}
										</span>
										{p.tipo && (
											<span
												className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TIPO_CLS[p.tipo] ?? 'bg-muted text-muted-foreground'}`}>
												{p.tipo}
											</span>
										)}
										{p.temPendenciaCritica && (
											<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
												{pendCriticas.length} crítica
												{pendCriticas.length === 1 ? '' : 's'}
											</span>
										)}
									</div>
									<div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">
										{p.interessado}
									</div>
								</div>
								<div className="shrink-0 text-right">
									<div className="text-[11px] font-medium">
										{STATUS_LABEL[p.statusPagamento] ?? p.statusPagamento}
									</div>
									<div className="text-[10px] text-muted-foreground">
										{formatarDataCivil(p.dataEntrada ?? p.criadoEm)}
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</section>
	);
}

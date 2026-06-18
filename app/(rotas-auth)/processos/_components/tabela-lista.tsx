'use client';

import { cn } from '@/lib/utils';
import { IProcesso } from '@/types/processo';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_LABEL: Record<string, string> = {
	EM_PAGAMENTO: 'Em pagamento',
	QUITADO: 'Quitado',
	QUEBRA: 'Quebra',
};

const STATUS_CLASS: Record<string, string> = {
	EM_PAGAMENTO: 'bg-warning-soft text-[oklch(0.5_0.13_70)]',
	QUITADO: 'bg-success-soft text-success',
	QUEBRA: 'bg-destructive/12 text-destructive',
};

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtData = (d?: Date | string | null) =>
	d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function StatusBadge({ status }: { status?: string }) {
	if (!status) return <span className="text-muted-foreground">—</span>;
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-snug',
				STATUS_CLASS[status] ?? 'bg-secondary text-muted-foreground',
			)}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

function ParcelasBarra({
	pagas,
	total,
	status,
}: {
	pagas: number;
	total: number;
	status?: string;
}) {
	if (total === 0) return <span className="text-muted-foreground">—</span>;
	const pct = Math.round((pagas / total) * 100);
	const fillClass =
		status === 'QUEBRA' ? 'bg-destructive' : pagas === total ? 'bg-success' : 'bg-primary';

	return (
		<div className="inline-flex flex-col items-center gap-1">
			<span className="text-xs tabular-nums">
				{pagas}/{total}
			</span>
			<div className="h-[5px] w-14 overflow-hidden rounded-sm bg-border">
				<div className={cn('h-full rounded-sm', fillClass)} style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

export function TabelaLista({ processos }: { processos: IProcesso[] }) {
	const router = useRouter();

	return (
		<div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
			<div className="overflow-x-auto">
				<table className="w-full border-separate border-spacing-0 text-[13.5px]">
					<thead>
						<tr>
							{[
								'Número do processo',
								'Tipo',
								'Interessado',
								'Status',
								'Parcelas',
								'Valor devido',
								'Entrada',
								'Ações',
							].map((col, i) => (
								<th
									key={col}
									className={cn(
										'whitespace-nowrap bg-primary px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground',
										i === 4 && 'text-center',
										(i === 5 || i === 7) && 'text-right',
									)}>
									{col}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{processos.length === 0 ? (
							<tr>
								<td colSpan={8}>
									<div className="px-5 py-[60px] text-center text-muted-foreground">
										Nenhum processo encontrado com os filtros atuais.
									</div>
								</td>
							</tr>
						) : (
							processos.map((p) => {
								const valorDevido = p.valor_devido ?? 0;
								const quitado = valorDevido === 0 || p.status_pagamento === 'QUITADO';

								return (
									<tr
										key={p.id}
										onClick={() => p.id && router.push(`/processos/${p.id}`)}
										className="cursor-pointer transition-colors hover:bg-primary-soft">
										<td className="border-t border-border px-3.5 py-[13px] align-middle whitespace-nowrap">
											<Link href={`/processos/${p.id}`} className="block">
												<span className="font-semibold tabular-nums">{p.num_processo}</span>
												{p.protocolo_ad && (
													<small className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
														{p.protocolo_ad}
													</small>
												)}
											</Link>
										</td>
										<td className="border-t border-border px-3.5 py-[13px] align-middle whitespace-nowrap">
											<span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
												{p.tipo ?? '—'}
											</span>
										</td>
										<td className="border-t border-border px-3.5 py-[13px] align-middle whitespace-nowrap">
											<span className="block max-w-[200px] truncate">
												{p.interessado ?? '—'}
											</span>
											{p.cpf_cnpj && (
												<small className="mt-0.5 block text-[11.5px] text-muted-foreground">
													{p.cpf_cnpj}
												</small>
											)}
										</td>
										<td className="border-t border-border px-3.5 py-[13px] align-middle whitespace-nowrap">
											<StatusBadge status={p.status_pagamento} />
										</td>
										<td className="border-t border-border px-3.5 py-[13px] text-center align-middle whitespace-nowrap">
											<ParcelasBarra
												pagas={p.parcelas_pagas ?? 0}
												total={p.parcelas_total ?? p.parcelas?.length ?? 0}
												status={p.status_pagamento}
											/>
										</td>
										<td
											className={cn(
												'border-t border-border px-3.5 py-[13px] text-right align-middle whitespace-nowrap tabular-nums',
												quitado && 'text-success',
											)}>
											{quitado ? 'Quitado' : fmtBRL(valorDevido)}
										</td>
										<td className="border-t border-border px-3.5 py-[13px] text-center align-middle whitespace-nowrap tabular-nums">
											{fmtData(p.data_entrada)}
										</td>
										<td className="border-t border-border px-3.5 py-[13px] text-right align-middle whitespace-nowrap">
											<Link
												href={`/processos/${p.id}`}
												onClick={(e) => e.stopPropagation()}
												className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-card px-3 py-1.5 text-[12.5px] font-semibold text-primary no-underline hover:border-primary">
												Ver / Editar
												<ArrowRight className="h-3.5 w-3.5" />
											</Link>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

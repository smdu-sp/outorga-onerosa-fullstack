'use client';

import { useTransition } from 'react';
import { IParcela } from '@/types/processo';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { enriquecerParcelas, type IParcelaView } from '@/lib/parcelas-utils';
import { acaoParcela } from '@/services/processos/server-functions/acao-parcela';
import { TrendingDown, Undo2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STATUS_PAGAMENTO } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (d?: Date | string | null) =>
	d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function StatusParcela({ parcela }: { parcela: IParcelaView }) {
	if (parcela.quebra) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-semibold text-destructive">
				<TrendingDown className="h-3 w-3" />
				Quebra
			</span>
		);
	}
	if (parcela.status_quitacao) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
				{parcela.antecipada && <Zap className="h-3 w-3" />}
				{parcela.antecipada ? 'Antecipada' : 'Quitada'}
			</span>
		);
	}
	return (
		<span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
			Pendente
		</span>
	);
}

export function DetalheParcelas({
	processoId,
	parcelas,
	statusPagamento,
	onAtualizado,
}: {
	processoId: string;
	parcelas: IParcela[];
	statusPagamento?: string | null;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [pending, startTransition] = useTransition();
	const parcelasView = enriquecerParcelas(parcelas);
	const total = parcelas.reduce((s, p) => s + (p.valor ?? 0), 0);
	const pagas = parcelas.filter((p) => p.status_quitacao).length;

	function executarAcao(parcelaId: string, acao: 'antecipar' | 'quebra' | 'reverter') {
		startTransition(async () => {
			const resp = await acaoParcela(processoId, parcelaId, acao);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao atualizar parcela.');
				return;
			}
			onAtualizado(resp.data);
			const mensagens = {
				antecipar: 'Parcela marcada como antecipada.',
				quebra: 'Quebra registrada.',
				reverter: 'Quebra revertida.',
			};
			toast.success(mensagens[acao]);
		});
	}

	return (
		<div className="min-w-0">
			<div className="mb-4 flex flex-wrap items-center gap-7 text-[13px] text-muted-foreground">
				<div>
					<span className="mr-1 text-base font-bold text-foreground">{parcelas.length}</span>
					parcelas
				</div>
				<div>
					<span className="mr-1 text-base font-bold text-foreground">{pagas}</span>
					quitadas
				</div>
				<div>
					<span className="mr-1 text-base font-bold text-foreground">{fmtBRL(total)}</span>
					total
				</div>
				{statusPagamento && (
					<div className="ml-auto text-xs">
						Status do processo:{' '}
						<span className="font-semibold text-foreground">
							{STATUS_PAGAMENTO[statusPagamento] ?? statusPagamento}
						</span>
					</div>
				)}
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-separate border-spacing-0 text-[13.5px]">
					<thead>
						<tr>
							{['Nº', 'Valor', 'Vencimento', 'Quitação', 'Ano pag.', 'CPF/CNPJ', 'Situação', 'Ações'].map(
								(col, i) => (
									<th
										key={col}
										className={cn(
											'whitespace-nowrap bg-primary px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground',
											i === 0 && 'text-center',
											(i === 2 || i === 3 || i === 4) && 'text-center',
											i === 6 && 'text-center',
											i === 7 && 'text-right',
										)}>
										{col}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody>
						{parcelasView.length === 0 ? (
							<tr>
								<td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
									Nenhuma parcela cadastrada.
								</td>
							</tr>
						) : (
							parcelasView.map((p, i) => {
								const pendente = !p.status_quitacao && !p.quebra;
								return (
									<tr key={p.id ?? i} className={cn(p.quebra && 'bg-destructive/5')}>
										<td className="border-t border-border px-3.5 py-3 text-center tabular-nums">
											{p.num_parcela}
										</td>
										<td className="border-t border-border px-3.5 py-3 tabular-nums">
											{fmtBRL(p.valor)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											{fmtData(p.vencimento)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											{fmtData(p.data_quitacao)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center tabular-nums">
											{p.ano_pagamento ?? '—'}
										</td>
										<td className="border-t border-border px-3.5 py-3 font-mono text-sm">
											{p.cpf_cnpj ?? '—'}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											<StatusParcela parcela={p} />
										</td>
										<td className="border-t border-border px-3.5 py-3">
											<div className="flex justify-end gap-1.5">
												{pendente && (
													<button
														type="button"
														disabled={pending}
														title="Antecipar — munícipe pagou adiantado"
														onClick={() => p.id && executarAcao(p.id, 'antecipar')}
														className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-card text-primary transition-colors hover:bg-primary/8 disabled:opacity-50">
														<Zap className="h-3.5 w-3.5" />
													</button>
												)}
												{p.quebra ? (
													<button
														type="button"
														disabled={pending}
														title="Reverter quebra"
														onClick={() => p.id && executarAcao(p.id, 'reverter')}
														className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
														<Undo2 className="h-3.5 w-3.5" />
														Reverter
													</button>
												) : (
													<button
														type="button"
														disabled={pending}
														title="Quebra — munícipe parou de pagar"
														onClick={() => p.id && executarAcao(p.id, 'quebra')}
														className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/25 bg-card text-destructive transition-colors hover:bg-destructive/8 disabled:opacity-50">
														<TrendingDown className="h-3.5 w-3.5" />
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className="mt-3 flex flex-wrap gap-5 text-xs text-muted-foreground">
				<span className="inline-flex items-center gap-1.5">
					<Zap className="h-3.5 w-3.5 text-primary" />
					Antecipar — munícipe pagou adiantado
				</span>
				<span className="inline-flex items-center gap-1.5">
					<TrendingDown className="h-3.5 w-3.5 text-destructive" />
					Quebra — munícipe parou de pagar
				</span>
				<span className="inline-flex items-center gap-1.5">
					<Undo2 className="h-3.5 w-3.5" />
					Reverter — desfazer quebra registrada
				</span>
			</div>
		</div>
	);
}

'use client';

import { useState, useTransition } from 'react';
import { IParcela } from '@/types/processo';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { enriquecerParcelas, type IParcelaView } from '@/lib/parcelas-utils';
import { acaoParcela } from '@/services/processos/server-functions/acao-parcela';
import { CheckCircle2, RotateCcw, TrendingDown, Undo2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STATUS_PAGAMENTO } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { ParcelaModal } from './parcela-modal';
import { ParcelasLoteModal } from './parcelas-lote-modal';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

import { formatarDataCivil, dataCivilHoje, dataCivilParaInput } from '@/lib/datas';

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

function RegistrarQuitacaoDialog({
	numParcela,
	pending,
	onConfirmar,
}: {
	numParcela: number;
	pending: boolean;
	onConfirmar: (dataQuitacao: string) => void;
}) {
	const [dataQuitacao, setDataQuitacao] = useState(() => dataCivilParaInput(dataCivilHoje()));

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					type="button"
					disabled={pending}
					title="Confirmar pagamento"
					className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-success/30 bg-card text-success transition-colors hover:bg-success-soft disabled:opacity-50">
					<CheckCircle2 className="h-3.5 w-3.5" />
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
					<AlertDialogDescription>
						Informe a data em que a parcela nº {numParcela} foi paga pelo munícipe. Se a
						data cair num mês anterior ao do vencimento, o sistema marca automaticamente
						como antecipação.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex flex-col gap-1.5 py-2">
					<label className="text-xs font-medium">Data da quitação</label>
					<Input
						type="date"
						value={dataQuitacao}
						onChange={(e) => setDataQuitacao(e.target.value)}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						disabled={!dataQuitacao}
						onClick={() => onConfirmar(dataQuitacao)}>
						Confirmar pagamento
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DetalheParcelas({
	processoId,
	parcelas,
	statusPagamento,
	onAtualizado,
	podeEditar = false,
	podeReverterAntecipacao = false,
}: {
	processoId: string;
	parcelas: IParcela[];
	statusPagamento?: string | null;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
	podeEditar?: boolean;
	podeReverterAntecipacao?: boolean;
}) {
	const [pending, startTransition] = useTransition();
	const parcelasView = enriquecerParcelas(parcelas);
	const total = parcelas.reduce((s, p) => s + (p.valor ?? 0), 0);
	const pagas = parcelas.filter((p) => p.status_quitacao).length;

	function executarAcao(
		parcelaId: string,
		acao: 'antecipar' | 'quebra' | 'reverter' | 'reverter-antecipacao',
		dataQuitacao?: string,
	) {
		startTransition(async () => {
			const resp = await acaoParcela(processoId, parcelaId, acao, dataQuitacao);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao atualizar parcela.');
				return;
			}
			onAtualizado(resp.data);
			const mensagens = {
				antecipar: 'Pagamento confirmado.',
				quebra: 'Quebra registrada.',
				reverter: 'Quebra revertida.',
				'reverter-antecipacao': 'Antecipação desfeita — parcela voltou a pendente.',
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
				<div className="ml-auto flex items-center gap-3.5">
					{statusPagamento && (
						<div className="text-xs">
							Status do processo:{' '}
							<span className="font-semibold text-foreground">
								{STATUS_PAGAMENTO[statusPagamento] ?? statusPagamento}
							</span>
						</div>
					)}
					{podeEditar && (
						<ParcelasLoteModal
							processoId={processoId}
							parcelas={parcelas}
							onAtualizado={onAtualizado}
						/>
					)}
					{podeEditar && <ParcelaModal processoId={processoId} onAtualizado={onAtualizado} />}
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-separate border-spacing-0 text-[13.5px]">
					<thead>
						<tr>
							{['Nº', 'Valor', 'Vencimento', 'Quitação', 'Ano pag.', 'Situação', 'Ações'].map(
								(col, i) => (
									<th
										key={col}
										className={cn(
											'whitespace-nowrap bg-primary px-3.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground',
											i === 0 && 'text-center',
											(i === 2 || i === 3 || i === 4) && 'text-center',
											i === 5 && 'text-center',
											i === 6 && 'text-right',
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
								<td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
									Nenhuma parcela cadastrada.
								</td>
							</tr>
						) : (
							parcelasView.map((p, i) => {
								const pendente = !p.status_quitacao && !p.quebra;
								const processoQuitado = statusPagamento === 'QUITADO';
								return (
									<tr key={p.id ?? i} className={cn(p.quebra && 'bg-destructive/5')}>
										<td className="border-t border-border px-3.5 py-3 text-center tabular-nums">
											{p.num_parcela}
										</td>
										<td className="border-t border-border px-3.5 py-3 tabular-nums">
											{fmtBRL(p.valor)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											{formatarDataCivil(p.vencimento)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											{formatarDataCivil(p.data_quitacao)}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center tabular-nums">
											{p.ano_pagamento ?? '—'}
										</td>
										<td className="border-t border-border px-3.5 py-3 text-center">
											<StatusParcela parcela={p} />
										</td>
										<td className="border-t border-border px-3.5 py-3">
											<div className="flex justify-end gap-1.5">
												{podeEditar && (
													<ParcelaModal
														processoId={processoId}
														parcela={p}
														onAtualizado={onAtualizado}
													/>
												)}
												{podeEditar && pendente && (
													<RegistrarQuitacaoDialog
														numParcela={p.num_parcela}
														pending={pending}
														onConfirmar={(dataQuitacao) =>
															p.id && executarAcao(p.id, 'antecipar', dataQuitacao)
														}
													/>
												)}
												{podeReverterAntecipacao && p.antecipada && (
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<button
																type="button"
																disabled={pending}
																title="Desfazer antecipação (admin)"
																className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
																<RotateCcw className="h-3.5 w-3.5" />
																Desfazer
															</button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Desfazer antecipação</AlertDialogTitle>
																<AlertDialogDescription>
																	A parcela nº {p.num_parcela} voltará ao status anterior
																	(pendente, sem data de quitação). Deseja continuar?
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancelar</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() =>
																		p.id && executarAcao(p.id, 'reverter-antecipacao')
																	}>
																	Desfazer antecipação
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												)}
												{podeEditar && p.quebra && (
													<button
														type="button"
														disabled={pending}
														title="Reverter quebra"
														onClick={() => p.id && executarAcao(p.id, 'reverter')}
														className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
														<Undo2 className="h-3.5 w-3.5" />
														Reverter
													</button>
												)}
												{podeEditar && !p.quebra && !processoQuitado && (
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
					<CheckCircle2 className="h-3.5 w-3.5 text-success" />
					Confirmar pagamento — informa a data em que a parcela foi paga
				</span>
				<span className="inline-flex items-center gap-1.5">
					<TrendingDown className="h-3.5 w-3.5 text-destructive" />
					Quebra — munícipe parou de pagar
				</span>
				<span className="inline-flex items-center gap-1.5">
					<Undo2 className="h-3.5 w-3.5" />
					Reverter — desfazer quebra registrada
				</span>
				{podeReverterAntecipacao && (
					<span className="inline-flex items-center gap-1.5">
						<RotateCcw className="h-3.5 w-3.5" />
						Desfazer — restaura parcela antecipada para pendente (admin)
					</span>
				)}
			</div>
		</div>
	);
}

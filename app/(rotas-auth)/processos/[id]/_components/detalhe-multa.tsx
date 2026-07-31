'use client';

import { useState, useTransition } from 'react';
import { IMulta, IProcessoDetalhe } from '@/types/processo-detalhe';
import {
	quitarMulta,
	removerMulta,
	reverterQuitarMulta,
	salvarMulta,
} from '@/services/processos/server-functions/acao-multa';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { dataCivilHoje, dataCivilParaInput, formatarDataCivil } from '@/lib/datas';
import { parseNumeroBr } from '@/lib/parse-numero-br';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function valorNumerico(valor: number | string | null | undefined): number {
	if (typeof valor === 'number') return valor;
	return parseNumeroBr(valor != null ? String(valor) : '') ?? 0;
}

export function DetalheMulta({
	processoId,
	multa,
	onAtualizado,
	podeEditar,
}: {
	processoId: string;
	multa?: IMulta | null;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
	podeEditar: boolean;
}) {
	const [pending, startTransition] = useTransition();
	const [valor, setValor] = useState(
		multa ? String(valorNumerico(multa.valor)).replace('.', ',') : '',
	);
	const [dataQuitacao, setDataQuitacao] = useState(
		dataCivilParaInput(multa?.data_quitacao) || dataCivilParaInput(dataCivilHoje()),
	);

	function run(fn: () => Promise<{ ok: boolean; data?: IProcessoDetalhe | null; error?: string | null }>) {
		startTransition(async () => {
			const resp = await fn();
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao atualizar multa.');
				return;
			}
			onAtualizado(resp.data);
			toast.success('Salvo.');
		});
	}

	if (!multa) {
		return (
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">Nenhuma multa cadastrada neste processo.</p>
				{podeEditar && (
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-[180px] flex-1">
							<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
								Valor da multa
							</label>
							<Input
								value={valor}
								onChange={(e) => setValor(e.target.value)}
								placeholder="0,00"
								className="mt-1"
							/>
						</div>
						<Button
							type="button"
							disabled={pending || !(parseNumeroBr(valor) ?? 0)}
							onClick={() =>
								run(() => salvarMulta(processoId, { valor: parseNumeroBr(valor) ?? 0 }))
							}>
							Incluir multa
						</Button>
					</div>
				)}
			</div>
		);
	}

	const valorAtual = valorNumerico(multa.valor);

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
					<p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
						Valor
					</p>
					<p className="mt-1 text-base font-semibold tabular-nums">{fmtBRL(valorAtual)}</p>
				</div>
				<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
					<p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
						Situação
					</p>
					<p className="mt-1 text-sm font-semibold">
						{multa.status_quitacao ? 'Paga' : 'Em aberto'}
					</p>
				</div>
				<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
					<p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
						Data do pagamento
					</p>
					<p className="mt-1 text-sm font-semibold">
						{formatarDataCivil(multa.data_quitacao)}
					</p>
				</div>
			</div>

			{podeEditar && (
				<div className="space-y-4 border-t border-border pt-4">
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-[180px] flex-1">
							<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
								Editar valor
							</label>
							<Input
								value={valor}
								onChange={(e) => setValor(e.target.value)}
								placeholder="0,00"
								className="mt-1"
							/>
						</div>
						<Button
							type="button"
							variant="secondary"
							disabled={pending || !(parseNumeroBr(valor) ?? 0)}
							onClick={() =>
								run(() =>
									salvarMulta(processoId, {
										valor: parseNumeroBr(valor) ?? 0,
										status_quitacao: multa.status_quitacao,
										data_quitacao: multa.data_quitacao,
									}),
								)
							}>
							Salvar valor
						</Button>
					</div>

					<div className="flex flex-wrap items-end gap-3">
						{!multa.status_quitacao ? (
							<>
								<div>
									<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
										Data do pagamento
									</label>
									<Input
										type="date"
										value={dataQuitacao}
										onChange={(e) => setDataQuitacao(e.target.value)}
										className="mt-1"
									/>
								</div>
								<Button
									type="button"
									disabled={pending}
									onClick={() => run(() => quitarMulta(processoId, dataQuitacao))}>
									<CheckCircle2 className="mr-1.5 h-4 w-4" />
									Marcar como paga
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={pending}
									onClick={() => run(() => removerMulta(processoId))}>
									<Trash2 className="mr-1.5 h-4 w-4" />
									Remover
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => run(() => reverterQuitarMulta(processoId))}>
								<RotateCcw className="mr-1.5 h-4 w-4" />
								Reverter pagamento
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

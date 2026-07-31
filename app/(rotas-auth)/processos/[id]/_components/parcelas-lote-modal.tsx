'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
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
import { criarParcelasEmLoteAction } from '@/services/processos/server-functions/acao-parcela';
import { IParcela } from '@/types/processo';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { ListPlus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export function ParcelasLoteModal({
	processoId,
	parcelas,
	obrigacao,
	onAtualizado,
}: {
	processoId: string;
	parcelas: IParcela[];
	obrigacao: 'PDE' | 'COTA';
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [open, setOpen] = useState(false);

	const [quantidade, setQuantidade] = useState('10');
	const [numParcelaInicial, setNumParcelaInicial] = useState('1');
	const [valor, setValor] = useState('');
	const [vencimentoInicial, setVencimentoInicial] = useState('');
	const [pending, startTransition] = useTransition();

	function abrir(aberto: boolean) {
		if (aberto) {
			setQuantidade('10');
			setNumParcelaInicial('1');
			setValor('');
			setVencimentoInicial('');
		}
		setOpen(aberto);
	}

	function salvar() {
		const dados = {
			quantidade: Number(quantidade),
			num_parcela_inicial: Number(numParcelaInicial),
			valor: Number(valor.replace(',', '.')),
			vencimento_inicial: vencimentoInicial,
			obrigacao,
		};

		startTransition(async () => {
			const resp = await criarParcelasEmLoteAction(processoId, dados);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao gerar parcelas.');
				return;
			}
			onAtualizado(resp.data);
			toast.success(`${dados.quantidade} parcela(s) gerada(s).`);
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={abrir}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<ListPlus className="h-3.5 w-3.5" />
					Gerar parcelas
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Gerar parcelas em lote — {obrigacao === 'COTA' ? 'Cota de Solidariedade' : 'Outorga'}</DialogTitle>
					<DialogDescription>
						Informe o número total de parcelas e o valor — o mesmo valor é aplicado a todas.
						Os vencimentos seguem mensalmente a partir da 1ª parcela.
						{parcelas.length > 0 && (
							<span className="mt-1.5 block font-medium text-destructive">
								Este processo já tem {parcelas.length} parcela(s) de{' '}
								{obrigacao === 'COTA' ? 'Cota' : 'Outorga'} cadastrada(s) — gerar um novo lote vai
								substituí-las (as de {obrigacao === 'COTA' ? 'Outorga' : 'Cota'}, se houver, não
								são afetadas).
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Nº de parcelas</label>
						<Input
							type="number"
							min={1}
							value={quantidade}
							onChange={(e) => setQuantidade(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Nº da primeira parcela</label>
						<Input
							type="number"
							min={1}
							value={numParcelaInicial}
							onChange={(e) => setNumParcelaInicial(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Valor de cada parcela</label>
						<Input
							type="number"
							step="0.01"
							value={valor}
							onChange={(e) => setValor(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Vencimento da 1ª parcela</label>
						<Input
							type="date"
							value={vencimentoInicial}
							onChange={(e) => setVencimentoInicial(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
						Cancelar
					</Button>
					{parcelas.length > 0 ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button disabled={pending}>{pending ? 'Gerando…' : 'Gerar parcelas'}</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Substituir parcelas existentes?</AlertDialogTitle>
									<AlertDialogDescription>
										Este processo já tem {parcelas.length} parcela(s) cadastrada(s). Gerar o
										novo lote vai apagar todas as parcelas existentes e criar as novas no
										lugar. Essa ação não pode ser desfeita.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction onClick={salvar}>Substituir e gerar</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Button onClick={salvar} disabled={pending}>
							{pending ? 'Gerando…' : 'Gerar parcelas'}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

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
import { dataCivilParaInput } from '@/lib/datas';
import { atualizarParcela, criarParcela } from '@/services/processos/server-functions/acao-parcela';
import { IParcela } from '@/types/processo';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Pencil, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export function ParcelaModal({
	processoId,
	parcela,
	onAtualizado,
}: {
	processoId: string;
	parcela?: IParcela;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const isEditing = Boolean(parcela?.id);
	const [open, setOpen] = useState(false);
	const [numParcela, setNumParcela] = useState(String(parcela?.num_parcela ?? ''));
	const [valor, setValor] = useState(String(parcela?.valor ?? ''));
	const [vencimento, setVencimento] = useState(dataCivilParaInput(parcela?.vencimento));
	const [cpfCnpj, setCpfCnpj] = useState(parcela?.cpf_cnpj ?? '');
	const [pending, startTransition] = useTransition();

	function salvar() {
		const dados = {
			num_parcela: Number(numParcela),
			valor: Number(valor.replace(',', '.')),
			vencimento,
			cpf_cnpj: cpfCnpj || undefined,
		};

		startTransition(async () => {
			const resp =
				isEditing && parcela?.id
					? await atualizarParcela(parcela.id, dados)
					: await criarParcela(processoId, dados);

			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao salvar parcela.');
				return;
			}
			onAtualizado(resp.data);
			toast.success(isEditing ? 'Parcela atualizada.' : 'Parcela criada.');
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{isEditing ? (
					<button
						type="button"
						title="Editar parcela"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted">
						<Pencil className="h-3.5 w-3.5" />
					</button>
				) : (
					<Button variant="outline" size="sm" className="gap-1.5">
						<Plus className="h-3.5 w-3.5" />
						Nova parcela
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Editar parcela' : 'Nova parcela'}</DialogTitle>
					<DialogDescription>Dados da parcela da contrapartida.</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Nº Parcela</label>
						<Input
							type="number"
							value={numParcela}
							onChange={(e) => setNumParcela(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Valor</label>
						<Input
							type="number"
							step="0.01"
							value={valor}
							onChange={(e) => setValor(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">Vencimento</label>
						<Input
							type="date"
							value={vencimento}
							onChange={(e) => setVencimento(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">CPF/CNPJ</label>
						<Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
					</div>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
						Cancelar
					</Button>
					<Button onClick={salvar} disabled={pending}>
						{pending ? 'Salvando…' : 'Salvar'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

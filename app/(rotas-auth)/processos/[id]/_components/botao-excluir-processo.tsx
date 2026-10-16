'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import * as processos from '@/services/processos';
import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function BotaoExcluirProcesso({
	processoId,
	numProcesso,
}: {
	processoId: string;
	numProcesso: string;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleExcluir() {
		startTransition(async () => {
			const resp = await processos.excluir(processoId);
			if (!resp.ok) {
				toast.error('Algo deu errado', { description: resp.error ?? undefined });
				return;
			}
			toast.success('Processo excluído', { description: numProcesso });
			router.push('/processos');
		});
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					title="Excluir processo (ação restrita a desenvolvedores)"
					className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive hover:bg-destructive hover:text-white">
					<Trash2 className="h-4 w-4" />
				</button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir processo {numProcesso}</DialogTitle>
					<DialogDescription>
						Isso remove o processo e todas as parcelas, multa, memoriais de cálculo e dados de
						monitoramento associados. Não pode ser desfeito.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<div className="flex gap-2">
						<DialogClose asChild>
							<Button variant="outline">Voltar</Button>
						</DialogClose>
						<Button
							disabled={isPending}
							onClick={handleExcluir}
							type="submit"
							variant="destructive">
							{isPending ? <Loader2 className="animate-spin" /> : 'Excluir definitivamente'}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

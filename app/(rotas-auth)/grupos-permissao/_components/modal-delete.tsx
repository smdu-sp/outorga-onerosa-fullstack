/** @format */
'use client';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import * as gruposPermissao from '@/services/grupos-permissao';
import { Loader2, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

export default function ModalDelete({ id }: { id: string }) {
	const [isPending, startTransition] = useTransition();

	async function handleDelete(id: string) {
		const resp = await gruposPermissao.excluir(id);
		if (!resp.ok) {
			toast.error('Algo deu errado', { description: resp.error });
		} else {
			toast.success('Permissão excluída com sucesso', {
				description: resp.status,
			});
		}
	}
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					className='hover:bg-destructive  cursor-pointer hover:text-white group transition-all ease-linear duration-200'>
					<Trash2
						size={24}
						className='text-destructive dark:text-white group-hover:text-white group'
					/>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir Grupo de Permissão</DialogTitle>
				</DialogHeader>
				<p>Tem certeza que deseja remover esse grupo de permissão?</p>
				<DialogFooter>
					<div className='flex gap-2'>
						<DialogClose asChild>
							<Button variant={'outline'}>Voltar</Button>
						</DialogClose>
						<Button
							disabled={isPending}
							onClick={() =>
								startTransition(() => {
									handleDelete(id);
								})
							}
							type='submit'
							variant={'destructive'}>
							{isPending ? <Loader2 className='animate-spin' /> : 'Deletar'}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

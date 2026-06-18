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
import * as usuario from '@/services/usuario';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

export default function ModalDelete({
	id,
	status,
}: {
	id: string;
	status: boolean;
}) {
	const [isPending, startTransition] = useTransition();

	async function handleDelete(id: string) {
		const resp = status
			? await usuario.autorizar(id)
			: await usuario.desativar(id);
		if (!resp.ok) {
			console.log(resp);
			toast.error('Algo deu errado', { description: resp.error });
		} else {
			toast.success(
				status ? 'Usuário Ativado com sucesso' : 'Usuário Deletado com sucesso',
				{
					description: resp.status,
				},
			);
			window.location.reload();
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					className={`${
						status ? 'hover:bg-primary' : 'hover:bg-destructive'
					} cursor-pointer hover:text-white group transition-all ease-linear duration-200`}>
					{status ? (
						<Check
							size={24}
							className='text-primary dark:text-white group-hover:text-white group'
						/>
					) : (
						<Trash2
							size={24}
							className='text-destructive dark:text-white group-hover:text-white group'
						/>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{status ? 'Ativar Usuário' : 'Excluir Usuário'}
					</DialogTitle>
				</DialogHeader>
				{status ? (
					<p>Tem certeza que deseja ativar esse usuário?</p>
				) : (
					<p>Tem certeza que deseja remover esse usuário?</p>
				)}
				<DialogFooter>
					<div className='flex gap-2'>
						<DialogClose asChild>
							<Button
								id='close'
								variant={'outline'}>
								Voltar
							</Button>
						</DialogClose>
						<Button
							disabled={isPending}
							onClick={() =>
								startTransition(() => {
									handleDelete(id);
								})
							}
							type='submit'
							variant={status ? 'default' : 'destructive'}>
							{isPending ? (
								<Loader2 className='animate-spin' />
							) : status ? (
								'Ativar'
							) : (
								'Deletar'
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

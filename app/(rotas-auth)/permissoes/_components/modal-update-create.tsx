/** @format */

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, SquarePen } from 'lucide-react';
import FormPermissao from './form-permissao';
import { IPermissao } from '@/types/permissao';

export default function ModalUpdateAndCreate({
	isUpdating,
	permissao,
}: {
	isUpdating: boolean;
	permissao?: Partial<IPermissao>;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					className={`${
						isUpdating
							? 'bg-background hover:bg-primary '
							: 'bg-primary hover:bg-primary hover:opacity-70'
					} group transition-all ease-linear duration-200`}>
					{isUpdating ? (
						<SquarePen
							size={24}
							className='text-primary group-hover:text-white group'
						/>
					) : (
						<Plus
							size={24}
							className=' text-white group'
						/>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Permissão</DialogTitle>
					<DialogDescription>
						Gerencie as informações da permissão
					</DialogDescription>
				</DialogHeader>
				<FormPermissao
					permissao={permissao}
					isUpdating={isUpdating}
				/>
			</DialogContent>
		</Dialog>
	);
}

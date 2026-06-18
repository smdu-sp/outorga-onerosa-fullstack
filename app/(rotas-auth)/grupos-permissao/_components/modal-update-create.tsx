/** @format */
'use client'

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
import FormGrupoPermissao from './form-grupo-permissao';
import { IGrupoPermissao } from '@/types/grupo-permissao';

export default function ModalUpdateAndCreate({
	isUpdating,
	grupoPermissao,
}: {
	isUpdating: boolean;
	grupoPermissao?: Partial<IGrupoPermissao>;
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
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Grupo de Permissão</DialogTitle>
					<DialogDescription>
						Gerencie as informações do grupo de permissão
					</DialogDescription>
				</DialogHeader>
				<FormGrupoPermissao
					grupoPermissao={grupoPermissao}
					isUpdating={isUpdating}
				/>
			</DialogContent>
		</Dialog>
	);
}

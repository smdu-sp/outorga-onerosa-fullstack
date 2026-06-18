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
import { IUsuario } from '@/types/usuario';
import { Plus, SquarePen } from 'lucide-react';
import FormUsuario from './form-usuario';

export default function ModalUpdateAndCreate({
	isUpdating,
	user,
}: {
	isUpdating: boolean;
	user?: Partial<IUsuario>;
}) {
	console.log(isUpdating);
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
							className='text-white group'
						/>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Usuário</DialogTitle>
					<DialogDescription>
						Gerencie as informações do usuário selecioando
					</DialogDescription>
				</DialogHeader>
				<FormUsuario
					user={user}
					isUpdating={isUpdating}
				/>
			</DialogContent>
		</Dialog>
	);
}

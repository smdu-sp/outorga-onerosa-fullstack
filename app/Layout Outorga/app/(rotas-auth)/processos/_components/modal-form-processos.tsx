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
import { Plus } from 'lucide-react';
import React from 'react';
import FormProcessos from './form-processos';

export default function ModalProcessos() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>
					<Plus />
				</Button>
			</DialogTrigger>
			<DialogContent className='xl:max-w-[680px]'>
				<DialogHeader>
					<DialogTitle>Cadastrar Processo</DialogTitle>
					<DialogDescription>
						Preencha os dados abaixo para cadastrar um novo processo
					</DialogDescription>
				</DialogHeader>
				<FormProcessos />
			</DialogContent>
		</Dialog>
	);
}

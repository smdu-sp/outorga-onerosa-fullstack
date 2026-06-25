/** @format */

import { Badge } from '@/components/ui/badge';
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

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { IProcesso } from '@/types/processo';

export default function ModalFormProcessos({
	processo,
}: {
	processo: IProcesso;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant={'ghost'}
					className='w-full text-primary'>
					Ver Detalhes
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className='text-xl font-bold'>
						Processo: {processo.num_processo}
					</DialogTitle>
				</DialogHeader>
				<ul className='flex items-center  gap-5 text-sm'>
					<li>Tipo: {processo.tipo}</li>
					<li>Protocolo: {processo.protocolo_ad}</li>
				</ul>
				<Table className='border'>
					<TableHeader className='bg-primary hover:opacity-100'>
						<TableRow className='hover:opacity-100'>
							<TableHead className='text-secondary text-center'>
								#
							</TableHead>
							<TableHead className='text-secondary text-center'>
								R$
							</TableHead>
							<TableHead className='text-secondary text-center'>
								Status
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{processo &&
							processo.parcelas &&
							processo.parcelas.map((item, index) => (
								<TableRow key={index}>
									<TableCell className='font-medium text-center'>
										{item.num_parcela}
									</TableCell>
									<TableCell className='text-center'>
										{item.valor.toLocaleString('pt-BR', {
											style: 'currency',
											currency: 'BRL',
										})}
									</TableCell>
									<TableCell className='text-center'>
										{item.status_quitacao ? (
											<Badge variant={'success'}>Ativo</Badge>
										) : (
											<Badge variant={'destructive'}>Inativo</Badge>
										)}
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant={'outline'}>Voltar</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

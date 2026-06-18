/** @format */

'use client';

import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import * as permissoes from '@/services/permissoes';
import * as gruposPermissao from '@/services/grupos-permissao';
import { IGrupoPermissao } from '@/types/grupo-permissao';
import { IPermissao } from '@/types/permissao';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { MultiSelect } from '@/components/multi-select';

const formSchema = z.object({
	nome: z.string(),
	permissao: z.string(),
	grupos: z.string().array()
});

interface FormPermissaoProps {
	isUpdating: boolean;
	permissao?: Partial<IPermissao>;
}

export default function FormPermissao({ isUpdating, permissao }: FormPermissaoProps) {
	const [isPending, startTransition] = useTransition();
	const [gruposLista, setGruposLista] = useState<IGrupoPermissao[]>([])
	const defaultGrupos: string[] = permissao && permissao.grupos && permissao.grupos.length > 0 ? 
		permissao.grupos.map(value => value.id) : []

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			nome: permissao?.nome || '',
			permissao: permissao?.permissao || '',
			grupos: defaultGrupos
		},
	});

	useEffect(() => {
		gruposPermissao.listaCompleta().then(({ ok, data, error, status}) => {
			if (ok && status === 200) setGruposLista(data as IGrupoPermissao[]);
			else console.log(error);
		})
	}, [])

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(async () => {
			if (isUpdating && permissao?.id && values?.permissao) {
				const permissao_texto = values.permissao;
				const nome = values.nome;
				const grupos = values.grupos
				const resp = await permissoes.atualizar(permissao?.id, {
					permissao: permissao_texto,
					nome,
					grupos
				});
				if (resp.error) toast.error('Algo deu errado', { description: resp.error });
				else toast.success('Permissão Atualizada', { description: resp.status });
			} else {
				const { nome, permissao } = values;
				const resp = await permissoes.criar({ nome, permissao });
				if (resp.error) toast.error('Algo deu errado', { description: resp.error });
				if (resp.ok) toast.success('Permissão Criada', { description: resp.status });
				console.log(JSON.stringify(resp));
			}
		});
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-4'>
				<FormField
					control={form.control}
					name='nome'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome</FormLabel>
							<FormControl>
								<Input
									placeholder='Nome da permissão'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='permissao'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Permissão</FormLabel>
							<FormControl>
								<Input
									placeholder='Permissão'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="grupos"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Grupos de permissão</FormLabel>
							<MultiSelect
								options={gruposLista.map(grupoPermissaoMap => {
									return { label: grupoPermissaoMap.nome, value: grupoPermissaoMap.id }
								})}
								onValueChange={field.onChange}
								value={field.value}
								defaultValue={field.value}
								placeholder="Selecionar grupos"
								variant="inverted"
							/>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='flex gap-2 items-center justify-end'>
					<DialogClose asChild>
						<Button variant={'outline'}>Voltar</Button>
					</DialogClose>
					<Button
						disabled={isPending}
						type='submit'>
						{isUpdating ? (
							<>
								Atualizar {isPending && <Loader2 className='animate-spin' />}
							</>
						) : (
							<>
								Adicionar {isPending && <Loader2 className='animate-spin' />}
							</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}

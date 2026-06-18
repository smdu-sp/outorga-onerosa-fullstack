/** @format */

'use client';

import { MultiSelect } from '@/components/multi-select';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import * as usuario from '@/services/usuario';
import * as gruposPermissao from '@/services/grupos-permissao';
import * as permissoes from '@/services/permissoes';
import { IGrupoPermissao } from '@/types/grupo-permissao';
import { IPermissao } from '@/types/permissao';
import { IUsuario } from '@/types/usuario';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchemaUsuario = z.object({
	nome: z.string(),
	login: z.string(),
	email: z.string().email(),
	avatar: z.string().optional(),
	permissoes: z.string().array().optional(),
	grupos: z.string().array().optional(),
});

const formSchema = z.object({
	login: z.string(),
});

interface FormUsuarioProps {
	isUpdating: boolean;
	user?: Partial<IUsuario>;
}

export default function FormUsuario({ isUpdating, user }: FormUsuarioProps) {
	console.log(isUpdating);
	const [isPending, startTransition] = useTransition();

	const [gruposLista, setGruposLista] = useState<IGrupoPermissao[]>([]);
	const [permissoesLista, setPermissoesLista] = useState<IPermissao[]>([]);

	useEffect(() => {
		gruposPermissao.listaCompleta().then(({ ok, data, error, status }) => {
			if (ok && status === 200) setGruposLista(data as IGrupoPermissao[]);
			else console.log(error);
		});
		permissoes.listaCompleta().then(({ ok, data, error, status }) => {
			if (ok && status === 200) setPermissoesLista(data as IPermissao[]);
			else console.log(error);
		});
	}, []);

	const defaultPermissoes = user?.permissoes && user.permissoes.length > 0 ? user.permissoes.map(value => value.id) : []
	const defaultGrupos = user?.grupos && user.grupos.length > 0 ? user.grupos.map(value => value.id) : []

	const formUsuario = useForm<z.infer<typeof formSchemaUsuario>>({
		resolver: zodResolver(formSchemaUsuario),
		defaultValues: {
			email: user?.email || '',
			login: user?.login || '',
			nome: user?.nome || '',
			avatar: user?.avatar || '',
			permissoes: defaultPermissoes,
			grupos: defaultGrupos
		},
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			login: '',
		},
	});

	const { data: session, update } = useSession();

	async function onSubmit(values: z.infer<typeof formSchema>) {
		if (!session?.usuario) {
			toast.error('Não autorizado');
			return;
		}
		const { login } = values;
		const resp = await usuario.buscarNovo(login);

		if (resp.error) {
			toast.error('Algo deu errado', { description: resp.error });
		}

		if (resp.ok && resp.data) {
			const usuario = resp.data as IUsuario;
			toast.success('Usuário encontrado', { description: usuario.nome });
			formUsuario.setValue('nome', usuario.nome);
			formUsuario.setValue('email', usuario.email);
			formUsuario.setValue('login', usuario.login);
		}
	}

	async function onSubmitUser(values: z.infer<typeof formSchemaUsuario>) {
		startTransition(async () => {
			if (isUpdating && user?.id) {
				console.log(values);
				const { avatar, permissoes, grupos } = values;
				const resp = await usuario.atualizar(user?.id, {
					avatar, permissoes, grupos
				});
				if (resp.error) {
					toast.error('Algo deu errado', { description: resp.error });
				}
				if (resp.ok) {
					await update({
						...session,
						usuario: {
							...session?.usuario,
							avatar: avatar,
						},
					});
					toast.success('Usuário Atualizado', { description: resp.status });
				}
			} else {
				console.log(values);
				const { email, login, nome, avatar } = values;
				const resp = await usuario.criar({ email, login, nome, avatar });
				if (resp.error) toast.error('Algo deu errado', { description: resp.error });
				if (resp.ok) toast.success('Usuário Criado', { description: resp.status });
			}
		});
	}

	return (
		<>
			{!isUpdating && (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className=' flex items-end gap-2 w-full mb-5'>
						<FormField
							control={form.control}
							name='login'
							render={({ field }) => (
								<FormItem className='w-full'>
									<FormLabel>Login de rede</FormLabel>
									<FormControl>
										<Input
											placeholder='Login do usuário'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							disabled={form.formState.isLoading || !form.formState.isValid}
							type='submit'>
							{form.formState.isLoading || form.formState.isSubmitting ? (
								<>
									Buscar <Loader2 className='animate-spin' />
								</>
							) : (
								<>
									Buscar <ArrowRight />
								</>
							)}
						</Button>
					</form>
				</Form>
			)}

			<Form {...formUsuario}>
				<form
					onSubmit={formUsuario.handleSubmit(onSubmitUser)}
					className='space-y-4'>
					<FormField
						control={formUsuario.control}
						name='avatar'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Avatar</FormLabel>
								<FormDescription>Insira a URL do seu avatar</FormDescription>
								<FormControl>
									<Input
										placeholder='URL de avatar'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={formUsuario.control}
						name='login'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Login de rede</FormLabel>
								<FormControl>
									<Input
										disabled
										placeholder='Login do usuário'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={formUsuario.control}
						name='nome'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nome</FormLabel>
								<FormControl>
									<Input
										disabled
										placeholder='Nome do usuário'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={formUsuario.control}
						name='email'
						render={({ field }) => (
							<FormItem>
								<FormLabel>E-mail</FormLabel>
								<FormControl>
									<Input
										disabled
										type='email'
										placeholder='E-mail do usuário'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={formUsuario.control}
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
					<FormField
						control={formUsuario.control}
						name="permissoes"
						render={({ field }) => (
						<FormItem>
							<FormLabel>Permissões</FormLabel>
							<MultiSelect
								options={permissoesLista.map(permissaoMap => {
									return { label: permissaoMap.nome, value: permissaoMap.id }
								})}
								onValueChange={field.onChange}
								value={field.value}
								defaultValue={field.value}
								placeholder="Selecionar permissões"
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
							{isPending ? <Loader2 className='animate-spin' /> : isUpdating ? 'Atualizar' : 'Adicionar'}
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
}

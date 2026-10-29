/** @format */

'use client';

import { Button } from '@/components/ui/button';
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

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Logo from './logo';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const DOMINIO_EMAIL = 'prefeitura.sp.gov.br';

const formSchema = z.object({
	login: z
		.string()
		.min(1, {
			message: 'Informe seu login de rede ou e-mail.',
		})
		.refine(
			(valor) => valor.length === 7 || z.string().email().safeParse(valor).success,
			{ message: 'Informe seu login de rede (7 caracteres) ou e-mail cadastrado.' },
		),
	senha: z.string().min(2, {
		message: 'Campo senha não pode ser vazio.',
	}),
});

export function LoginForm() {
	const router = useRouter();
	const loginInputRef = useRef<HTMLInputElement | null>(null);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			login: '',
			senha: '',
		},
	});

	async function onSubmit({ login, senha }: z.infer<typeof formSchema>) {
		const result = await signIn('credentials', {
			login,
			senha,
			redirect: false,
		});
		if (result?.error) {
			toast.error('Login ou senha inválidos');
			return;
		}
		router.refresh();
		router.push('/');
	}

	return (
		<Form {...form}>
			<form
				className='p-6 md:p-8 dark:bg-muted bg-background'
				onSubmit={form.handleSubmit(onSubmit)}>
				<div className='flex flex-col gap-6'>
					<div className='flex flex-col items-center text-center'>
						<Logo />
					</div>
					<div className='grid gap-2'>
						<FormField
							control={form.control}
							name='login'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Login ou e-mail</FormLabel>
									<FormControl>
										<Input
											{...field}
											ref={(el) => {
												field.ref(el);
												loginInputRef.current = el;
											}}
											placeholder='Login de rede ou e-mail'
											className='dark:bg-background bg-muted'
											onChange={(e) => {
												const valor = e.target.value;
												if (valor.endsWith('@')) {
													const completo = `${valor}${DOMINIO_EMAIL}`;
													field.onChange(completo);
													requestAnimationFrame(() => {
														loginInputRef.current?.setSelectionRange(
															valor.length,
															completo.length,
														);
													});
													return;
												}
												field.onChange(valor);
											}}
										/>
									</FormControl>
									<FormDescription />
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className='grid gap-2'>
						<FormField
							control={form.control}
							name='senha'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Senha</FormLabel>
									<FormControl>
										<Input
											{...field}
											type='password'
											className='dark:bg-background bg-muted'
										/>
									</FormControl>
									<FormDescription />
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<Button
						type='submit'
						className='w-full'>
						Entrar
					</Button>
				</div>
			</form>
		</Form>
	);
}

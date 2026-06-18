/** @format */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState, useTransition } from 'react';

export default function BuscaProcessos() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();
	const [termo, setTermo] = useState(searchParams.get('busca') ?? '');

	useEffect(() => {
		setTermo(searchParams.get('busca') ?? '');
	}, [searchParams]);

	function aplicarBusca(value: string) {
		const params = new URLSearchParams(searchParams.toString());
		const trimmed = value.trim();

		if (trimmed) {
			params.set('busca', trimmed);
		} else {
			params.delete('busca');
		}

		params.set('pagina', '1');

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`);
		});
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		aplicarBusca(termo);
	}

	function limpar() {
		setTermo('');
		aplicarBusca('');
	}

	const buscaAtiva = Boolean(searchParams.get('busca'));

	return (
		<form
			onSubmit={handleSubmit}
			className='flex gap-2 w-full max-w-md'
			role='search'
			aria-label='Pesquisa por número de processo'>
			<Input
				value={termo}
				onChange={(e) => setTermo(e.target.value)}
				placeholder='Digite o número do processo'
				className='bg-background'
				disabled={isPending}
			/>
			<Button
				type='submit'
				disabled={isPending}
				title='Pesquisar'>
				<Search />
			</Button>
			{buscaAtiva && (
				<Button
					type='button'
					variant='outline'
					onClick={limpar}
					disabled={isPending}
					title='Limpar pesquisa'>
					<X />
				</Button>
			)}
		</form>
	);
}

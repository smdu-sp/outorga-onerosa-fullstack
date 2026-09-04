/** @format */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function BuscaAno() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [busca, setBusca] = useState(searchParams.get('busca') ?? '');

	useEffect(() => {
		const atual = searchParams.get('busca') ?? '';
		if (busca === atual) return;
		const timeout = setTimeout(() => {
			const params = new URLSearchParams(searchParams.toString());
			if (busca) params.set('busca', busca);
			else params.delete('busca');
			params.set('pagina', '1');
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		}, 300);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [busca]);

	return (
		<div className="relative w-full max-w-xs">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder="Buscar por ano..."
				value={busca}
				onChange={(e) => setBusca(e.target.value)}
				className="pl-9"
			/>
		</div>
	);
}

'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FiltroGrupo } from './filtro-grupo';

export function ToolbarLista({
	buscaInicial = '',
	tipoInicial = 'TODOS',
	statusInicial = 'TODOS',
}: {
	buscaInicial?: string;
	tipoInicial?: string;
	statusInicial?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [busca, setBusca] = useState(buscaInicial);

	const atualizarParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (!value || value === 'TODOS') params.delete(key);
				else params.set(key, value);
			}
			params.set('pagina', '1');
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	return (
		<div className="mb-4 flex flex-wrap items-center gap-3">
			<div className="flex min-w-[280px] max-w-[420px] flex-1 items-center gap-[7px] rounded-lg border border-border bg-secondary px-2.5 py-[7px]">
				<Search className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
				<input
					value={busca}
					onChange={(e) => {
						setBusca(e.target.value);
						if (e.target.value === '') atualizarParams({ busca: null });
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							atualizarParams({ busca: busca.trim() || null });
						}
					}}
					placeholder="Buscar por número, interessado ou CPF/CNPJ…"
					className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>

			<div className="flex flex-wrap gap-2">
				<FiltroGrupo
					valor={tipoInicial}
					onChange={(tipo) => atualizarParams({ tipo })}
					opcoes={[
						{ value: 'TODOS', label: 'Todos os tipos' },
						{ value: 'PDE', label: 'PDE' },
						{ value: 'COTA', label: 'COTA' },
					]}
				/>
				<FiltroGrupo
					valor={statusInicial}
					onChange={(status) => atualizarParams({ status })}
					opcoes={[
						{ value: 'TODOS', label: 'Todos' },
						{ value: 'EM_PAGAMENTO', label: 'Em pagamento' },
						{ value: 'QUITADO', label: 'Quitado' },
						{ value: 'QUEBRA', label: 'Quebra' },
					]}
				/>
			</div>
		</div>
	);
}

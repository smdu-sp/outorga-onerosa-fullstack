'use client';

import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FiltroGrupo } from './filtro-grupo';

const VENC_CHIPS = [
	{ value: '', label: 'Todos' },
	{ value: 'MES', label: 'Vence este mês' },
	{ value: '7DIAS', label: 'Vence em 7 dias' },
] as const;

export function ToolbarLista({
	buscaInicial = '',
	tipoInicial = 'TODOS',
	statusInicial = 'TODOS',
	vencimentoInicial = '',
}: {
	buscaInicial?: string;
	tipoInicial?: string;
	statusInicial?: string;
	vencimentoInicial?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [busca, setBusca] = useState(buscaInicial);
	const [vencimento, setVencimento] = useState(vencimentoInicial);

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

			<div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary p-1">
				{VENC_CHIPS.map((chip) => (
					<button
						key={chip.value}
						type="button"
						onClick={() => {
							setVencimento(chip.value);
							atualizarParams({ vencimento: chip.value || null });
						}}
						className={cn(
							'rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors',
							vencimento === chip.value
								? 'bg-primary text-primary-foreground shadow-xs'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground',
						)}>
						{chip.label}
					</button>
				))}
			</div>
		</div>
	);
}

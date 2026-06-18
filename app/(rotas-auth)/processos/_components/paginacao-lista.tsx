'use client';

import { cn } from '@/lib/utils';
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function retornaPaginas(pagina: number, limite: number, total: number): number[] {
	const ultimaPagina = Math.ceil(total / limite) || 1;
	if (pagina > ultimaPagina) pagina = ultimaPagina;
	if (ultimaPagina <= 3) return Array.from({ length: ultimaPagina }, (_, i) => i + 1);
	if (pagina <= 2) return [1, 2, 3];
	if (pagina >= ultimaPagina - 1) return [ultimaPagina - 2, ultimaPagina - 1, ultimaPagina];
	return [pagina - 1, pagina, pagina + 1];
}

export function PaginacaoLista({
	total,
	pagina: paginaProp,
	limite: limiteProp,
}: {
	total: number;
	pagina: number;
	limite: number;
}) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const limites = [5, 10, 15, 20, 50];

	const [pagina, setPagina] = useState(paginaProp);
	const [limite, setLimite] = useState(limiteProp);

	useEffect(() => {
		setPagina(paginaProp);
		setLimite(limiteProp);
	}, [paginaProp, limiteProp]);

	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('pagina', String(pagina));
		params.set('limite', String(limite));
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	}, [pagina, limite, pathname, router, searchParams]);

	if (total === 0) return null;

	const ultimaPag = Math.max(1, Math.ceil(total / limite));
	const pagAtual = Math.min(pagina, ultimaPag);
	const inicio = (pagAtual - 1) * limite;
	const paginas = retornaPaginas(pagAtual, limite, total);

	return (
		<div className="flex flex-wrap items-center justify-between gap-4 px-1.5 pt-3.5">
			<div className="text-[12.5px] text-muted-foreground">
				<b className="font-semibold text-foreground">{inicio + 1}</b>–
				<b className="font-semibold text-foreground">
					{Math.min(inicio + limite, total)}
				</b>{' '}
				de <b className="font-semibold text-foreground">{total}</b> processos
			</div>

			<div className="flex items-center gap-1">
				<PgBtn disabled={pagAtual === 1} onClick={() => setPagina(1)} title="Primeira">
					<ChevronsLeft className="h-[15px] w-[15px]" />
				</PgBtn>
				<PgBtn
					disabled={pagAtual === 1}
					onClick={() => setPagina(pagAtual - 1)}
					title="Anterior">
					<ChevronLeft className="h-[15px] w-[15px]" />
				</PgBtn>
				{paginas.map((n) => (
					<PgBtn
						key={n}
						active={n === pagAtual}
						onClick={() => setPagina(n)}>
						{n}
					</PgBtn>
				))}
				<PgBtn
					disabled={pagAtual === ultimaPag}
					onClick={() => setPagina(pagAtual + 1)}
					title="Próxima">
					<ChevronRight className="h-[15px] w-[15px]" />
				</PgBtn>
				<PgBtn
					disabled={pagAtual === ultimaPag}
					onClick={() => setPagina(ultimaPag)}
					title="Última">
					<ChevronsRight className="h-[15px] w-[15px]" />
				</PgBtn>
			</div>

			<div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
				Registros por página
				<select
					value={limite}
					onChange={(e) => {
						setLimite(+e.target.value);
						setPagina(1);
					}}
					className="h-[34px] rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none">
					{limites.map((l) => (
						<option key={l} value={l}>
							{l}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}

function PgBtn({
	children,
	onClick,
	disabled,
	active,
	title,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	active?: boolean;
	title?: string;
}) {
	return (
		<button
			type="button"
			title={title}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				'inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-border bg-card px-2.5 text-[13px] font-medium text-foreground transition-colors',
				'disabled:cursor-not-allowed disabled:opacity-40',
				active && 'border-primary bg-primary text-white',
			)}>
			{children}
		</button>
	);
}

'use client';

import { cn } from '@/lib/utils';

export function FiltroGrupo({
	opcoes,
	valor,
	onChange,
}: {
	opcoes: { value: string; label: string }[];
	valor: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="inline-flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]">
			{opcoes.map((opcao) => (
				<button
					key={opcao.value}
					type="button"
					onClick={() => onChange(opcao.value)}
					className={cn(
						'rounded-[7px] border-none bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors',
						'hover:text-foreground',
						valor === opcao.value &&
							'bg-card text-primary shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
					)}>
					{opcao.label}
				</button>
			))}
		</div>
	);
}

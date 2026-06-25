'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface FiltrosRelatorioProps {
	subprefeituras: string[];
	anosDisponiveis: number[];
}

export function FiltrosRelatorio({ subprefeituras, anosDisponiveis }: FiltrosRelatorioProps) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const update = useCallback(
		(key: string, value: string, defaultVal: string) => {
			const p = new URLSearchParams(params.toString());
			if (value === defaultVal) {
				p.delete(key);
			} else {
				p.set(key, value);
			}
			const qs = p.toString();
			router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[params, pathname, router],
	);

	const agora = new Date();
	const anoAtual = anosDisponiveis.at(-1) ?? agora.getFullYear();

	const tipo = params.get('tipo') ?? 'todos';
	const status = params.get('status') ?? 'todos';
	const sub = params.get('sub') ?? 'todas';
	const ano = params.get('ano') ?? String(anoAtual);

	const selectCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const labelCls =
		'text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground';
	const sepCls = 'mx-1 h-4 w-px bg-border shrink-0';

	return (
		<div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
			<span className={labelCls}>Tipo</span>
			<select className={selectCls} value={tipo} onChange={(e) => update('tipo', e.target.value, 'todos')}>
				<option value="todos">Todos</option>
				<option value="PDE">PDE</option>
				<option value="COTA">COTA</option>
			</select>

			<div className={sepCls} />

			<span className={labelCls}>Status</span>
			<select className={selectCls} value={status} onChange={(e) => update('status', e.target.value, 'todos')}>
				<option value="todos">Todos</option>
				<option value="quitado">Quitado</option>
				<option value="andamento">Em andamento</option>
				<option value="quebra">Quebra</option>
			</select>

			<div className={sepCls} />

			<span className={labelCls}>Subprefeitura</span>
			<select className={selectCls} value={sub} onChange={(e) => update('sub', e.target.value, 'todas')}>
				<option value="todas">Todas</option>
				{subprefeituras.map((s) => (
					<option key={s} value={s}>
						{s}
					</option>
				))}
			</select>

			<div className={sepCls} />

			<span className={labelCls}>Ano</span>
			<select className={selectCls} value={ano} onChange={(e) => update('ano', e.target.value, String(anoAtual))}>
				{anosDisponiveis.map((y) => (
					<option key={y} value={String(y)}>
						{y}
					</option>
				))}
			</select>
		</div>
	);
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { FiltroPeriodoSubprefeitura } from '@/lib/server/relatorios-subprefeituras';

const MESES = [
	'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
	'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface FiltrosMapaSubprefeiturasProps {
	anosDisponiveis: number[];
	filtro: FiltroPeriodoSubprefeitura;
	totalSubprefeituras: number;
}

function montarUrl(pathname: string, ano: string | null, mes: string | null): string {
	const p = new URLSearchParams();
	if (ano === 'todos') p.set('ano', 'todos');
	else if (ano) p.set('ano', ano);
	if (mes === 'todos') p.set('mes', 'todos');
	else if (mes) p.set('mes', mes);
	const qs = p.toString();
	return qs ? `${pathname}?${qs}` : pathname;
}

export function FiltrosMapaSubprefeituras({
	anosDisponiveis,
	filtro,
	totalSubprefeituras,
}: FiltrosMapaSubprefeiturasProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();

	const anoVal = filtro.ano != null ? String(filtro.ano) : 'todos';
	const mesVal = filtro.mes != null ? String(filtro.mes) : 'todos';
	const temFiltro = filtro.ano != null || filtro.mes != null;

	const aplicar = useCallback(
		(ano: string, mes: string) => {
			const url = montarUrl(pathname, ano, mes);
			startTransition(() => {
				router.push(url, { scroll: false });
				router.refresh();
			});
		},
		[pathname, router],
	);

	const update = useCallback(
		(key: 'ano' | 'mes', value: string) => {
			const ano = key === 'ano' ? value : anoVal;
			const mes = key === 'mes' ? value : mesVal;
			aplicar(ano, mes);
		},
		[anoVal, mesVal, aplicar],
	);

	const limpar = useCallback(() => {
		aplicar('todos', 'todos');
	}, [aplicar]);

	const selectCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const labelCls =
		'text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground';
	const sepCls = 'mx-1 h-4 w-px bg-border shrink-0';

	return (
		<div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
			<span className={labelCls}>Ano</span>
			<select
				className={selectCls}
				value={anoVal}
				disabled={pending}
				onChange={(e) => update('ano', e.target.value)}>
				<option value="todos">Todos</option>
				{anosDisponiveis.map((y) => (
					<option key={y} value={String(y)}>
						{y}
					</option>
				))}
			</select>

			<div className={sepCls} />

			<span className={labelCls}>Mês</span>
			<select
				className={selectCls}
				value={mesVal}
				disabled={pending}
				onChange={(e) => update('mes', e.target.value)}>
				<option value="todos">Todos</option>
				{MESES.map((nome, i) => (
					<option key={nome} value={String(i)}>
						{nome}
					</option>
				))}
			</select>

			{temFiltro && (
				<button
					type="button"
					onClick={limpar}
					disabled={pending}
					className="ml-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
					Limpar filtros
				</button>
			)}

			<div className={sepCls} />

			<span className="text-xs text-muted-foreground">
				{pending
					? 'Atualizando…'
					: `${totalSubprefeituras} subprefeitura${totalSubprefeituras === 1 ? '' : 's'} com arrecadação`}
			</span>
		</div>
	);
}

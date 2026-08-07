'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { FiltroPeriodoDistrito } from '@/lib/server/relatorios-distritos';
import { dataCivilParaInput } from '@/lib/datas';

const MESES = [
	'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
	'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface FiltrosMapaDistritosProps {
	anosDisponiveis: number[];
	filtro: FiltroPeriodoDistrito;
	totalDistritos: number;
}

function montarUrl(
	pathname: string,
	opts: { ano: string | null; mes: string | null; de: string; ate: string },
): string {
	const p = new URLSearchParams();
	if (opts.de || opts.ate) {
		if (opts.de) p.set('de', opts.de);
		if (opts.ate) p.set('ate', opts.ate);
	} else {
		if (opts.ano === 'todos') p.set('ano', 'todos');
		else if (opts.ano) p.set('ano', opts.ano);
		if (opts.mes === 'todos') p.set('mes', 'todos');
		else if (opts.mes) p.set('mes', opts.mes);
	}
	const qs = p.toString();
	return qs ? `${pathname}?${qs}` : pathname;
}

export function FiltrosMapaDistritos({
	anosDisponiveis,
	filtro,
	totalDistritos,
}: FiltrosMapaDistritosProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();

	const temRange = Boolean(filtro.dataInicio || filtro.dataFim);
	const anoVal = temRange ? 'todos' : filtro.ano != null ? String(filtro.ano) : 'todos';
	const mesVal = temRange ? 'todos' : filtro.mes != null ? String(filtro.mes) : 'todos';
	const deVal = filtro.dataInicio ? dataCivilParaInput(filtro.dataInicio) : '';
	const ateVal = filtro.dataFim ? dataCivilParaInput(filtro.dataFim) : '';
	const temFiltro = filtro.ano != null || filtro.mes != null || temRange;

	const navegar = useCallback(
		(url: string) => {
			startTransition(() => {
				router.push(url, { scroll: false });
				router.refresh();
			});
		},
		[router],
	);

	const update = useCallback(
		(key: 'ano' | 'mes', value: string) => {
			const ano = key === 'ano' ? value : anoVal;
			const mes = key === 'mes' ? value : mesVal;
			navegar(montarUrl(pathname, { ano, mes, de: '', ate: '' }));
		},
		[anoVal, mesVal, navegar, pathname],
	);

	const updateData = useCallback(
		(key: 'de' | 'ate', value: string) => {
			const de = key === 'de' ? value : deVal;
			const ate = key === 'ate' ? value : ateVal;
			navegar(montarUrl(pathname, { ano: null, mes: null, de, ate }));
		},
		[deVal, ateVal, navegar, pathname],
	);

	const limpar = useCallback(() => {
		navegar(montarUrl(pathname, { ano: 'todos', mes: 'todos', de: '', ate: '' }));
	}, [navegar, pathname]);

	const selectCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const inputCls =
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
				disabled={pending || temRange}
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
				disabled={pending || temRange}
				onChange={(e) => update('mes', e.target.value)}>
				<option value="todos">Todos</option>
				{MESES.map((nome, i) => (
					<option key={nome} value={String(i)}>
						{nome}
					</option>
				))}
			</select>

			<div className={sepCls} />

			<span className={labelCls}>De</span>
			<input
				type="date"
				className={inputCls}
				value={deVal}
				disabled={pending}
				onChange={(e) => updateData('de', e.target.value)}
			/>
			<span className={labelCls}>Até</span>
			<input
				type="date"
				className={inputCls}
				value={ateVal}
				min={deVal || undefined}
				disabled={pending}
				onChange={(e) => updateData('ate', e.target.value)}
			/>

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
					: `${totalDistritos} distrito${totalDistritos === 1 ? '' : 's'} com arrecadação`}
			</span>
		</div>
	);
}

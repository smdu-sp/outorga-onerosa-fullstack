'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { FiltroPeriodoDistrito } from '@/lib/server/relatorios-distritos';
import { dataCivilParaInput } from '@/lib/datas';
import {
	FiltroBar,
	FiltroClearButton,
	filtroInputClass,
	filtroLabelClass,
	filtroSelectClass,
	filtroSepClass,
} from '@/components/filtro-ui';

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

	return (
		<FiltroBar className="gap-2">
			<span className={filtroLabelClass}>Ano</span>
			<select
				className={filtroSelectClass}
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

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>Mês</span>
			<select
				className={filtroSelectClass}
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

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>De</span>
			<input
				type="date"
				className={filtroInputClass}
				value={deVal}
				disabled={pending}
				onChange={(e) => updateData('de', e.target.value)}
			/>
			<span className={filtroLabelClass}>Até</span>
			<input
				type="date"
				className={filtroInputClass}
				value={ateVal}
				min={deVal || undefined}
				disabled={pending}
				onChange={(e) => updateData('ate', e.target.value)}
			/>

			{temFiltro && (
				<FiltroClearButton onClick={limpar} disabled={pending}>
					Limpar filtros
				</FiltroClearButton>
			)}

			<div className={filtroSepClass} />

			<span className="text-xs text-muted-foreground">
				{pending
					? 'Atualizando…'
					: `${totalDistritos} distrito${totalDistritos === 1 ? '' : 's'} com arrecadação`}
			</span>
		</FiltroBar>
	);
}

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
	FiltroBar,
	FiltroClearButton,
	filtroInputClass,
	filtroLabelClass,
	filtroSelectClass,
	filtroSepClass,
} from '@/components/filtro-ui';

interface FiltrosRelatorioProps {
	subprefeituras: string[];
	anosDisponiveis: number[];
}

export function FiltrosRelatorio({ subprefeituras, anosDisponiveis }: FiltrosRelatorioProps) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const pushParams = useCallback(
		(p: URLSearchParams) => {
			const qs = p.toString();
			router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router],
	);

	const update = useCallback(
		(key: string, value: string, defaultVal: string) => {
			const p = new URLSearchParams(params.toString());
			if (value === defaultVal) {
				p.delete(key);
			} else {
				p.set(key, value);
			}
			pushParams(p);
		},
		[params, pushParams],
	);

	const updateAno = useCallback(
		(value: string) => {
			const p = new URLSearchParams(params.toString());
			p.delete('de');
			p.delete('ate');
			if (value === String(anosDisponiveis.at(-1) ?? new Date().getFullYear())) {
				p.delete('ano');
			} else {
				p.set('ano', value);
			}
			pushParams(p);
		},
		[params, pushParams, anosDisponiveis],
	);

	const updateData = useCallback(
		(key: 'de' | 'ate', value: string) => {
			const p = new URLSearchParams(params.toString());
			if (value) {
				p.set(key, value);
				p.delete('ano');
				p.delete('mes');
			} else {
				p.delete(key);
			}
			pushParams(p);
		},
		[params, pushParams],
	);

	const limparPeriodo = useCallback(() => {
		const p = new URLSearchParams(params.toString());
		p.delete('de');
		p.delete('ate');
		p.delete('ano');
		p.delete('mes');
		pushParams(p);
	}, [params, pushParams]);

	const agora = new Date();
	const anoAtual = anosDisponiveis.at(-1) ?? agora.getFullYear();

	const tipo = params.get('tipo') ?? 'todos';
	const status = params.get('status') ?? 'todos';
	const sub = params.get('sub') ?? 'todas';
	const de = params.get('de') ?? '';
	const ate = params.get('ate') ?? '';
	const temRange = Boolean(de || ate);
	const ano = temRange ? 'todos' : (params.get('ano') ?? String(anoAtual));

	return (
		<FiltroBar className="gap-2.5">
			<span className={filtroLabelClass}>Tipo</span>
			<select className={filtroSelectClass} value={tipo} onChange={(e) => update('tipo', e.target.value, 'todos')}>
				<option value="todos">Todos</option>
				<option value="PDE">PDE</option>
				<option value="COTA">COTA</option>
			</select>

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>Status</span>
			<select className={filtroSelectClass} value={status} onChange={(e) => update('status', e.target.value, 'todos')}>
				<option value="todos">Todos</option>
				<option value="quitado">Quitado</option>
				<option value="andamento">Em andamento</option>
				<option value="quebra">Quebra</option>
			</select>

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>Subprefeitura</span>
			<select className={filtroSelectClass} value={sub} onChange={(e) => update('sub', e.target.value, 'todas')}>
				<option value="todas">Todas</option>
				{subprefeituras.map((s) => (
					<option key={s} value={s}>
						{s}
					</option>
				))}
			</select>

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>Ano</span>
			<select
				className={filtroSelectClass}
				value={ano}
				disabled={temRange}
				onChange={(e) => updateAno(e.target.value)}>
				<option value="todos">Todos</option>
				{anosDisponiveis.map((y) => (
					<option key={y} value={String(y)}>
						{y}
					</option>
				))}
			</select>

			<div className={filtroSepClass} />

			<span className={filtroLabelClass}>De</span>
			<input
				type="date"
				className={filtroInputClass}
				value={de}
				onChange={(e) => updateData('de', e.target.value)}
			/>
			<span className={filtroLabelClass}>Até</span>
			<input
				type="date"
				className={filtroInputClass}
				value={ate}
				min={de || undefined}
				onChange={(e) => updateData('ate', e.target.value)}
			/>

			{temRange && <FiltroClearButton onClick={limparPeriodo}>Limpar período</FiltroClearButton>}
		</FiltroBar>
	);
}

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

	const selectCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const inputCls =
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
			<select
				className={selectCls}
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

			<div className={sepCls} />

			<span className={labelCls}>De</span>
			<input
				type="date"
				className={inputCls}
				value={de}
				onChange={(e) => updateData('de', e.target.value)}
			/>
			<span className={labelCls}>Até</span>
			<input
				type="date"
				className={inputCls}
				value={ate}
				min={de || undefined}
				onChange={(e) => updateData('ate', e.target.value)}
			/>

			{temRange && (
				<button
					type="button"
					onClick={limparPeriodo}
					className="ml-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
					Limpar período
				</button>
			)}
		</div>
	);
}

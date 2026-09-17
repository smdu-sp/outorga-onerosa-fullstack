'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { FiltroClearButton, filtroInputClass, filtroLabelClass } from '@/components/filtro-ui';

/** Inputs de/até reutilizáveis; limpa ano/mês ao preencher. */
export function FiltrosPeriodoDatas({ className }: { className?: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const de = params.get('de') ?? '';
	const ate = params.get('ate') ?? '';

	const update = useCallback(
		(key: 'de' | 'ate', value: string) => {
			const p = new URLSearchParams(params.toString());
			if (value) {
				p.set(key, value);
				p.delete('ano');
				p.delete('mes');
			} else {
				p.delete(key);
			}
			const qs = p.toString();
			router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[params, pathname, router],
	);

	const limpar = useCallback(() => {
		const p = new URLSearchParams(params.toString());
		p.delete('de');
		p.delete('ate');
		const qs = p.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [params, pathname, router]);

	return (
		<div className={className ?? 'flex flex-wrap items-center gap-2'}>
			<span className={filtroLabelClass}>De</span>
			<input
				type="date"
				className={filtroInputClass}
				value={de}
				onChange={(e) => update('de', e.target.value)}
			/>
			<span className={filtroLabelClass}>Até</span>
			<input
				type="date"
				className={filtroInputClass}
				value={ate}
				min={de || undefined}
				onChange={(e) => update('ate', e.target.value)}
			/>
			{(de || ate) && <FiltroClearButton onClick={limpar}>Limpar período</FiltroClearButton>}
		</div>
	);
}

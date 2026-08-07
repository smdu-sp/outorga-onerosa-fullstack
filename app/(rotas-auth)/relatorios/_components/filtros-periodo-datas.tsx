'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

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

	const inputCls =
		'h-[30px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const labelCls =
		'text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground';

	return (
		<div className={className ?? 'flex flex-wrap items-center gap-2'}>
			<span className={labelCls}>De</span>
			<input
				type="date"
				className={inputCls}
				value={de}
				onChange={(e) => update('de', e.target.value)}
			/>
			<span className={labelCls}>Até</span>
			<input
				type="date"
				className={inputCls}
				value={ate}
				min={de || undefined}
				onChange={(e) => update('ate', e.target.value)}
			/>
			{(de || ate) && (
				<button
					type="button"
					onClick={limpar}
					className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
					Limpar período
				</button>
			)}
		</div>
	);
}

'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

export function SearchProcessos({ defaultValue = '' }: { defaultValue?: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [value, setValue] = useState(defaultValue);

	const handleSearch = useCallback(
		(term: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (term) {
				params.set('busca', term);
			} else {
				params.delete('busca');
			}
			params.set('pagina', '1');
			router.push(pathname + '?' + params.toString(), { scroll: false });
		},
		[pathname, router, searchParams],
	);

	return (
		<div className="relative w-full sm:w-80">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
			<Input
				className="pl-9 h-9"
				placeholder="Buscar por processo ou protocolo…"
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
					if (e.target.value === '') handleSearch('');
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter') handleSearch(value);
				}}
			/>
		</div>
	);
}

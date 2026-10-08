'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { FiltroBar, filtroLabelClass, filtroSelectClass } from '@/components/filtro-ui';

const COORDENADORIAS = ['TODAS', 'RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS'] as const;
const STATUS = ['ATIVO', 'ENCERRADO', 'TODOS'] as const;

export function FiltrosListaLicenciamento({
	busca,
	coordenadoria,
	status,
}: {
	busca: string;
	coordenadoria: string;
	status: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();
	const [buscaLocal, setBuscaLocal] = useState(busca);

	function atualizar(next: Record<string, string>) {
		const sp = new URLSearchParams();
		const merged = { busca, coordenadoria, status, ...next };
		if (merged.busca) sp.set('busca', merged.busca);
		if (merged.coordenadoria) sp.set('coordenadoria', merged.coordenadoria);
		if (merged.status) sp.set('status', merged.status);
		startTransition(() => {
			router.push(`${pathname}?${sp.toString()}`);
		});
	}

	return (
		<FiltroBar className={pending ? 'opacity-70' : ''}>
			<div className="flex h-8 min-w-[120px] flex-1 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 sm:h-9 sm:min-w-[220px] sm:gap-[7px] sm:px-2.5">
				<Search className="h-[13px] w-[13px] shrink-0 text-muted-foreground sm:h-[15px] sm:w-[15px]" />
				<input
					value={buscaLocal}
					onChange={(e) => {
						setBuscaLocal(e.target.value);
						if (e.target.value === '') atualizar({ busca: '' });
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') atualizar({ busca: buscaLocal.trim() });
					}}
					placeholder="Processo, SQL, interessado, técnico…"
					className="w-full min-w-0 border-none bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
				/>
			</div>

			<span className={filtroLabelClass}>Coordenadoria</span>
			<Select value={coordenadoria} onValueChange={(v) => atualizar({ coordenadoria: v })}>
				<SelectTrigger className={`${filtroSelectClass} w-auto shrink-0`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{COORDENADORIAS.map((c) => (
						<SelectItem key={c} value={c}>
							{c === 'TODAS' ? 'Todas' : c}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<span className={filtroLabelClass}>Status</span>
			<Select value={status} onValueChange={(v) => atualizar({ status: v })}>
				<SelectTrigger className={`${filtroSelectClass} w-auto shrink-0`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUS.map((s) => (
						<SelectItem key={s} value={s}>
							{s === 'TODOS' ? 'Todos' : s === 'ATIVO' ? 'Ativos' : 'Encerrados'}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FiltroBar>
	);
}

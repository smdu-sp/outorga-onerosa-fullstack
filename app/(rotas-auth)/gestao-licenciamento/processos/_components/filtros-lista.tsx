'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

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
		<form
			className={`flex flex-wrap items-end gap-3 ${pending ? 'opacity-70' : ''}`}
			onSubmit={(e) => {
				e.preventDefault();
				const fd = new FormData(e.currentTarget);
				atualizar({ busca: String(fd.get('busca') ?? '') });
			}}>
			<div className="min-w-[220px] flex-1">
				<label className="mb-1 block text-xs text-muted-foreground">Busca</label>
				<Input
					name="busca"
					defaultValue={busca}
					placeholder="Processo, SQL, interessado, técnico…"
				/>
			</div>
			<div className="w-[160px]">
				<label className="mb-1 block text-xs text-muted-foreground">Coordenadoria</label>
				<Select
					value={coordenadoria}
					onValueChange={(v) => atualizar({ coordenadoria: v })}>
					<SelectTrigger>
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
			</div>
			<div className="w-[160px]">
				<label className="mb-1 block text-xs text-muted-foreground">Status</label>
				<Select value={status} onValueChange={(v) => atualizar({ status: v })}>
					<SelectTrigger>
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
			</div>
			<button
				type="submit"
				className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted/50">
				Buscar
			</button>
		</form>
	);
}

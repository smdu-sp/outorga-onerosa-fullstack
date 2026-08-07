'use client';

import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { useCallback, useState } from 'react';

interface BotaoExportarExcelProps {
	/** Tipo do relatório na API: home | mes | subprefeituras | distritos | saude | zonas | tipologia */
	tipo: string;
	/** Params extras (ex.: ano/mes do drill-down mensal) */
	extraParams?: Record<string, string>;
	className?: string;
	label?: string;
}

export function BotaoExportarExcel({
	tipo,
	extraParams,
	className,
	label = 'Exportar Excel',
}: BotaoExportarExcelProps) {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);

	const baixar = useCallback(async () => {
		setLoading(true);
		try {
			const p = new URLSearchParams(searchParams.toString());
			p.set('tipo', tipo);
			if (extraParams) {
				for (const [k, v] of Object.entries(extraParams)) p.set(k, v);
			}
			const res = await fetch(`/api/relatorios/excel?${p.toString()}`);
			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg || 'Falha na exportação');
			}
			const blob = await res.blob();
			const cd = res.headers.get('Content-Disposition');
			const match = cd?.match(/filename="([^"]+)"/);
			const nome = match?.[1] ?? `relatorio-${tipo}.xlsx`;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = nome;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Erro ao exportar Excel');
		} finally {
			setLoading(false);
		}
	}, [searchParams, tipo, extraParams]);

	return (
		<button
			type="button"
			onClick={baixar}
			disabled={loading}
			className={
				className ??
				'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50'
			}>
			<Download className="h-3.5 w-3.5" />
			{loading ? 'Gerando…' : label}
		</button>
	);
}

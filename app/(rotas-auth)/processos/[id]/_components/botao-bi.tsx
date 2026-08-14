'use client';

import { atualizarProcessoDoBi } from '@/services/processos/server-functions/atualizar-bi';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Database, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function BotaoBi({
	processoId,
	onAtualizado,
}: {
	processoId: string;
	numProcesso?: string;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<'consulta' | null>(null);

	function atualizarDoBi() {
		startTransition(async () => {
			setEtapa('consulta');
			const resp = await atualizarProcessoDoBi(processoId);
			setEtapa(null);

			if (resp.data) {
				onAtualizado(resp.data);
			}

			if (!resp.ok) {
				toast.error(resp.error ?? 'Não foi possível atualizar pelo BI.');
				return;
			}

			const r = resp.resultado;
			const qtdSqls = resp.data?.sqls?.length ?? 0;
			const tip = r?.tipologiaAplicada;
			toast.success(
				[
					'Atualizado pelo BI',
					qtdSqls ? `${qtdSqls} SQL(s)` : null,
					tip ? `tipologia ${tip}` : null,
					r?.fonte ? `(${r.fonte})` : null,
				]
					.filter(Boolean)
					.join(' · '),
			);
		});
	}

	const label = etapa === 'consulta' ? 'Consultando BI…' : 'Atualizar do BI';

	return (
		<button
			type="button"
			disabled={pending}
			onClick={atualizarDoBi}
			title="Consulta o BI (SQLs, categorias) e enriquece cada lote no GeoSampa"
			className={cn(
				'inline-flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-100',
			)}>
			{pending ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<Database className="h-4 w-4" />
			)}
			{label}
		</button>
	);
}

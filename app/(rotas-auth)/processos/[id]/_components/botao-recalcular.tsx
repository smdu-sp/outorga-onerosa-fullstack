'use client';

import { recalcularContrapartida } from '@/services/processos/server-functions/recalcular';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { cn } from '@/lib/utils';
import { Calculator, Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function BotaoRecalcular({
	processoId,
	onAtualizado,
}: {
	processoId: string;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [pending, startTransition] = useTransition();

	function recalcular() {
		startTransition(async () => {
			const resp = await recalcularContrapartida(processoId);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao recalcular contrapartida.');
				return;
			}
			onAtualizado(resp.data);
			toast.success('Contrapartida recalculada a partir das parcelas.');
		});
	}

	return (
		<button
			type="button"
			disabled={pending}
			onClick={recalcular}
			title="Recalcula o valor total das parcelas e a contrapartida da outorga onerosa deste processo"
			className={cn(
				'inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60',
			)}>
			{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
			Recalcular contrapartida
		</button>
	);
}

'use client';

import { consultarEnquadramento } from '@/app/(rotas-auth)/processos/novo/actions';
import { salvarDadosGeoSampa } from '@/services/monitoramento/server-functions/salvar-geosampa';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Database, Loader2, MapPin } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function BotaoGeoSampa({
	processoId,
	numProcesso,
	onAtualizado,
}: {
	processoId: string;
	numProcesso: string;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [pending, startTransition] = useTransition();
	const [etapa, setEtapa] = useState<'consulta' | 'salvar' | null>(null);

	function atualizarDoGeoSampa() {
		startTransition(async () => {
			setEtapa('consulta');
			const consulta = await consultarEnquadramento('PROCESSO', numProcesso);
			if (!consulta.ok || !consulta.data) {
				setEtapa(null);
				toast.error(consulta.error ?? 'Não foi possível consultar o GeoSampa.');
				return;
			}

			setEtapa('salvar');
			const salvar = await salvarDadosGeoSampa(
				processoId,
				'PROCESSO',
				numProcesso,
				consulta.data,
			);
			setEtapa(null);

			if (!salvar.ok || !salvar.data) {
				toast.error(salvar.error ?? 'Erro ao salvar dados do monitoramento DEUSO.');
				return;
			}

			onAtualizado(salvar.data);
			toast.success('Dados de monitoramento de uso atualizados a partir do GeoSampa.');
		});
	}

	const label =
		etapa === 'consulta'
			? 'Consultando GeoSampa…'
			: etapa === 'salvar'
				? 'Salvando monitoramento…'
				: 'Atualizar do GeoSampa';

	return (
		<button
			type="button"
			disabled={pending}
			onClick={atualizarDoGeoSampa}
			title="Consulta o GeoSampa pelo número do processo e preenche a ficha de monitoramento DEUSO"
			className={cn(
				'inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60',
			)}>
			{pending ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<MapPin className="h-4 w-4" />
			)}
			{label}
			<Database className="h-3.5 w-3.5 opacity-70" />
		</button>
	);
}

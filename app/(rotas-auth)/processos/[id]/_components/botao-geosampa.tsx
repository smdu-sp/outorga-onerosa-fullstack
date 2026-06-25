'use client';

import { consultarEnquadramento } from '@/app/(rotas-auth)/processos/novo/actions';
import { salvarDadosGeoSampa } from '@/services/monitoramento/server-functions/salvar-geosampa';
import { saveDevLogSession } from '@/lib/dev-log-store';
import type { GeoSampaLogEntry } from '@/types/geosampa';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Database, Loader2, MapPin } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GeoSampaLogPanel } from './geosampa-log-panel';

const isDev = process.env.NODE_ENV === 'development';

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
	const [logEntries, setLogEntries] = useState<GeoSampaLogEntry[]>([]);

	function atualizarDoGeoSampa() {
		startTransition(async () => {
			const sessionTs = Date.now();
			const allLogs: GeoSampaLogEntry[] = [];
			const pushLog = (level: GeoSampaLogEntry['level'], msg: string) =>
				allLogs.push({ ts: Date.now(), level, msg });

			setEtapa('consulta');
			const consulta = await consultarEnquadramento('PROCESSO', numProcesso);
			if (consulta.logs) allLogs.push(...consulta.logs);

			if (!consulta.ok || !consulta.data) {
				setLogEntries([...allLogs]);
				if (isDev) saveDevLogSession({ id: crypto.randomUUID(), ts: sessionTs, processo: numProcesso, entries: allLogs });
				setEtapa(null);
				toast.error(consulta.error ?? 'Não foi possível consultar o GeoSampa.');
				return;
			}

			setEtapa('salvar');
			pushLog('info', 'Salvando dados de monitoramento DEUSO...');
			setLogEntries([...allLogs]);

			const salvar = await salvarDadosGeoSampa(
				processoId,
				consulta.modoSalvamento ?? 'PROCESSO',
				consulta.identificadorSalvamento ?? numProcesso,
				consulta.data,
			);
			setEtapa(null);

			if (!salvar.ok || !salvar.data) {
				pushLog('error', `Erro ao salvar: ${salvar.error ?? 'desconhecido'}`);
				setLogEntries([...allLogs]);
				if (isDev) saveDevLogSession({ id: crypto.randomUUID(), ts: sessionTs, processo: numProcesso, entries: allLogs });
				toast.error(salvar.error ?? 'Erro ao salvar dados do monitoramento DEUSO.');
				return;
			}

			pushLog('success', 'Dados de monitoramento salvos com sucesso.');
			setLogEntries([...allLogs]);
			if (isDev) saveDevLogSession({ id: crypto.randomUUID(), ts: sessionTs, processo: numProcesso, entries: allLogs });

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
		<div className="relative">
			<button
				type="button"
				disabled={pending}
				onClick={atualizarDoGeoSampa}
				title="Consulta o GeoSampa pelo SQL obtido no banco local ou BI e preenche a ficha de monitoramento DEUSO"
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
			{logEntries.length > 0 && (
				<GeoSampaLogPanel entries={logEntries} onClose={() => setLogEntries([])} />
			)}
		</div>
	);
}

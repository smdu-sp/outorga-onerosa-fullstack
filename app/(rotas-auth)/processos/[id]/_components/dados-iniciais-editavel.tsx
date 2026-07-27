'use client';

import { CampoEditavel } from './monitoramento-campos-editaveis';
import { atualizarDadosIniciais } from '@/services/processos/server-functions/atualizar';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

const LABELS_DADOS_INICIAIS: Record<string, string> = {
	tipo: 'Tipo',
	codigo: 'Código',
	num_processo: 'Número do Processo',
	protocolo_ad: 'Protocolo AD',
	data_entrada: 'Data de Entrada',
};

const TIPO_PROCESSO_OPCOES: Record<string, string> = {
	PDE: 'PDE',
	COTA: 'COTA',
	AIU: 'AIU',
};

function dadosIniciaisDe(detalhe: IProcessoDetalhe): Record<string, unknown> {
	return {
		tipo: detalhe.tipo,
		codigo: detalhe.codigo,
		num_processo: detalhe.num_processo,
		protocolo_ad: detalhe.protocolo_ad,
		data_entrada: detalhe.data_entrada,
	};
}

export function DadosIniciaisEditavel({
	detalhe,
	onAtualizado,
}: {
	detalhe: IProcessoDetalhe;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const processoId = detalhe.id;
	const [valores, setValores] = useState<Record<string, unknown>>(() => dadosIniciaisDe(detalhe));

	useEffect(() => {
		setValores(dadosIniciaisDe(detalhe));
	}, [detalhe]);

	const [pending, startTransition] = useTransition();
	const salvandoRef = useRef(false);

	const salvar = useCallback(
		(payload: Record<string, unknown>) => {
			if (salvandoRef.current) return;
			salvandoRef.current = true;
			startTransition(async () => {
				try {
					const resp = await atualizarDadosIniciais(processoId, payload);
					if (!resp.ok || !resp.data) {
						toast.error(resp.error ?? 'Erro ao salvar.');
						return;
					}
					onAtualizado(resp.data);
					toast.success('Salvo.');
				} finally {
					salvandoRef.current = false;
				}
			});
		},
		[processoId, onAtualizado],
	);

	const handleSalvar = (chave: string, valor: string) => {
		const next = { ...valores, [chave]: valor };
		setValores(next);
		salvar(next);
	};

	return (
		<div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
			{Object.keys(LABELS_DADOS_INICIAIS).map((chave) => (
				<CampoEditavel
					key={chave}
					chave={chave}
					label={LABELS_DADOS_INICIAIS[chave]}
					valor={valores[chave]}
					onSalvar={handleSalvar}
					salvando={pending}
					enumOpcoes={chave === 'tipo' ? TIPO_PROCESSO_OPCOES : undefined}
				/>
			))}
		</div>
	);
}

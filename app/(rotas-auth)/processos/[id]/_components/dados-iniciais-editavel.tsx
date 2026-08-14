'use client';

import { CampoEditavel } from './monitoramento-campos-editaveis';
import { ORIGEM_PROCESSO } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { atualizarDadosIniciais } from '@/services/processos/server-functions/atualizar';
import { IProcessoDetalhe, ISql } from '@/types/processo-detalhe';
import { montarSqlDaLocalizacao } from '@/lib/geosampa-sql.util';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

const LABELS_DADOS_INICIAIS: Record<string, string> = {
	tipo: 'Tipo',
	codigo: 'Código',
	num_processo: 'Número do Processo',
	protocolo_ad: 'Protocolo AD',
	data_entrada: 'Data de Entrada',
	data_autuacao: 'Data de Autuação',
	interessado: 'Interessado',
	cnpj: 'CNPJ',
	origem: 'Sistema de origem',
};

const TIPO_PROCESSO_OPCOES: Record<string, string> = {
	PDE: 'Outorga',
	COTA: 'Cota',
	AIU: 'AIU',
};

function dadosIniciaisDe(detalhe: IProcessoDetalhe): Record<string, unknown> {
	return {
		tipo: detalhe.tipo,
		codigo: detalhe.codigo,
		num_processo: detalhe.num_processo,
		protocolo_ad: detalhe.protocolo_ad,
		data_entrada: detalhe.data_entrada,
		data_autuacao: detalhe.data_autuacao,
		interessado: detalhe.interessado,
		cnpj: detalhe.cnpj,
		origem: detalhe.origem,
	};
}

function formatarSql(sql: ISql): string {
	return (
		montarSqlDaLocalizacao({
			setor: sql.setor,
			quadra: sql.quadra,
			lote_cadastrado: sql.lote_cadastrado,
		}) ?? '—'
	);
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

	const sqls = detalhe.sqls ?? [];

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
				{Object.keys(LABELS_DADOS_INICIAIS).map((chave) => (
					<CampoEditavel
						key={chave}
						chave={chave}
						label={LABELS_DADOS_INICIAIS[chave]}
						valor={valores[chave]}
						onSalvar={handleSalvar}
						salvando={pending}
						enumOpcoes={
							chave === 'tipo'
								? TIPO_PROCESSO_OPCOES
								: chave === 'origem'
									? ORIGEM_PROCESSO
									: undefined
						}
					/>
				))}
			</div>

			<div className="rounded-md border border-border">
				<div className="flex items-center justify-between border-b border-border px-3 py-2">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						SQLs do lote
					</p>
					<span className="text-[11px] text-muted-foreground">
						{sqls.length} registro{sqls.length === 1 ? '' : 's'}
						{detalhe.sql_formatado || detalhe.sql_incra
							? ` · principal: ${detalhe.sql_formatado ?? detalhe.sql_incra}`
							: ''}
					</span>
				</div>
				{sqls.length === 0 ? (
					<p className="px-3 py-4 text-sm text-muted-foreground">
						Nenhum SQL na tabela <code className="rounded bg-muted px-1">sqls</code>.
						Atualize pelo GeoSampa ou use o backfill BI + GeoSampa em Dados faltantes.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{sqls.map((sql) => {
							const endereco = sql.enderecos?.[0];
							const linhaEndereco = endereco
								? [endereco.tipo, endereco.titulo, endereco.nome, endereco.numero]
										.filter((p) => p != null && String(p).trim() !== '')
										.join(' ')
								: null;
							return (
								<li
									key={sql.id}
									className="flex flex-col gap-0.5 px-3 py-2.5 text-sm">
									<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
										<span className="font-mono font-medium">{formatarSql(sql)}</span>
										{sql.codigo_logradouro && (
											<span className="text-xs text-muted-foreground">
												codlog {sql.codigo_logradouro}
											</span>
										)}
									</div>
									{linhaEndereco && (
										<span className="text-xs text-muted-foreground">{linhaEndereco}</span>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}

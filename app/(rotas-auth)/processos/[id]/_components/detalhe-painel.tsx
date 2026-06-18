'use client';

import { RenderSecao } from '@/app/(rotas-auth)/_components/processo-detalhe-campos';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Check } from 'lucide-react';
import { AvisoCalculo, metaSecao } from './detalhe-vnav';
import { DetalheParcelas } from './detalhe-parcelas';
import { RenderSecaoMonitoramentoEditavel } from './monitoramento-campos-editaveis';
import { SECOES_MONITORAMENTO_DEUSO } from '@/lib/monitoramento-secoes';
import { secaoPorId, secaoSemRegistro } from './detalhe-nav';

const fmtDataHora = (d?: string | null) =>
	d ? new Date(d).toLocaleString('pt-BR') : '—';

export function DetalhePainel({
	secaoId,
	detalhe,
	onDetalheAtualizado,
}: {
	secaoId: string;
	detalhe: IProcessoDetalhe;
	onDetalheAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const secao = secaoPorId(secaoId);
	if (!secao) {
		return (
			<div className="rounded-[var(--radius)] border border-border bg-card p-8 text-center text-muted-foreground">
				Seção não encontrada.
			</div>
		);
	}

	const meta = metaSecao(secaoId, detalhe);
	const semRegistro = secaoSemRegistro(secao, detalhe);
	const editavelDeuso = SECOES_MONITORAMENTO_DEUSO.has(secaoId);

	return (
		<div className="min-h-[60vh] min-w-0 flex-1 rounded-[var(--radius)] border border-border bg-card">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
				<div>
					<h2 className="text-lg font-bold">{secao.titulo}</h2>
					<p className="mt-0.5 font-mono text-xs text-muted-foreground">{secao.tabela}</p>
				</div>
				<div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
					{meta && meta.total > 0 && (
						<span className="inline-flex items-center gap-1">
							<b className="font-semibold text-foreground">
								{meta.preenchidos}/{meta.total}
							</b>{' '}
							preenchidos
							{meta.preenchidos === meta.total && (
								<Check className="h-3.5 w-3.5 text-success" />
							)}
						</span>
					)}
					<span>Alterado em {fmtDataHora(detalhe.alterado_em)}</span>
				</div>
			</div>

			<div className="px-6 py-5">
				{secao.id === 'calculo' && <AvisoCalculo />}

				{semRegistro && !editavelDeuso ? (
					<p className="text-sm text-muted-foreground">
						Sem registro nesta tabela para este processo.
					</p>
				) : secao.id === 'parcelas' ? (
					<DetalheParcelas
						processoId={detalhe.id}
						parcelas={detalhe.parcelas ?? []}
						statusPagamento={detalhe.status_pagamento}
						onAtualizado={onDetalheAtualizado}
					/>
				) : editavelDeuso ? (
					<RenderSecaoMonitoramentoEditavel
						secao={secao}
						detalhe={detalhe}
						onAtualizado={onDetalheAtualizado}
					/>
				) : (
					<div className="[&_dl]:gap-x-6 [&_dl]:gap-y-4 [&_dt]:text-[10.5px] [&_dt]:font-semibold [&_dt]:uppercase [&_dt]:tracking-[0.04em] [&_dd]:mt-1 [&_dd]:rounded-md [&_dd]:border [&_dd]:border-border [&_dd]:bg-muted/30 [&_dd]:px-3 [&_dd]:py-2 [&_dd]:text-sm">
						<RenderSecao secao={secao} detalhe={detalhe} />
					</div>
				)}
			</div>
		</div>
	);
}

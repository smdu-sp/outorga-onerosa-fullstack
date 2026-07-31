'use client';

import { IProcessoDetalhe } from '@/types/processo-detalhe';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function paraNumero(valor: string | number | null | undefined): number | null {
	if (valor == null) return null;
	const n = typeof valor === 'number' ? valor : Number(valor);
	return Number.isFinite(n) ? n : null;
}

function CartaoValor({ titulo, valor }: { titulo: string; valor: number | null }) {
	return (
		<div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-secondary/40 p-5">
			<span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
				{titulo}
			</span>
			<span className="text-2xl font-bold tabular-nums">{valor != null ? fmtBRL(valor) : '—'}</span>
		</div>
	);
}

export function DetalheValores({ detalhe }: { detalhe: IProcessoDetalhe }) {
	const outorga = paraNumero(detalhe.monitoramento?.calculo_outorga?.contrapartida_total);
	const cota = paraNumero(detalhe.monitoramento_cota?.valor_calculado_processo);
	const total = outorga != null || cota != null ? (outorga ?? 0) + (cota ?? 0) : null;

	if (outorga == null && cota == null) {
		return (
			<p className="text-sm text-muted-foreground">
				Este processo ainda não tem valor de Outorga nem de Cota de Solidariedade registrado.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<CartaoValor titulo="Outorga (OODC)" valor={outorga} />
				<CartaoValor titulo="Cota de Solidariedade" valor={cota} />
			</div>
			{outorga != null && cota != null && (
				<div className="flex items-center justify-between rounded-[var(--radius)] border border-primary/20 bg-primary-soft px-5 py-4">
					<span className="text-sm font-semibold text-primary">Total (Outorga + Cota)</span>
					<span className="text-xl font-bold tabular-nums text-primary">
						{total != null ? fmtBRL(total) : '—'}
					</span>
				</div>
			)}
			<p className="text-[11.5px] text-muted-foreground">
				Valores calculados/declarados na criação do processo — detalhes em &quot;Cálculo da
				Outorga&quot; e &quot;Cota de Solidariedade&quot;. Os totais efetivamente pagos ficam em
				&quot;Parcela Outorga&quot; e &quot;Parcela Cota&quot;.
			</p>
		</div>
	);
}

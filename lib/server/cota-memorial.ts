/**
 * Acesso a dados da tela `processos/[id]/calculo-cota`: persiste o memorial de
 * cálculo da Cota de Solidariedade confirmado pelo usuário em `CotaMemorialCalculo`
 * (+ endereços) e lista o histórico de um processo.
 */

import { prisma } from '@/lib/prisma';
import type { EntradaCalculoCota, ResultadoCalculoCota } from '@/lib/cota/tipos';

export class CotaMemorialError extends Error {}

/** Persiste o memorial de cálculo confirmado pelo usuário (cabeçalho + endereços)
 * numa transaction. Cada chamada cria uma NOVA versão — não sobrescreve a anterior —
 * para manter histórico. */
export async function salvarMemorialCalculoCota(
	processoId: string,
	entrada: EntradaCalculoCota,
	resultado: ResultadoCalculoCota,
	userId?: string,
): Promise<{ id: string }> {
	const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true } });
	if (!processo) throw new CotaMemorialError('Processo não encontrado.');

	const memorial = await prisma.cotaMemorialCalculo.create({
		data: {
			processo_id: processoId,

			area_terreno_escritura_m2: entrada.areaTerrenoEscrituraM2,
			area_terreno_real_m2: entrada.areaTerrenoRealM2,
			terreno_usado_m2: resultado.terrenoUsadoM2,

			ano_calculo: entrada.anoCalculo ?? null,
			numero_parcelas: entrada.numeroParcelas ?? null,

			v_max: resultado.vMax,
			valor_total_rs: resultado.valorTotalRs,
			valor_cinquenta_pct_rs: resultado.valorCinquentaPctRs,

			criado_por: userId,

			enderecos: {
				create: entrada.enderecos
					.filter((e) => e.setor.trim() && e.quadra.trim() && e.codlog.trim())
					.map((e, idx) => {
						const encontrado = resultado.valoresUnitariosEncontrados[idx];
						return {
							ordem: idx + 1,
							setor: e.setor,
							quadra: e.quadra,
							codlog: e.codlog,
							valor_encontrado: encontrado?.valor ?? null,
						};
					}),
			},
		},
		select: { id: true },
	});

	return memorial;
}

/** Histórico de memoriais salvos para o processo, mais recente primeiro. */
export async function listarMemoriaisCotaDoProcesso(processoId: string) {
	return prisma.cotaMemorialCalculo.findMany({
		where: { processo_id: processoId },
		orderBy: { criado_em: 'desc' },
		include: { enderecos: true, usuario: { select: { nome: true } } },
	});
}

export interface MemorialCotaResumoDto {
	id: string;
	criadoEm: string;
	criadoPorNome: string | null;
	terrenoUsadoM2: number;
	vMax: number | null;
	valorTotalRs: number;
	valorCinquentaPctRs: number;
}

/** Converte um memorial (com `Decimal` do Prisma) num DTO simples, serializável
 * para Client Components — usado pelo resumo do histórico na tela de cálculo. */
export function serializarMemorialCotaResumo(
	memorial: Awaited<ReturnType<typeof listarMemoriaisCotaDoProcesso>>[number],
): MemorialCotaResumoDto {
	return {
		id: memorial.id,
		criadoEm: memorial.criado_em.toISOString(),
		criadoPorNome: memorial.usuario?.nome ?? null,
		terrenoUsadoM2: Number(memorial.terreno_usado_m2),
		vMax: memorial.v_max != null ? Number(memorial.v_max) : null,
		valorTotalRs: Number(memorial.valor_total_rs),
		valorCinquentaPctRs: Number(memorial.valor_cinquenta_pct_rs),
	};
}

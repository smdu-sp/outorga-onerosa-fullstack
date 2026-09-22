import { prisma } from '@/lib/prisma';
import type { EnderecoValorUnitarioCota, ValorUnitarioEncontradoCota } from '@/lib/cota/tipos';

/**
 * Busca o valor de referência (R$/m²) do Quadro 14 para cada endereço informado
 * (setor+quadra+codlog), replicando `Maior Valor (Vm²) = LARGE($I$15:$L$20,1)` da
 * planilha: até 6 endereços podem ser informados, e o cálculo usa o maior valor
 * encontrado entre eles. Diferente da OODC, o Quadro 14 não tem vigência por data —
 * um único valor "2020-atual" por setor/quadra/codlog.
 */
export async function buscarValorReferenciaCota(
	enderecos: EnderecoValorUnitarioCota[],
): Promise<{ valores: ValorUnitarioEncontradoCota[]; vMax: number | null }> {
	const valores: ValorUnitarioEncontradoCota[] = [];

	for (const endereco of enderecos) {
		const { setor, quadra, codlog } = endereco;
		if (!setor?.trim() || !quadra?.trim() || !codlog?.trim()) {
			valores.push({ setor, quadra, codlog, valor: null, observacao: null });
			continue;
		}

		const linha = await prisma.cotaValorReferencia.findUnique({
			where: {
				setor_quadra_codlog: { setor: setor.trim(), quadra: quadra.trim(), codlog: codlog.trim() },
			},
		});

		valores.push({
			setor,
			quadra,
			codlog,
			valor: linha ? Number(linha.valor) : null,
			observacao: linha?.observacao ?? null,
		});
	}

	const encontrados = valores.map((v) => v.valor).filter((v): v is number => v !== null);
	const vMax = encontrados.length ? Math.max(...encontrados) : null;

	return { valores, vMax };
}

import { prisma } from '@/lib/prisma';
import type { EnderecoValorUnitario, ValorUnitarioEncontrado } from '@/lib/oodc/tipos';

/**
 * Busca o valor de referência (R$/m²) vigente para cada endereço informado
 * (setor+quadra+codlog), replicando `v_max = MAX($S$19:$W$28)` da planilha: até 10
 * endereços podem ser informados (lotes contíguos de um mesmo processo), e o
 * cálculo usa o maior valor encontrado entre eles.
 */
export async function buscarValorReferencia(
	enderecos: EnderecoValorUnitario[],
	dataReferencia: Date = new Date(),
): Promise<{ valores: ValorUnitarioEncontrado[]; vMax: number | null }> {
	const valores: ValorUnitarioEncontrado[] = [];

	for (const endereco of enderecos) {
		const { setor, quadra, codlog } = endereco;
		if (!setor?.trim() || !quadra?.trim() || !codlog?.trim()) {
			valores.push({ setor, quadra, codlog, valor: null, dataVigencia: null });
			continue;
		}

		const linha = await prisma.oodcValorReferencia.findFirst({
			where: {
				setor: setor.trim(),
				quadra: quadra.trim(),
				codlog: codlog.trim(),
				data_inicio_vigencia: { lte: dataReferencia },
			},
			orderBy: { data_inicio_vigencia: 'desc' },
		});

		valores.push({
			setor,
			quadra,
			codlog,
			valor: linha ? Number(linha.valor) : null,
			dataVigencia: linha ? linha.data_inicio_vigencia.toISOString().slice(0, 10) : null,
		});
	}

	const encontrados = valores.map((v) => v.valor).filter((v): v is number => v !== null);
	const vMax = encontrados.length ? Math.max(...encontrados) : null;

	return { valores, vMax };
}

/**
 * Obrigações de um processo (Outorga PDE/AIU e/ou Cota de Solidariedade).
 *
 * Um mesmo processo pode ter OODC E Cota — a obrigação vive na parcela
 * (`Parcela.obrigacao`). `Processo.tipo` é um único enum (o tipo predominante) e
 * NÃO serve para responder "tem Cota?" / "tem Outorga?": isso vem das parcelas.
 */

export type Obrigacao = 'PDE' | 'COTA' | 'AIU';

interface ParcelaComObrigacao {
	obrigacao?: Obrigacao | null;
	valor?: number | null;
}

/** Obrigações presentes no processo, na ordem PDE, AIU, COTA. */
export function obrigacoesDoProcesso(
	tipo: Obrigacao | string | null | undefined,
	parcelas: ParcelaComObrigacao[] = [],
): Obrigacao[] {
	const presentes = new Set<Obrigacao>();
	for (const p of parcelas) if (p.obrigacao) presentes.add(p.obrigacao);
	// Sem parcelas (ou só parcelas legadas sem obrigação), vale o tipo do processo.
	if (presentes.size === 0 && (tipo === 'PDE' || tipo === 'COTA' || tipo === 'AIU')) presentes.add(tipo);
	return (['PDE', 'AIU', 'COTA'] as const).filter((o) => presentes.has(o));
}

/** Rótulo curto para listas: "PDE", "COTA", "PDE + COTA"... */
export function rotuloObrigacoes(obrigacoes: Obrigacao[]): string {
	return obrigacoes.length ? obrigacoes.join(' + ') : '—';
}

/** Rótulo por extenso para o cabeçalho: "Outorga", "Cota", "Outorga/Cota", "AIU/Cota"... */
export function rotuloObrigacoesExtenso(obrigacoes: Obrigacao[]): string {
	const nomes = obrigacoes.map((o) => (o === 'PDE' ? 'Outorga' : o === 'COTA' ? 'Cota' : 'AIU'));
	return nomes.join('/');
}

/**
 * Tipo predominante do processo: a obrigação de maior valor somado. Usado para
 * gravar `Processo.tipo` na importação (em vez da obrigação da primeira linha).
 */
export function tipoPredominante(parcelas: ParcelaComObrigacao[]): Obrigacao | undefined {
	const soma = new Map<Obrigacao, number>();
	for (const p of parcelas) if (p.obrigacao) soma.set(p.obrigacao, (soma.get(p.obrigacao) ?? 0) + (p.valor ?? 0));
	let melhor: Obrigacao | undefined;
	for (const [o, v] of soma) if (melhor === undefined || v > (soma.get(melhor) ?? 0)) melhor = o;
	return melhor;
}

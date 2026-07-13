/**
 * Normaliza Macrozona, Macroárea e Subsetor já gravados para os textos
 * canônicos do catálogo (lib/enquadramento-catalogo.ts):
 *
 *   - Macroárea  → texto canônico (CAIXA ALTA, acentuado)
 *   - Macrozona  → derivada da Macroárea canônica (2 valores do PDE)
 *   - Subsetor   → texto canônico; ausente/"" vira "NA"
 *
 * Percorre as duas tabelas que guardam esses campos:
 *   - monitoramento_enquadramento_urbanistico  (aba Enquadramento urbanístico)
 *   - monitoramento_cota_solidariedade          (dados de cota)
 *
 * Valores não reconhecidos são MANTIDOS como estão e listados ao final para
 * revisão manual (nenhum dado é descartado).
 *
 * Uso:
 *   npx tsx scripts/normalizar-enquadramento.ts --dry-run
 *   npx tsx scripts/normalizar-enquadramento.ts
 *   npm run db:normalizar-enquadramento
 */
import {
	MACROAREAS,
	SUBSETORES,
	macrozonaDeMacroarea,
	normalizarMacroarea,
	normalizarSubsetor,
} from '@/lib/enquadramento-catalogo';
import { prisma } from '@/lib/prisma';

const dryRun = process.argv.includes('--dry-run');

const CANONICOS_MACROAREA = new Set<string>(MACROAREAS);
const CANONICOS_SUBSETOR = new Set<string>(SUBSETORES);

type Linha = {
	id: string;
	macrozona: string | null;
	macroarea: string | null;
	subsetor: string | null;
};

type Ajuste = {
	macrozona?: string | null;
	macroarea?: string | null;
	subsetor?: string | null;
};

const naoReconhecidos = {
	macroarea: new Map<string, number>(),
	subsetor: new Map<string, number>(),
};

function registrar(mapa: Map<string, number>, valor: string) {
	mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
}

/** Calcula o novo valor dos três campos; retorna apenas o que mudou. */
function calcularAjuste(linha: Linha): Ajuste | null {
	const macroarea = normalizarMacroarea(linha.macroarea);
	const macrozona = macrozonaDeMacroarea(macroarea) ?? linha.macrozona ?? undefined;
	const subsetor = normalizarSubsetor(linha.subsetor);

	if (macroarea && !CANONICOS_MACROAREA.has(macroarea)) {
		registrar(naoReconhecidos.macroarea, macroarea);
	}
	if (!CANONICOS_SUBSETOR.has(subsetor)) {
		registrar(naoReconhecidos.subsetor, subsetor);
	}

	const ajuste: Ajuste = {};
	if ((macroarea ?? null) !== linha.macroarea) ajuste.macroarea = macroarea ?? null;
	if ((macrozona ?? null) !== linha.macrozona) ajuste.macrozona = macrozona ?? null;
	if (subsetor !== linha.subsetor) ajuste.subsetor = subsetor;

	return Object.keys(ajuste).length > 0 ? ajuste : null;
}

async function normalizarTabela(
	nome: string,
	carregar: () => Promise<Linha[]>,
	salvar: (id: string, ajuste: Ajuste) => Promise<unknown>,
) {
	const linhas = await carregar();
	let alteradas = 0;

	for (const linha of linhas) {
		const ajuste = calcularAjuste(linha);
		if (!ajuste) continue;
		alteradas++;
		if (!dryRun) await salvar(linha.id, ajuste);
	}

	console.log(
		`${nome}: ${alteradas}/${linhas.length} registro(s) ${dryRun ? 'seriam ajustados' : 'ajustados'}.`,
	);
}

async function main() {
	console.log(dryRun ? '=== DRY-RUN (nenhuma escrita) ===' : '=== Aplicando alterações ===');

	await normalizarTabela(
		'monitoramento_enquadramento_urbanistico',
		() =>
			prisma.monitoramentoEnquadramentoUrbanistico.findMany({
				select: { id: true, macrozona: true, macroarea: true, subsetor: true },
			}),
		(id, data) =>
			prisma.monitoramentoEnquadramentoUrbanistico.update({ where: { id }, data }),
	);

	await normalizarTabela(
		'monitoramento_cota_solidariedade',
		() =>
			prisma.monitoramentoCotaSolidariedade.findMany({
				select: { id: true, macrozona: true, macroarea: true, subsetor: true },
			}),
		(id, data) => prisma.monitoramentoCotaSolidariedade.update({ where: { id }, data }),
	);

	const relatarNaoReconhecidos = (rotulo: string, mapa: Map<string, number>) => {
		if (mapa.size === 0) return;
		console.log(`\n⚠ ${rotulo} não reconhecidos (mantidos como estão, revisar):`);
		for (const [valor, qtd] of [...mapa.entries()].sort((a, b) => b[1] - a[1])) {
			console.log(`   ${qtd}x  ${JSON.stringify(valor)}`);
		}
	};

	relatarNaoReconhecidos('Macroárea', naoReconhecidos.macroarea);
	relatarNaoReconhecidos('Subsetor', naoReconhecidos.subsetor);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());

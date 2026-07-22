/**
 * Auditoria de qualidade do campo `contrapartida_total` (agora Decimal).
 * Cruza com area_terreno / area_computavel_total / valor_m2_quadro14 e com a
 * arrecadação real das parcelas do processo, para achar valores implausíveis
 * e entender o padrão do erro de origem (planilha).
 */

import { prisma } from '../lib/prisma';

const brl = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

async function main() {
	const rows = await prisma.monitoramentoCalculoOutorga.findMany({
		where: { contrapartida_total: { not: null } },
		select: {
			contrapartida_total: true,
			area_terreno: true,
			area_computavel_total: true,
			valor_m2_quadro14: true,
			coeficiente_utilizado: true,
			ficha: {
				select: {
					processo: {
						select: {
							num_processo: true,
							tipo: true,
							parcelas: { select: { valor: true } },
						},
					},
				},
			},
		},
	});

	const dados = rows.map((r) => {
		const cp = Number(r.contrapartida_total);
		const somaParcelas = (r.ficha?.processo?.parcelas ?? []).reduce((s, p) => s + p.valor, 0);
		return {
			cp,
			area_terreno: r.area_terreno != null ? Number(r.area_terreno) : null,
			area_comp: r.area_computavel_total != null ? Number(r.area_computavel_total) : null,
			vlm2: r.valor_m2_quadro14 != null ? Number(r.valor_m2_quadro14) : null,
			num: r.ficha?.processo?.num_processo ?? '?',
			tipo: r.ficha?.processo?.tipo ?? '?',
			somaParcelas,
			nParcelas: r.ficha?.processo?.parcelas?.length ?? 0,
		};
	});

	const ordenado = [...dados].sort((a, b) => b.cp - a.cp);
	const valores = dados.map((d) => d.cp).sort((a, b) => a - b);
	const pct = (p: number) => valores[Math.min(valores.length - 1, Math.floor(p * valores.length))];

	// Faixas de magnitude (ordem de grandeza) — revela onde os valores "quebram"
	const faixas = [
		{ label: '= 0', test: (n: number) => n === 0 },
		{ label: '1 – 1 mil', test: (n: number) => n > 0 && n < 1e3 },
		{ label: '1 mil – 100 mil', test: (n: number) => n >= 1e3 && n < 1e5 },
		{ label: '100 mil – 1 mi', test: (n: number) => n >= 1e5 && n < 1e6 },
		{ label: '1 mi – 10 mi', test: (n: number) => n >= 1e6 && n < 1e7 },
		{ label: '10 mi – 100 mi', test: (n: number) => n >= 1e7 && n < 1e8 },
		{ label: '100 mi – 1 bi', test: (n: number) => n >= 1e8 && n < 1e9 },
		{ label: '>= 1 bi', test: (n: number) => n >= 1e9 },
	];

	console.log(`===== AUDITORIA contrapartida_total (${dados.length} preenchidos) =====\n`);
	console.log('Percentis:');
	console.log(`  p10=${brl(pct(0.1))}  p50=${brl(pct(0.5))}  p90=${brl(pct(0.9))}`);
	console.log(`  p95=${brl(pct(0.95))}  p99=${brl(pct(0.99))}  max=${brl(valores[valores.length - 1])}`);
	console.log(`  zeros=${dados.filter((d) => d.cp === 0).length}\n`);

	console.log('Distribuição por ordem de grandeza:');
	for (const f of faixas) {
		const n = dados.filter((d) => f.test(d.cp)).length;
		if (n) console.log(`  ${f.label.padEnd(18)} ${n}`);
	}

	console.log('\nTop 15 maiores — comparados com área e arrecadação real:');
	console.log('  contrapartida        | area_terr | area_comp | vl_m2   | parc.pagas(soma) | processo');
	for (const d of ordenado.slice(0, 15)) {
		console.log(
			`  ${brl(d.cp).padStart(18)} | ${String(d.area_terreno ?? '—').padStart(9)} | ${String(
				d.area_comp ?? '—',
			).padStart(9)} | ${String(d.vlm2 ?? '—').padStart(7)} | ${brl(d.somaParcelas).padStart(14)} (${d.nParcelas}) | ${d.tipo} ${d.num}`,
		);
	}

	// Razão contrapartida / soma das parcelas — testa a hipótese do fator 100x.
	const comP = dados.filter((d) => d.somaParcelas > 0);
	const razoes = comP.map((d) => d.cp / d.somaParcelas).sort((a, b) => a - b);
	const rp = (p: number) => razoes[Math.min(razoes.length - 1, Math.floor(p * razoes.length))];
	const bucketsRazao = [
		{ label: '< 0,5x', test: (r: number) => r < 0.5 },
		{ label: '0,5x – 2x', test: (r: number) => r >= 0.5 && r < 2 },
		{ label: '2x – 50x', test: (r: number) => r >= 2 && r < 50 },
		{ label: '90x – 110x (≈100x)', test: (r: number) => r >= 90 && r <= 110 },
		{ label: 'outros >110x / 50–90x', test: (r: number) => (r > 50 && r < 90) || r > 110 },
	];
	console.log('\n===== Razão contrapartida / soma_parcelas =====');
	console.log(`  mediana=${rp(0.5).toFixed(1)}x  p10=${rp(0.1).toFixed(1)}x  p90=${rp(0.9).toFixed(1)}x`);
	for (const b of bucketsRazao) {
		const n = razoes.filter(b.test).length;
		if (n) console.log(`  ${b.label.padEnd(22)} ${n} (${Math.round((n / razoes.length) * 100)}%)`);
	}

	// Testa se contrapartida é apenas soma_parcelas × 10^k (artefato de escala).
	let escalaExata = 0;
	const desviosK: Record<string, number> = {};
	for (const d of comP) {
		const k = Math.log10(d.cp / d.somaParcelas);
		const kRound = Math.round(k);
		// "exato" = a razão bate com 10^k a menos de 1% (tolerância de arredondamento)
		const previsto = d.somaParcelas * Math.pow(10, kRound);
		const erro = Math.abs(d.cp - previsto) / d.cp;
		if (erro < 0.01) {
			escalaExata++;
			desviosK[String(kRound)] = (desviosK[String(kRound)] ?? 0) + 1;
		}
	}
	console.log('\n===== contrapartida = soma_parcelas × 10^k ? =====');
	console.log(
		`  Batem com algum 10^k (<1% erro): ${escalaExata}/${comP.length} (${Math.round(
			(escalaExata / comP.length) * 100,
		)}%)`,
	);
	console.log('  Distribuição do expoente k:', JSON.stringify(desviosK));

	// Heurística de implausibilidade: contrapartida >> arrecadação real do processo
	// (quando há parcelas) sugere valor inflado por erro de casas decimais.
	const comParcelas = dados.filter((d) => d.somaParcelas > 0);
	const discrepantes = comParcelas.filter((d) => d.cp > d.somaParcelas * 100);
	console.log(
		`\nProcessos com parcelas: ${comParcelas.length} | contrapartida > 100x a soma das parcelas: ${discrepantes.length}`,
	);
	for (const d of discrepantes.slice(0, 10)) {
		const razao = Math.round(d.cp / d.somaParcelas);
		console.log(`  ${d.tipo} ${d.num}: cp=${brl(d.cp)} vs parcelas=${brl(d.somaParcelas)} (${razao}x)`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});

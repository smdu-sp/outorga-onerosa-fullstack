/**
 * Importa processos novos a partir da camada outorga_onerosa do GeoSampa WFS.
 * Processos que já existem no banco são ignorados (não sobrescreve nem complementa).
 *
 * Uso:
 *   npx tsx prisma/sync-geosampa-outorga.ts --dry-run --limit 10
 *   npm run db:sync-geosampa
 */
import { sincronizarOutorgaDoGeoSampa } from '@/lib/server/sync-geosampa-outorga';

function parseArgs() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const readFlagNumber = (flag: string) => {
		const idx = args.indexOf(flag);
		if (idx === -1) return undefined;
		const raw = args[idx + 1];
		if (!raw || raw.startsWith('--')) return undefined;
		const n = Number.parseInt(raw, 10);
		return Number.isFinite(n) ? n : undefined;
	};
	// Aceita também: tsx prisma/sync-geosampa-outorga.ts 10
	const positional = args.find((a) => /^\d+$/.test(a));
	return {
		dryRun,
		limit: readFlagNumber('--limit') ?? (positional ? Number(positional) : undefined),
		pageSize: readFlagNumber('--page-size'),
	};
}

async function main() {
	const opts = parseArgs();

	const stats = await sincronizarOutorgaDoGeoSampa({
		...opts,
		onProgress: (msg) => console.log(msg),
	});

	console.log('\n--- Resultado ---');
	console.log(`Total no WFS:             ${stats.totalWfs}`);
	console.log(`Processos criados:        ${stats.processosCriados}`);
	console.log(`Ignorados (já existem):   ${stats.ignoradosJaExistem}`);
	console.log(`Ignorados (sem processo): ${stats.ignoradosSemProcesso}`);
	console.log(`Erros:                    ${stats.erros}`);
}

main()
	.catch((error) => {
		console.error('Falha no sync GeoSampa:', error);
		process.exit(1);
	})
	.finally(async () => {
		const { prisma } = await import('@/lib/prisma');
		await prisma.$disconnect();
	});

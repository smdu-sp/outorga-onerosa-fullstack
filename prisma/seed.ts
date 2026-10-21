import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { arquivoExportadoExiste, importarDadosExportados } from './seed/importar-exportado';

const prisma = new PrismaClient();

async function main() {
	console.log('=== Seed Outorga Onerosa ===');

	if (!arquivoExportadoExiste()) {
		throw new Error(
			'Arquivo prisma/seed/dados-exportados.json não encontrado.\n\n' +
				'Na máquina com o banco dev populado:\n' +
				'  npm run db:export-seed\n\n' +
				'Copie o arquivo gerado para o projeto e execute:\n' +
				'  npm run db:migrate\n' +
				'  npm run db:seed',
		);
	}

	await importarDadosExportados(prisma);

	// Total de contrapartida = soma das parcelas (fonte de verdade): recalcula após o import
	// porque o snapshot pode ter sido exportado antes do último backfill.
	console.log('\nRecalculando totais a partir das parcelas...');
	execFileSync('npx', ['tsx', path.join(__dirname, 'backfill-totais.ts')], {
		stdio: 'inherit',
		shell: true,
	});

	const [usuarios, permissoes, grupos, processos, parcelas, sqls, consultas] = await Promise.all([
		prisma.usuario.count(),
		prisma.permissao.count(),
		prisma.grupoPermissao.count(),
		prisma.processo.count(),
		prisma.parcela.count(),
		prisma.sql.count(),
		prisma.consultaDadosFaltantes.count(),
	]);

	console.log('\n=== Resumo final do seed ===');
	console.log({ usuarios, permissoes, grupos, processos, parcelas, sqls, consultas });
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

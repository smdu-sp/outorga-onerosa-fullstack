import { PrismaClient } from '@prisma/client';
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

	const [usuarios, permissoes, grupos, processos, parcelas] = await Promise.all([
		prisma.usuario.count(),
		prisma.permissao.count(),
		prisma.grupoPermissao.count(),
		prisma.processo.count(),
		prisma.parcela.count(),
	]);

	console.log('\n=== Resumo final do seed ===');
	console.log({ usuarios, permissoes, grupos, processos, parcelas });
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

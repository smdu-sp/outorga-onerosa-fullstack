import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const devUser = {
	login: 'd854440',
	nome: 'Bruno Luiz Vieira',
	email: 'blvieira@prefeitura.sp.gov.br',
	status: 1,
	permissao: 'DEV' as const,
};

async function main() {
	const usuario = await prisma.usuario.upsert({
		where: { login: devUser.login },
		update: {
			nome: devUser.nome,
			email: devUser.email,
			status: Boolean(devUser.status),
			dev: devUser.permissao === 'DEV',
		},
		create: {
			login: devUser.login,
			nome: devUser.nome,
			email: devUser.email,
			status: Boolean(devUser.status),
			dev: devUser.permissao === 'DEV',
		},
	});

	console.log(`Usuário dev ${usuario.login} criado/atualizado (dev=${usuario.dev}).`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

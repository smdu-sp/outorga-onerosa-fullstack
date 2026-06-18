import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { ICreatePermissao, IUpdatePermissao } from '@/types/permissao';

export async function criarPermissao(createPermissaoDto: ICreatePermissao) {
	const { nome, permissao, grupos } = createPermissaoDto;
	if (!nome) throw new Error('O nome da permissão deve ser informado.');
	if (!permissao) throw new Error('A permissão deve ser informada.');
	const valida = await prisma.permissao.findUnique({ where: { permissao } });
	if (valida) throw new Error('Essa permissão já está cadastrada.');

	return prisma.permissao.create({
		data: {
			nome,
			permissao,
			grupos: grupos?.length ? { connect: grupos.map((id) => ({ id })) } : {},
		},
	});
}

export async function listaCompletaPermissoes() {
	const lista = await prisma.permissao.findMany({ orderBy: { nome: 'asc' } });
	if (!lista.length) throw new Error('Nenhuma permissão encontrada.');
	return lista;
}

export async function buscarTodasPermissoes(pagina = 1, limite = 10, busca?: string) {
	[pagina, limite] = verificaPagina(pagina, limite);
	const searchParams = busca ? { OR: [{ nome: { contains: busca } }] } : {};
	const total = await prisma.permissao.count({ where: searchParams });
	if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };
	[pagina, limite] = verificaLimite(pagina, limite, total);

	const data = await prisma.permissao.findMany({
		where: searchParams,
		orderBy: { nome: 'asc' },
		include: { grupos: true },
		skip: (pagina - 1) * limite,
		take: limite,
	});

	return { total, pagina, limite, data };
}

export async function atualizarPermissao(id: string, updatePermissaoDto: IUpdatePermissao) {
	const { nome, permissao, grupos } = updatePermissaoDto;
	if (permissao) {
		const valida = await prisma.permissao.findUnique({ where: { permissao } });
		if (valida && valida.id !== id) throw new Error('Essa permissão já está cadastrada.');
	}
	return prisma.permissao.update({
		where: { id },
		data: {
			...(nome && { nome }),
			...(permissao && { permissao }),
			...(grupos && grupos.length >= 0 && {
				grupos: { set: [], connect: grupos.map((gid) => ({ id: gid })) },
			}),
		},
	});
}

export async function excluirPermissao(id: string) {
	await prisma.permissao.delete({ where: { id } });
	return { desativado: true };
}

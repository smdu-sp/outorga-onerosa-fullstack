import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { ICreateGrupoPermissao, IUpdateGrupoPermissao } from '@/types/grupo-permissao';

export async function criarGrupoPermissao(dto: ICreateGrupoPermissao) {
	const { nome, permissoes } = dto;
	if (!nome) throw new Error('O nome do grupo de permissão deve ser informado.');
	const valida = await prisma.grupoPermissao.findUnique({ where: { nome } });
	if (valida) throw new Error('Esse grupo de permissão já está cadastrado.');

	return prisma.grupoPermissao.create({
		include: { permissoes: true },
		data: {
			nome,
			permissoes: permissoes?.length
				? { connect: permissoes.map((id) => ({ id })) }
				: {},
		},
	});
}

export async function listaCompletaGrupos() {
	const grupos = await prisma.grupoPermissao.findMany({ orderBy: { nome: 'asc' } });
	if (!grupos.length) throw new Error('Nenhum grupo de permissão encontrado.');
	return grupos;
}

export async function buscarTodosGrupos(pagina = 1, limite = 10, busca?: string) {
	[pagina, limite] = verificaPagina(pagina, limite);
	const searchParams = busca ? { OR: [{ nome: { contains: busca } }] } : {};
	const total = await prisma.grupoPermissao.count({ where: searchParams });
	if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };
	[pagina, limite] = verificaLimite(pagina, limite, total);

	const data = await prisma.grupoPermissao.findMany({
		where: searchParams,
		orderBy: { nome: 'asc' },
		include: { permissoes: true },
		skip: (pagina - 1) * limite,
		take: limite,
	});

	return { total, pagina, limite, data };
}

export async function buscarGrupoPorId(id: string) {
	const grupo = await prisma.grupoPermissao.findUnique({
		where: { id },
		include: { permissoes: true },
	});
	if (!grupo) throw new Error('Grupo de permissão não encontrado.');
	return grupo;
}

export async function atualizarGrupoPermissao(id: string, dto: IUpdateGrupoPermissao) {
	const { nome, permissoes } = dto;
	if (nome) {
		const valida = await prisma.grupoPermissao.findUnique({ where: { nome } });
		if (valida && valida.id !== id) throw new Error('Esse grupo de permissão já está cadastrado.');
	}
	return prisma.grupoPermissao.update({
		where: { id },
		data: {
			...(nome && { nome }),
			...(permissoes && permissoes.length >= 0 && {
				permissoes: { set: [], connect: permissoes.map((pid) => ({ id: pid })) },
			}),
		},
	});
}

export async function excluirGrupoPermissao(id: string) {
	await prisma.grupoPermissao.delete({ where: { id } });
	return { desativado: true };
}

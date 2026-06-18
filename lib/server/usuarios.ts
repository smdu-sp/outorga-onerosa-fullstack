import { prisma } from '@/lib/prisma';
import { verificaLimite, verificaPagina } from '@/lib/pagination';
import { buscarUsuarioLDAP } from '@/lib/auth/ldap';
import { ICreateUsuario, IUpdateUsuario } from '@/types/usuario';

export async function usuarioPermitido(id: string, permissao: string) {
	if (!id || !permissao) return false;
	const usuario = await prisma.usuario.findUnique({
		where: {
			id,
			OR: [
				{ permissoes: { some: { permissao } } },
				{ grupos: { some: { permissoes: { some: { permissao } } } } },
				{ dev: true },
			],
		},
		select: { id: true },
	});
	return !!usuario;
}

export async function listaCompletaUsuarios() {
	const lista = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
	if (!lista.length) throw new Error('Nenhum usuário encontrado.');
	return lista;
}

export async function criarUsuario(createUsuarioDto: ICreateUsuario) {
	const { grupos, permissoes, ...dados } = createUsuarioDto;
	const loguser = await prisma.usuario.findUnique({ where: { login: dados.login } });
	if (loguser) throw new Error('Login já cadastrado.');
	const emailuser = await prisma.usuario.findUnique({ where: { email: dados.email } });
	if (emailuser) throw new Error('Email já cadastrado.');

	return prisma.usuario.create({
		data: {
			...dados,
			grupos: grupos?.length ? { connect: grupos.map((id) => ({ id })) } : {},
			permissoes: permissoes?.length ? { connect: permissoes.map((id) => ({ id })) } : {},
		},
		include: { grupos: true, permissoes: true },
	});
}

export async function buscarTodosUsuarios(
	pagina = 1,
	limite = 10,
	busca?: string,
) {
	[pagina, limite] = verificaPagina(pagina, limite);
	const searchParams = busca
		? {
				OR: [
					{ nome: { contains: busca } },
					{ login: { contains: busca } },
					{ email: { contains: busca } },
				],
			}
		: {};

	const total = await prisma.usuario.count({ where: searchParams });
	if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };

	[pagina, limite] = verificaLimite(pagina, limite, total);

	const data = await prisma.usuario.findMany({
		where: searchParams,
		include: { grupos: true, permissoes: true },
		orderBy: { nome: 'asc' },
		skip: (pagina - 1) * limite,
		take: limite,
	});

	return { total, pagina, limite, data };
}

export async function buscarUsuarioPorId(id: string) {
	return prisma.usuario.findUnique({
		where: { id },
		include: { grupos: true, permissoes: true },
	});
}

export async function atualizarUsuario(id: string, updateUsuarioDto: IUpdateUsuario) {
	const { grupos, permissoes, ...dados } = updateUsuarioDto;
	return prisma.usuario.update({
		data: {
			...dados,
			...(grupos && grupos.length >= 0 && {
				grupos: { set: [], connect: grupos.map((gid) => ({ id: gid })) },
			}),
			...(permissoes && permissoes.length >= 0 && {
				permissoes: { set: [], connect: permissoes.map((pid) => ({ id: pid })) },
			}),
		},
		where: { id },
		include: { grupos: true, permissoes: true },
	});
}

export async function desativarUsuario(id: string) {
	await prisma.usuario.update({ data: { status: false }, where: { id } });
	return { desativado: true };
}

export async function autorizarUsuario(id: string) {
	const autorizado = await prisma.usuario.update({
		where: { id },
		data: { status: true },
	});
	if (!autorizado.status) throw new Error('Erro ao autorizar o usuário.');
	return { autorizado: true };
}

export async function validaUsuario(id: string) {
	const usuario = await prisma.usuario.findUnique({ where: { id } });
	if (!usuario) throw new Error('Usuário não encontrado.');
	if (!usuario.status) throw new Error('Usuário inativo.');
	return usuario;
}

export async function buscarNovoUsuario(login: string) {
	const usuarioExiste = await prisma.usuario.findUnique({ where: { login } });
	if (usuarioExiste?.status) throw new Error('Login já cadastrado.');
	if (usuarioExiste && !usuarioExiste.status) {
		return prisma.usuario.update({
			where: { id: usuarioExiste.id },
			data: { status: true },
		});
	}

	const ldapUser = await buscarUsuarioLDAP(login);
	if (!ldapUser?.nome || !ldapUser.email) throw new Error('Usuário não encontrado.');
	return { login, nome: ldapUser.nome, email: ldapUser.email };
}

export async function buscarPorLogin(login: string) {
	return prisma.usuario.findUnique({
		where: { login },
		include: { permissoes: true },
	});
}

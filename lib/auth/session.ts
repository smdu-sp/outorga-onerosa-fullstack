import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';
import { redirect } from 'next/navigation';

/** Sessão válida = JWT com usuário autenticado (mesmo critério em todos os layouts). */
export function sessaoValida(session: Session | null | undefined): session is Session {
	return Boolean(session?.usuario?.sub);
}

export async function requireAuth() {
	const session = await auth();
	if (!sessaoValida(session)) redirect('/login');
	return session;
}

export async function usuarioPermitido(
	userId: string,
	permissao: string,
): Promise<boolean> {
	if (!userId || !permissao) return false;
	const usuario = await prisma.usuario.findUnique({
		where: {
			id: userId,
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

export async function requirePermissao(permissao: string) {
	const session = await requireAuth();
	const permitido = await usuarioPermitido(session.usuario.sub, permissao);
	if (!permitido) {
		throw new Error('Sem permissão para esta operação.');
	}
	return session;
}

/**
 * Gate para módulos só de DEV (ex.: `/dev-calculo-oodc`) — usa o flag real por
 * usuário (`Usuario.dev`), não `NODE_ENV`, então continua valendo em produção.
 */
export async function requireDev() {
	const session = await requireAuth();
	if (!session.usuario.dev) redirect('/');
	return session;
}

/**
 * Garante que o usuário pode acessar um processo específico, em 3 níveis:
 * 1. "processos_ver_todos" (CAP/FUNDURB-GAB/Admin) — libera qualquer processo.
 * 2. "processos_ver_quitados" (DEUSO) — libera só se o processo estiver QUITADO.
 * 3. Criador do processo (Técnico) — libera só o que ele mesmo abriu.
 * Lança erro genérico para não vazar a existência do processo a quem não tem acesso.
 */
export async function garantirAcessoProcesso(
	userId: string,
	processo: { criado_por?: string | null; status_pagamento?: string | null },
) {
	if (await usuarioPermitido(userId, 'processos_ver_todos')) return;
	if (await usuarioPermitido(userId, 'processos_ver_quitados')) {
		if (processo.status_pagamento === 'QUITADO') return;
		throw new Error('Processo não encontrado.');
	}
	if (processo.criado_por && processo.criado_por === userId) return;
	throw new Error('Processo não encontrado.');
}

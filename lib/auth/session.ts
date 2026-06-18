import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';
import { redirect } from 'next/navigation';

/** Sessão válida = JWT com usuário autenticado (mesmo critério em todos os layouts). */
export function sessaoValida(session: Session | null | undefined): boolean {
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

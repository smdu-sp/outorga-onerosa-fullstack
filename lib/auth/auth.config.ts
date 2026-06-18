/** @format */

import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { autenticarLDAP } from '@/lib/auth/ldap';

export default {
	secret: process.env.AUTH_SECRET,
	providers: [
		Credentials({
			name: 'credentials',
			credentials: {
				login: { label: 'Login', type: 'text' },
				senha: { label: 'Senha', type: 'password' },
			},
			type: 'credentials',
			async authorize(credentials) {
				if (!credentials?.login || !credentials?.senha) return null;

				const login = credentials.login as string;
				const senha = credentials.senha as string;
				const isLocal = process.env.ENVIRONMENT === 'local';

				let usuario = await prisma.usuario.findUnique({ where: { login } });

				if (usuario && !usuario.status) return null;

				if (!isLocal) {
					const ldapUser = await autenticarLDAP(login, senha);
					if (!ldapUser) return null;

					if (!usuario) {
						const novo = await prisma.usuario.create({
							data: {
								nome: ldapUser.nome,
								login,
								email: ldapUser.email || `${login}@prefeitura.sp.gov.br`,
								status: false,
							},
						});
						if (novo) return null;
					}

					await prisma.usuario.update({
						where: { id: usuario!.id },
						data: {
							nome: ldapUser.nome || usuario!.nome,
							email: ldapUser.email || usuario!.email,
						},
					});
				} else if (!usuario) {
					return null;
				}

				usuario = usuario ?? (await prisma.usuario.findUnique({ where: { login } }));
				if (!usuario || !usuario.status) return null;

				return {
					sub: usuario.id,
					id: usuario.id,
					login: usuario.login,
					nome: usuario.nome,
					email: usuario.email,
					status: usuario.status ? 1 : 0,
					avatar: usuario.avatar ?? undefined,
					dev: usuario.dev,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (trigger === 'update' && session?.usuario) {
				token.usuario = {
					...(token.usuario as object),
					...(session.usuario as object),
				};
				return token;
			}
			if (user) token.usuario = user;
			return token;
		},
		async session({ session, token }) {
			if (token.usuario) {
				const u = token.usuario as {
					sub: string;
					nome: string;
					login: string;
					email: string;
					status: number;
					avatar?: string;
				};
				const s = session as unknown as {
					usuario: typeof u;
					id: string;
				};
				s.usuario = u;
				s.id = u.sub;
			}
			return session;
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
} satisfies NextAuthConfig;

/** @format */

import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { autenticarLDAP, buscarUsuarioLDAP } from '@/lib/auth/ldap';

export default {
	secret: process.env.AUTH_SECRET,
	// Cookies não são isolados por porta; evite compartilhar sessões com outros portais.
	cookies: {
		sessionToken: { name: 'outorga.session-token', options: {} },
		callbackUrl: { name: 'outorga.callback-url', options: {} },
		csrfToken: { name: 'outorga.csrf-token', options: {} },
	},
	providers: [
		Credentials({
			name: 'credentials',
			credentials: {
				login: { label: 'Login ou e-mail', type: 'text' },
				senha: { label: 'Senha', type: 'password' },
			},
			type: 'credentials',
			async authorize(credentials) {
				if (!credentials?.login || !credentials?.senha) return null;

				const entrada = (credentials.login as string).trim();
				const senha = credentials.senha as string;
				const isLocal = process.env.ENVIRONMENT === 'local';

				// Aceita tanto o login de rede quanto o e-mail cadastrado.
				let usuario = await prisma.usuario.findFirst({
					where: { OR: [{ login: entrada }, { email: entrada }] },
				});

				if (usuario && !usuario.status) return null;

				// O LDAP sempre autentica pelo login de rede real, nunca pelo e-mail
				// digitado — se o usuário já existe localmente, usamos o login dele;
				// senão (primeiro acesso), só sobra o que foi digitado mesmo.
				const login = usuario?.login ?? entrada;

				if (!isLocal) {
					// /autenticar só confirma a senha (não retorna nome/e-mail) — o
					// perfil vem de uma chamada separada a /buscar-por-login.
					const autenticado = await autenticarLDAP(login, senha);
					if (!autenticado) return null;

					const ldapUser = await buscarUsuarioLDAP(login);

					if (!usuario) {
						if (!ldapUser?.nome) return null;
						const novo = await prisma.usuario.create({
							data: {
								nome: ldapUser.nome,
								login,
								email: ldapUser.email || `${login}@prefeitura.sp.gov.br`,
								status: false,
							},
						});
						if (novo) return null;
					} else if (ldapUser) {
						await prisma.usuario.update({
							where: { id: usuario.id },
							data: {
								nome: ldapUser.nome || usuario.nome,
								email: ldapUser.email || usuario.email,
							},
						});
					}
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

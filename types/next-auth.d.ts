import NextAuth from 'next-auth';

declare module 'next-auth' {
	interface Session {
		id: string;
		usuario: {
			sub: string;
			nome: string;
			login: string;
			email: string;
			status: number;
			avatar?: string;
			dev?: boolean;
		};
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		usuario?: Session['usuario'];
	}
}

export {};
export interface LdapUserInfo {
	nome: string;
	email: string;
}

type SmulAuthResponse = {
	nome?: string;
	email?: string;
	login?: string;
	telefone?: string;
};

/** Base da API "SMUL Auth" — proxy centralizado de LDAP (substitui o bind direto via ldapts). */
function apiUrl(): string | null {
	const url = process.env.SMUL_AUTH_API_URL;
	if (!url) {
		console.warn('[smul-auth] SMUL_AUTH_API_URL não configurado.');
		return null;
	}
	return url.replace(/\/+$/, '');
}

export async function autenticarLDAP(
	login: string,
	senha: string,
): Promise<LdapUserInfo | null> {
	const base = apiUrl();
	if (!base) return null;

	try {
		const resp = await fetch(`${base}/auth/ldap/autenticar`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login, senha }),
		});
		if (!resp.ok) return null;

		const data = (await resp.json()) as SmulAuthResponse;
		if (!data?.nome) return null;
		return { nome: data.nome, email: (data.email ?? '').toLowerCase() };
	} catch (err) {
		console.error('[smul-auth] Falha na autenticação:', err);
		return null;
	}
}

export async function buscarUsuarioLDAP(login: string): Promise<LdapUserInfo | null> {
	const base = apiUrl();
	if (!base) return null;

	try {
		const resp = await fetch(
			`${base}/auth/ldap/buscar-por-login/${encodeURIComponent(login)}?secretarias=SMUL`,
		);
		if (!resp.ok) return null;

		const data = (await resp.json()) as SmulAuthResponse;
		if (!data?.nome) return null;
		return { nome: data.nome, email: (data.email ?? '').toLowerCase() };
	} catch (err) {
		console.error('[smul-auth] Falha na busca por login:', err);
		return null;
	}
}

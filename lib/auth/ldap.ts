export interface LdapUserInfo {
	nome: string;
	email: string;
	/** Foto do AD (ex: atributo thumbnailPhoto/jpegPhoto) — ainda não retornada pela API. */
	avatar?: string;
}

type SmulAuthResponse = {
	nome?: string;
	email?: string;
	login?: string;
	telefone?: string;
	avatar?: string;
};

/** /auth/ldap/autenticar só confirma a senha — não retorna nome/e-mail. */
type SmulAutenticarResponse = {
	status?: string;
	message?: string;
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

/** Confirma login+senha no AD. Não retorna dados de perfil — use buscarUsuarioLDAP pra isso. */
export async function autenticarLDAP(login: string, senha: string): Promise<boolean> {
	const base = apiUrl();
	if (!base) return false;

	const url = `${base}/auth/ldap/autenticar`;
	try {
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login, senha }),
		});
		const data = (await resp.json().catch(() => null)) as SmulAutenticarResponse | null;

		if (!resp.ok || data?.status !== 'OK') {
			console.error(
				`[smul-auth] POST ${url} não autenticou (${resp.status} ${resp.statusText}):`,
				data,
			);
			return false;
		}
		return true;
	} catch (err) {
		console.error(`[smul-auth] Falha ao chamar ${url}:`, err);
		return false;
	}
}

export async function buscarUsuarioLDAP(login: string): Promise<LdapUserInfo | null> {
	const base = apiUrl();
	if (!base) return null;

	const url = `${base}/auth/ldap/buscar-por-login/${encodeURIComponent(login)}?secretarias=SMUL`;
	try {
		const resp = await fetch(url);
		if (!resp.ok) {
			console.error(
				`[smul-auth] GET ${url} retornou ${resp.status} ${resp.statusText}:`,
				await resp.text().catch(() => '(sem corpo)'),
			);
			return null;
		}

		const data = (await resp.json()) as SmulAuthResponse;
		if (!data?.nome) {
			console.error(`[smul-auth] GET ${url} ok, mas resposta sem campo "nome":`, data);
			return null;
		}
		return {
			nome: data.nome,
			email: (data.email ?? '').toLowerCase(),
			avatar: data.avatar || undefined,
		};
	} catch (err) {
		console.error(`[smul-auth] Falha ao chamar ${url}:`, err);
		return null;
	}
}

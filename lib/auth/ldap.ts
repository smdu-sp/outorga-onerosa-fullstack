import { Client } from 'ldapts';

export interface LdapUserInfo {
	nome: string;
	email: string;
}

export async function autenticarLDAP(
	login: string,
	senha: string,
): Promise<LdapUserInfo | null> {
	const server = process.env.LDAP_SERVER;
	const domain = process.env.LDAP_DOMAIN;
	const base = process.env.LDAP_BASE;

	if (!server || !domain || !base) {
		console.warn('[ldap] LDAP_SERVER, LDAP_DOMAIN ou LDAP_BASE não configurados.');
		return null;
	}

	const client = new Client({ url: server });
	try {
		await client.bind(`${login}${domain}`, senha);

		const { searchEntries } = await client.search(base, {
			filter: `(&(samaccountname=${login}))`,
			scope: 'sub',
			attributes: ['name', 'mail'],
		});

		await client.unbind();
		if (!searchEntries.length) return { nome: login, email: '' };

		const { name, mail } = searchEntries[0];
		return {
			nome: (name as string) ?? login,
			email: ((mail as string) ?? '').toLowerCase(),
		};
	} catch (err) {
		try {
			await client.unbind();
		} catch {
			/* silencia */
		}
		console.error('[ldap] Falha na autenticação:', err);
		return null;
	}
}

export async function buscarUsuarioLDAP(login: string): Promise<LdapUserInfo | null> {
	const server = process.env.LDAP_SERVER;
	const domain = process.env.LDAP_DOMAIN;
	const base = process.env.LDAP_BASE;
	const userLdap = process.env.USER_LDAP;
	const passLdap = process.env.PASS_LDAP;

	if (!server || !domain || !base || !userLdap || !passLdap) return null;

	const client = new Client({ url: server });
	try {
		await client.bind(`${userLdap}${domain}`, passLdap);
		const { searchEntries } = await client.search(base, {
			filter: `(&(samaccountname=${login})(company=SMUL))`,
			scope: 'sub',
			attributes: ['name', 'mail'],
		});
		await client.unbind();
		if (!searchEntries.length) return null;
		const { name, mail } = searchEntries[0];
		return {
			nome: name?.toString() ?? login,
			email: mail?.toString().toLowerCase() ?? '',
		};
	} catch {
		try {
			await client.unbind();
		} catch {
			/* silencia */
		}
		return null;
	}
}

import { PrismaClient } from '@prisma/client';

const globalSgu = globalThis as unknown as { prismaSgu?: PrismaClient };

/** Lotação oficial do técnico no SGU, incluindo a sigla da unidade. */
export async function buscarUnidadeTecnico(login: string, nome: string): Promise<string | undefined> {
	const url = process.env.SGU_DATABASE_URL;
	if (!url) throw new Error('Banco SGU não configurado para consultar a divisão do técnico.');
	const prismaSgu = globalSgu.prismaSgu ??= new PrismaClient({ datasourceUrl: url });
	const rf = login.replace(/^[a-z]/i, '');
	// O login municipal usa os seis primeiros dígitos do RF, sem o verificador.
	const prefixoRf = /^\d{6}$/.test(rf) ? `${rf}%` : rf;
	const unidades = await prismaSgu.$queryRaw<{ sigla: string | null; nome: string | null }[]>`
		SELECT DISTINCT u.sigla, COALESCE(u.nome, t.cpnomesetor2) AS nome
		FROM tblUsuarios t
		LEFT JOIN tblUnidades u ON u.uid = t.cpUnid
		WHERE t.cpRF = ${rf} OR t.cpRF LIKE ${prefixoRf} OR t.cpNome = ${nome}
	`;
	if (unidades.length !== 1) {
		throw new Error('Não foi possível identificar uma divisão única para o técnico no SGU.');
	}
	return unidades[0].sigla?.trim() || unidades[0].nome?.trim() || undefined;
}

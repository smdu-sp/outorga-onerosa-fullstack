/**
 * Consulta `dbo.prata_processo` (BI) — campo `sistema` (AprovaDigital, Portal,
 * Sisacoe, SLCe) — e mapeia para `Processo.origem`.
 */

import sql from 'mssql';
import { getBiPool } from './bi-cadastro';

/** Valores brutos de `dbo.prata_processo.sistema`. */
export type SistemaBi = 'AprovaDigital' | 'Portal' | 'Sisacoe' | 'SLCe' | string;

/** Origem canônica no app (espelha `OrigemProcesso` no schema). */
export type OrigemProcessoBi =
	| 'APROVA_DIGITAL'
	| 'SEI'
	| 'SISACOE'
	| 'FISICO'
	| 'PORTAL'
	| 'SLCE';

/**
 * Gera formas candidatas do número do processo para match exato no BI
 * (evita REPLACE em 1M+ linhas, que estoura timeout).
 *
 * Exemplos locais → canônico BI `AAAA.YYYY/NNNNNNN-D`:
 *   `1010-2021/0011738-0` → `1010.2021/0011738-0`
 *   `1010.2019.0002533-4` → `1010.2019/0002533-4`
 *   `1010.2020.000.7948-7` → `1010.2020/0007948-7`
 */
export function candidatosNumProcessoBi(numProcesso: string): string[] {
	const raw = numProcesso.replace(/\s+/g, '').trim();
	if (!raw) return [];

	const out = new Set<string>([raw]);

	// 1010-2021/... → 1010.2021/...
	out.add(raw.replace(/^(\d{4})-(\d{4})\//, '$1.$2/'));

	// 1010.2019.0002533-4 → 1010.2019/0002533-4
	const mPontos = raw.match(/^(\d{4})\.(\d{4})\.(.+)$/);
	if (mPontos && !raw.includes('/')) {
		const rest = mPontos[3]!.replace(/\./g, '');
		const digito = rest.slice(-1);
		const seq = rest.slice(0, -1);
		out.add(`${mPontos[1]}.${mPontos[2]}/${seq}-${digito}`);
		out.add(`${mPontos[1]}.${mPontos[2]}/${seq.padStart(7, '0')}-${digito}`);
	}

	// 1010.2020/0000.462-2 → 1010.2020/0000462-2
	const mSlash = raw.match(/^(\d{4})[.\-](\d{4})\/(.+)$/);
	if (mSlash) {
		const org = mSlash[1]!;
		const year = mSlash[2]!;
		const rest = mSlash[3]!.replace(/\./g, '');
		const digitoMatch = rest.match(/^(\d+)-(\d+)$/);
		if (digitoMatch) {
			const seq = digitoMatch[1]!;
			const digito = digitoMatch[2]!;
			out.add(`${org}.${year}/${seq}-${digito}`);
			out.add(`${org}.${year}/${seq.padStart(7, '0')}-${digito}`);
		}
	}

	// Só dígitos → monta canônico se couber (4+4+seq+dv)
	const digits = raw.replace(/\D/g, '');
	if (digits.length >= 13 && digits.length <= 16) {
		const org = digits.slice(0, 4);
		const year = digits.slice(4, 8);
		const meio = digits.slice(8);
		const digito = meio.slice(-1);
		const seq = meio.slice(0, -1);
		out.add(`${org}.${year}/${seq}-${digito}`);
		out.add(`${org}.${year}/${seq.padStart(7, '0')}-${digito}`);
	}

	return [...out].filter(Boolean);
}

/** Mapeia `sistema` do BI → enum `OrigemProcesso`. */
export function mapearSistemaBiParaOrigem(
	sistema: string | null | undefined,
): OrigemProcessoBi | null {
	if (!sistema?.trim()) return null;
	const s = sistema.trim().toLowerCase();
	if (s === 'aprovadigital' || s.includes('aprova')) return 'APROVA_DIGITAL';
	if (s === 'portal') return 'PORTAL';
	if (s === 'sisacoe') return 'SISACOE';
	if (s === 'slce' || s === 'slc') return 'SLCE';
	if (s === 'sei') return 'SEI';
	if (s.includes('fisic')) return 'FISICO';
	return null;
}

/**
 * Busca `sistema` em `dbo.prata_processo` para uma lista de números locais.
 * Retorna mapa: digits do num_processo local → { processoBi, sistema }.
 */
export async function buscarSistemasNoBiPorProcessos(
	numProcessos: string[],
): Promise<Map<string, { processoBi: string; sistema: string }>> {
	const resultado = new Map<string, { processoBi: string; sistema: string }>();
	if (!numProcessos.length) return resultado;

	const pool = await getBiPool();

	// digits → lista de nums locais (colisão rara)
	const digitsParaLocal = new Map<string, string[]>();
	const candidatoParaDigits = new Map<string, string>(); // candidato BI → digits local

	for (const num of numProcessos) {
		const digits = num.replace(/\D/g, '');
		if (!digits) continue;
		const lista = digitsParaLocal.get(digits) ?? [];
		lista.push(num);
		digitsParaLocal.set(digits, lista);
		for (const c of candidatosNumProcessoBi(num)) {
			candidatoParaDigits.set(c, digits);
		}
	}

	const candidatos = [...candidatoParaDigits.keys()];
	const BATCH = 200;

	for (let i = 0; i < candidatos.length; i += BATCH) {
		const slice = candidatos.slice(i, i + BATCH);
		const req = pool.request();
		const params: string[] = [];
		slice.forEach((c, idx) => {
			const name = `p${idx}`;
			req.input(name, sql.VarChar(50), c);
			params.push(`@${name}`);
		});
		const rows = await req.query<{ processo: string; sistema: string }>(`
			SELECT processo, sistema
			FROM dbo.prata_processo
			WHERE processo IN (${params.join(',')})
				AND sistema IS NOT NULL
				AND LTRIM(RTRIM(sistema)) <> ''
		`);

		for (const row of rows.recordset) {
			const digits = candidatoParaDigits.get(row.processo) ?? row.processo.replace(/\D/g, '');
			if (!resultado.has(digits)) {
				resultado.set(digits, {
					processoBi: row.processo,
					sistema: row.sistema.trim(),
				});
			}
		}
	}

	return resultado;
}

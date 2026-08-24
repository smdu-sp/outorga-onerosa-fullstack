/** @format */

import { redirect } from 'next/navigation';
import { listarAnos } from '@/services/planejamento-orcamentario';

export const dynamic = 'force-dynamic';

export default async function PlanejamentoOrcamentarioRelatorioIndexPage() {
	const resp = await listarAnos();
	const anos = resp.ok && Array.isArray(resp.data) ? (resp.data as number[]) : [];
	const anoAtual = new Date().getFullYear();
	const ano = anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual);
	redirect(`/relatorios/planejamento-orcamentario/${ano}`);
}

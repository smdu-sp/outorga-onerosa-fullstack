/** @format */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Target } from 'lucide-react';
import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import {
	buscarConfiguracaoPlanejamento,
	buscarHistoricoBase,
	buscarPlanejamento,
	buscarRevisoes,
	dentroDoPrazoNormal,
	podeEditarPlanejamento,
} from '@/lib/server/planejamento-orcamentario';
import { FormPlanejamento } from './_components/form-planejamento';

export const dynamic = 'force-dynamic';

export default async function EditarPlanejamentoPage({
	params,
}: {
	params: Promise<{ ano: string }>;
}) {
	const session = await requireAuth();
	const isDev = session.usuario.dev === true;
	const permitido =
		isDev || (await usuarioPermitido(session.usuario.sub, 'planejamento_orcamentario_editar'));
	if (!permitido) redirect('/');

	const { ano: anoParam } = await params;
	const ano = Number(anoParam);
	if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) notFound();

	const [plano, editavel, dentroPrazo, historico, configuracao, revisoes] = await Promise.all([
		buscarPlanejamento(ano),
		podeEditarPlanejamento(ano, isDev),
		dentroDoPrazoNormal(ano),
		buscarHistoricoBase(ano),
		buscarConfiguracaoPlanejamento(),
		buscarRevisoes(ano),
	]);
	// DEV pode editar mesmo fora do prazo normal (editavel via bypass) — nesse caso, a
	// edição conta como "revisão" e precisa de motivo (ver golden rule de auditoria).
	const emRevisao = isDev && !dentroPrazo;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<Link
				href="/admin/planejamento-orcamentario"
				className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
				<ArrowLeft className="h-3.5 w-3.5" />
				Voltar para planejamentos
			</Link>

			<div className="mb-6">
				<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
					<Target className="h-6 w-6 text-primary" />
					Planejamento {ano}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Baseado na arrecadação de {ano - 3}–{ano - 1} + parâmetros de correção.
				</p>
			</div>

			<FormPlanejamento
				ano={ano}
				planoInicial={plano}
				editavel={editavel}
				emRevisao={emRevisao}
				historico={historico}
				isDev={isDev}
				configuracaoInicial={configuracao}
				revisoesIniciais={revisoes}
			/>
		</div>
	);
}

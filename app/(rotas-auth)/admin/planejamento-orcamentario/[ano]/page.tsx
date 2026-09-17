/** @format */

import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth, usuarioPermitido } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/page-shell";
import { GuardedLink } from "@/components/guarded-link";
import {
  buscarConfiguracaoPlanejamento,
  buscarHistoricoBase,
  buscarPlanejamento,
  buscarRevisoes,
  dentroDoPrazoNormal,
  podeEditarPlanejamento,
} from "@/lib/server/planejamento-orcamentario";
import { FormPlanejamento } from "./_components/form-planejamento";
import { BadgeSalvamento, StatusSalvamentoProvider } from "./_components/status-salvamento";

export const dynamic = "force-dynamic";

export default async function EditarPlanejamentoPage({
  params,
}: {
  params: Promise<{ ano: string }>;
}) {
  const session = await requireAuth();
  const isDev = session.usuario.dev === true;
  const permitido =
    isDev ||
    (await usuarioPermitido(
      session.usuario.sub,
      "planejamento_orcamentario_editar",
    ));
  if (!permitido) redirect("/");

  const { ano: anoParam } = await params;
  const ano = Number(anoParam);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) notFound();

  const [plano, editavel, dentroPrazo, historico, configuracao, revisoes] =
    await Promise.all([
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
    <PageShell>
      <StatusSalvamentoProvider>
        <PageHeader
          title={`Planejamento ${ano}`}
          breadcrumb={
            <GuardedLink
              href="/admin/planejamento-orcamentario"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para planejamentos
            </GuardedLink>
          }
          actions={<BadgeSalvamento />}
        />

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
      </StatusSalvamentoProvider>
    </PageShell>
  );
}

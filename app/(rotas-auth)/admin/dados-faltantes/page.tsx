/** @format */

import { redirect } from "next/navigation";
import { requireAuth, usuarioPermitido } from "@/lib/auth/session";
import {
  listarProcessosSeiComProtocoloAd,
  listarProcessosSemCategoriaUso,
} from "@/lib/server/admin-dados-faltantes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, PageShell } from "@/components/page-shell";
import { PainelDadosFaltantes } from "./_components/painel-dados-faltantes";
import { PainelSeiVsBi } from "./_components/painel-sei-vs-bi";

export const dynamic = "force-dynamic";
/** Backfill BI + GeoSampa pode demorar (WFS por processo). */
export const maxDuration = 300;

export default async function AdminDadosFaltantesPage() {
  const session = await requireAuth();
  const permitido =
    session.usuario.dev ||
    (await usuarioPermitido(session.usuario.sub, "processos_ver_todos"));
  if (!permitido) redirect("/");

  const [inicial, seiInicial] = await Promise.all([
    listarProcessosSemCategoriaUso(),
    listarProcessosSeiComProtocoloAd(),
  ]);

  return (
    <PageShell>
      <PageHeader title="Dados faltantes" />

      <Tabs defaultValue="categoria" className="gap-5">
        <TabsList>
          <TabsTrigger value="categoria">
            Categoria faltante ({inicial.length})
          </TabsTrigger>
          <TabsTrigger value="sei-bi">
            Protocolo AD × BI ({seiInicial.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categoria" className="mt-0">
          <PainelDadosFaltantes inicial={inicial} />
        </TabsContent>

        <TabsContent value="sei-bi" className="mt-0">
          <PainelSeiVsBi inicial={seiInicial} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

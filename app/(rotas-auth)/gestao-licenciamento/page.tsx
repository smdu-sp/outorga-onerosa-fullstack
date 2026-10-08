/** @format */

import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList, FolderOpen } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { buscarDashboardLicenciamento } from "@/services/licenciamento/query-functions";
import { DashboardSkeleton } from "@/components/skeleton-blocks";
import {
  PageHeader,
  PageShell,
  SectionCard,
  StatGroup,
} from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";

export default function GestaoLicenciamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const coordenadoria = (params.coordenadoria as string) ?? "TODAS";
  const response = await buscarDashboardLicenciamento(coordenadoria);
  const stats = response.data ?? {
    ativos: 0,
    encerrados: 0,
    sem_tecnico: 0,
    prioritarios: 0,
    por_situacao: [],
    por_coordenadoria: [],
  };

  const cards = [
    {
      label: "Ativos",
      value: stats.ativos,
      href: "/gestao-licenciamento/processos?status=ATIVO",
    },
    {
      label: "Encerrados",
      value: stats.encerrados,
      href: "/gestao-licenciamento/processos?status=ENCERRADO",
    },
    {
      label: "Sem técnico",
      value: stats.sem_tecnico,
      href: "/gestao-licenciamento/processos?status=ATIVO",
    },
    {
      label: "Prioritários",
      value: stats.prioritarios,
      href: "/gestao-licenciamento/processos?status=ATIVO",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Gestão de Processos de Licenciamento"
        actions={
          <Link
            href="/gestao-licenciamento/processos"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted/50"
          >
            <FolderOpen className="size-4" />
            Ver processos
          </Link>
        }
      />

      <StatGroup className="mb-8">
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              href={c.href}
            />
          ))}
        </div>
      </StatGroup>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={ClipboardList} title="Ativos por situação">
          {stats.por_situacao.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum processo cadastrado ainda. Após a migração e o seed,
              importe a planilha piloto ou cadastre processos.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.por_situacao.map((s) => (
                <li
                  key={s.situacao_id ?? s.nome}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{s.nome}</span>
                  <span className="tabular-nums font-medium">{s.total}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Ativos por coordenadoria">
          {stats.por_coordenadoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem distribuição por coordenadoria no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.por_coordenadoria.map((c) => (
                <li
                  key={c.coordenadoria}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{c.coordenadoria}</span>
                  <span className="tabular-nums font-medium">{c.total}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}

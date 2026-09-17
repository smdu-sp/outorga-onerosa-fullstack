/** @format */

import Link from 'next/link';
import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/session';
import { buscarTudoLicenciamento } from '@/services/licenciamento/query-functions';
import { ListaSkeleton } from '@/components/skeleton-blocks';
import { PageHeader, PageShell } from '@/components/page-shell';
import { FiltrosListaLicenciamento } from './_components/filtros-lista';

export default function ProcessosLicenciamentoPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<ListaSkeleton />}>
			<Lista searchParams={searchParams} />
		</Suspense>
	);
}

async function Lista({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	await requireAuth();
	const params = await searchParams;
	const pagina = +(params.pagina ?? 1);
	const limite = +(params.limite ?? 10);
	const busca = (params.busca as string) ?? '';
	const coordenadoria = (params.coordenadoria as string) ?? 'TODAS';
	const status = (params.status as string) ?? 'ATIVO';

	const response = await buscarTudoLicenciamento(
		pagina,
		limite,
		busca,
		coordenadoria,
		status,
	);
	const data = response.data;
	const processos = (data?.data ?? []) as Array<Record<string, unknown>>;

	return (
		<PageShell>
			<PageHeader
				title={
					<span className="flex flex-wrap items-baseline gap-2">
						<Link
							href="/gestao-licenciamento"
							className="text-sm font-normal text-muted-foreground no-underline hover:text-foreground">
							Gestão de Licenciamento
						</Link>
						<span className="text-sm font-normal text-muted-foreground/40">/</span>
						<span>Processos</span>
					</span>
				}
			/>

			<FiltrosListaLicenciamento
				busca={busca}
				coordenadoria={coordenadoria}
				status={status}
			/>

			<div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="bg-primary">
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Processo</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Coord.</th>
							<th className="hidden whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground md:table-cell">Assunto</th>
							<th className="hidden whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground lg:table-cell">Interessado</th>
							<th className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground">Situação</th>
							<th className="hidden whitespace-nowrap px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-primary-foreground sm:table-cell">Técnico</th>
						</tr>
					</thead>
					<tbody>
						{processos.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
									Nenhum processo encontrado.
								</td>
							</tr>
						) : (
							processos.map((p) => {
								const id = String(p.id);
								const interessados = p.interessados as Array<{ nome?: string }> | undefined;
								const assunto = p.assunto as { nome?: string } | null;
								const situacao = p.situacao as { nome?: string } | null;
								const tecnico = p.tecnico_atual as { nome?: string } | null;
								return (
									<tr key={id} className="border-t border-border transition-colors hover:bg-primary-soft">
										<td className="px-4 py-3">
											<Link
												href={`/gestao-licenciamento/processos/${id}`}
												className="font-medium text-foreground hover:underline">
												{String(p.num_processo)}
											</Link>
											{p.protocolo ? (
												<p className="text-xs text-muted-foreground">
													{String(p.protocolo)}
												</p>
											) : null}
										</td>
										<td className="px-4 py-3">{String(p.coordenadoria)}</td>
										<td className="hidden px-4 py-3 md:table-cell">
											{assunto?.nome ?? '—'}
										</td>
										<td className="hidden max-w-[220px] truncate px-4 py-3 lg:table-cell">
											{interessados?.[0]?.nome ?? '—'}
										</td>
										<td className="px-4 py-3">{situacao?.nome ?? '—'}</td>
										<td className="hidden px-4 py-3 sm:table-cell">
											{tecnico?.nome ?? '—'}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</PageShell>
	);
}

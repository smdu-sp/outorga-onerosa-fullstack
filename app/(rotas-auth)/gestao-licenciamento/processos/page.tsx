/** @format */

import Link from 'next/link';
import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/session';
import { buscarTudoLicenciamento } from '@/services/licenciamento/query-functions';
import { TableSkeleton } from '@/components/data-table';
import { FiltrosListaLicenciamento } from './_components/filtros-lista';

export default function ProcessosLicenciamentoPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return (
		<Suspense fallback={<TableSkeleton />}>
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
	const total = data?.total ?? 0;

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-sm text-muted-foreground">
						<Link href="/gestao-licenciamento" className="hover:underline">
							Gestão de Licenciamento
						</Link>
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">Processos</h1>
				</div>
				<p className="text-sm text-muted-foreground tabular-nums">{total} registro(s)</p>
			</div>

			<FiltrosListaLicenciamento
				busca={busca}
				coordenadoria={coordenadoria}
				status={status}
			/>

			<div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Processo</th>
							<th className="px-4 py-3 font-medium">Coord.</th>
							<th className="hidden px-4 py-3 font-medium md:table-cell">Assunto</th>
							<th className="hidden px-4 py-3 font-medium lg:table-cell">Interessado</th>
							<th className="px-4 py-3 font-medium">Situação</th>
							<th className="hidden px-4 py-3 font-medium sm:table-cell">Técnico</th>
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
									<tr key={id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
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
		</div>
	);
}

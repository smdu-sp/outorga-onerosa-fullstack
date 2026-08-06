/** @format */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { buscarDetalheLicenciamento } from '@/services/licenciamento/query-functions';

function fmtData(v: unknown) {
	if (!v || typeof v !== 'string') return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('pt-BR');
}

export default async function DetalheLicenciamentoPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requireAuth();
	const { id } = await params;
	const response = await buscarDetalheLicenciamento(id);
	if (!response.ok || !response.data) notFound();

	const p = response.data as Record<string, unknown>;
	const assunto = p.assunto as { nome?: string } | null;
	const situacao = p.situacao as { nome?: string } | null;
	const divisao = p.divisao as { codigo?: string; nome?: string } | null;
	const tecnico = p.tecnico_atual as { nome?: string } | null;
	const outorga = p.processo_outorga as {
		id?: string;
		num_processo?: string;
		status_pagamento?: string;
	} | null;
	const imoveis = (p.imoveis as Array<Record<string, unknown>>) ?? [];
	const interessados = (p.interessados as Array<Record<string, unknown>>) ?? [];
	const eventos = (p.eventos as Array<Record<string, unknown>>) ?? [];
	const incidencias = (p.incidencias as Array<Record<string, unknown>>) ?? [];
	const categorias = (p.categorias as Array<{ categoria?: { nome?: string } }>) ?? [];
	const oficios = (p.oficios as Array<Record<string, unknown>>) ?? [];

	return (
		<div className="mx-auto w-full max-w-[1100px] px-4 py-7 pb-[60px] sm:px-8">
			<p className="text-sm text-muted-foreground">
				<Link href="/gestao-licenciamento/processos" className="hover:underline">
					Processos
				</Link>
				<span className="mx-1.5">/</span>
				{String(p.num_processo)}
			</p>

			<header className="mt-2 mb-8 rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-xs">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{String(p.num_processo)}</h1>
						<p className="mt-1 text-muted-foreground">
							{assunto?.nome ?? 'Sem assunto'}
						</p>
					</div>
					<div className="flex flex-wrap gap-2 text-xs">
						<span className="rounded-full border border-border px-2.5 py-1">
							{String(p.coordenadoria)}
						</span>
						<span className="rounded-full border border-border px-2.5 py-1">
							{String(p.status_ciclo)}
						</span>
						{p.tipo_sistema ? (
							<span className="rounded-full border border-border px-2.5 py-1">
								{String(p.tipo_sistema)}
							</span>
						) : null}
						{p.prioritario ? (
							<span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-800">
								Prioritário
							</span>
						) : null}
					</div>
				</div>

				<dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
					<div>
						<dt className="text-muted-foreground">Situação</dt>
						<dd className="font-medium">{situacao?.nome ?? '—'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Técnico</dt>
						<dd className="font-medium">{tecnico?.nome ?? '—'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Divisão</dt>
						<dd className="font-medium">{divisao?.codigo ?? divisao?.nome ?? '—'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Protocolo</dt>
						<dd className="font-medium">{p.protocolo ? String(p.protocolo) : '—'}</dd>
					</div>
				</dl>

				{outorga?.id ? (
					<p className="mt-4 text-sm">
						Outorga vinculada:{' '}
						<Link
							href={`/processos/${outorga.id}`}
							className="font-medium underline underline-offset-2">
							{outorga.num_processo} ({outorga.status_pagamento})
						</Link>
					</p>
				) : (
					<p className="mt-4 text-sm text-muted-foreground">Sem vínculo com Outorga.</p>
				)}
			</header>

			<div className="grid gap-6 lg:grid-cols-2">
				<Secao titulo="Imóveis / SQLs">
					{imoveis.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nenhum imóvel.</p>
					) : (
						<ul className="space-y-3 text-sm">
							{imoveis.map((i) => (
								<li key={String(i.id)} className="rounded-lg border border-border/60 px-3 py-2">
									<p className="font-medium">
										{String(i.identificador ?? '—')}{' '}
										<span className="text-xs font-normal text-muted-foreground">
											({String(i.tipo)})
										</span>
									</p>
									{i.logradouro ? (
										<p className="text-muted-foreground">{String(i.logradouro)}</p>
									) : null}
								</li>
							))}
						</ul>
					)}
				</Secao>

				<Secao titulo="Interessados">
					{interessados.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nenhum interessado.</p>
					) : (
						<ul className="space-y-2 text-sm">
							{interessados.map((i) => (
								<li key={String(i.id)}>
									<span className="font-medium">{String(i.nome)}</span>
									<span className="ml-2 text-xs text-muted-foreground">
										{String(i.tipo_vinculo)}
									</span>
								</li>
							))}
						</ul>
					)}
				</Secao>

				<Secao titulo="Incidências">
					{incidencias.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nenhuma incidência.</p>
					) : (
						<ul className="space-y-1 text-sm">
							{incidencias.map((i) => (
								<li key={String(i.id)} className="flex justify-between gap-2">
									<span>{String(i.tipo)}</span>
									<span className="tabular-nums text-muted-foreground">
										{i.flag ? 'Sim' : 'Não'}
										{i.valor ? ` · ${String(i.valor)}` : ''}
									</span>
								</li>
							))}
						</ul>
					)}
				</Secao>

				<Secao titulo="Categorias">
					{categorias.length === 0 ? (
						<p className="text-sm text-muted-foreground">Sem categorias de monitoramento.</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{categorias.map((c, idx) => (
								<span
									key={idx}
									className="rounded-full border border-border px-2.5 py-1 text-xs">
									{c.categoria?.nome ?? '—'}
								</span>
							))}
						</div>
					)}
				</Secao>
			</div>

			<Secao titulo="Eventos" className="mt-6">
				{eventos.length === 0 ? (
					<p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
				) : (
					<ol className="relative space-y-4 border-l border-border pl-5">
						{eventos.map((e) => {
							const tipo = e.tipo_evento as { nome?: string } | null;
							const tec = e.tecnico as { nome?: string } | null;
							return (
								<li key={String(e.id)} className="relative text-sm">
									<span className="absolute -left-[1.41rem] top-1.5 size-2.5 rounded-full bg-foreground/70" />
									<p className="font-medium">
										{fmtData(e.data_inicio)} — {tipo?.nome ?? String(e.categoria)}
									</p>
									<p className="text-muted-foreground">
										{tec?.nome ?? 'Sem técnico'}
										{e.data_termino ? ` · término ${fmtData(e.data_termino)}` : ''}
									</p>
									{e.descricao ? <p className="mt-1">{String(e.descricao)}</p> : null}
								</li>
							);
						})}
					</ol>
				)}
			</Secao>

			<Secao titulo="Ofícios" className="mt-6">
				{oficios.length === 0 ? (
					<p className="text-sm text-muted-foreground">Nenhum ofício.</p>
				) : (
					<ul className="space-y-2 text-sm">
						{oficios.map((o) => (
							<li key={String(o.id)} className="flex flex-wrap justify-between gap-2">
								<span className="font-medium">{String(o.numero)}</span>
								<span className="text-muted-foreground">
									{o.interessado_nome ? String(o.interessado_nome) : '—'}
								</span>
							</li>
						))}
					</ul>
				)}
			</Secao>

			{(p.observacao || p.data_autuacao) && (
				<Secao titulo="Observações / datas" className="mt-6">
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-muted-foreground">Autuação</dt>
							<dd>{fmtData(p.data_autuacao)}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Última dist. técnico</dt>
							<dd>{fmtData(p.data_ult_dist_tecnico)}</dd>
						</div>
						{p.observacao ? (
							<div className="sm:col-span-2">
								<dt className="text-muted-foreground">Observação</dt>
								<dd className="whitespace-pre-wrap">{String(p.observacao)}</dd>
							</div>
						) : null}
					</dl>
				</Secao>
			)}
		</div>
	);
}

function Secao({
	titulo,
	children,
	className = '',
}: {
	titulo: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section className={`rounded-2xl border border-border/70 bg-card p-5 shadow-xs ${className}`}>
			<h2 className="mb-3 font-semibold">{titulo}</h2>
			{children}
		</section>
	);
}

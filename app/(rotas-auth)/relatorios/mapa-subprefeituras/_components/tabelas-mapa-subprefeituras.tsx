'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
} from '@/components/ui/pagination';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { IRelatorioSubprefeituraDetalhe } from '@/types/relatorio';

const fmtBrl = (v: number) =>
	v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const LIMITES = [10, 20, 50];

type LinhaProcesso = {
	id: string;
	num: string;
	interessado: string;
	subprefeitura: string;
	valBrl: number;
};

interface TabelasMapaSubprefeiturasProps {
	subprefeituras: IRelatorioSubprefeituraDetalhe[];
	periodoLabel: string;
	selecionado: string | null;
	onSelecionarSubprefeitura: (chave: string | null) => void;
}

export function TabelasMapaSubprefeituras({
	subprefeituras,
	periodoLabel,
	selecionado,
	onSelecionarSubprefeitura,
}: TabelasMapaSubprefeiturasProps) {
	const [aba, setAba] = useState<'subprefeituras' | 'processos'>('subprefeituras');
	const [pagina, setPagina] = useState(1);
	const [limite, setLimite] = useState(10);

	const subAtiva = useMemo(
		() => subprefeituras.find((s) => s.chave === selecionado) ?? null,
		[subprefeituras, selecionado],
	);

	const linhasProcessos = useMemo<LinhaProcesso[]>(() => {
		const fonte = subAtiva ? [subAtiva] : subprefeituras;
		return fonte
			.flatMap((s) =>
				s.processos.map((p) => ({
					id: p.id,
					num: p.num,
					interessado: p.interessado,
					subprefeitura: s.nome,
					valBrl: p.valBrl,
				})),
			)
			.sort((a, b) => b.valBrl - a.valBrl);
	}, [subprefeituras, subAtiva]);

	const totalPaginas = Math.max(1, Math.ceil(linhasProcessos.length / limite));
	const paginaAtual = Math.min(pagina, totalPaginas);
	const inicio = (paginaAtual - 1) * limite;
	const processosPagina = linhasProcessos.slice(inicio, inicio + limite);

	useEffect(() => {
		setPagina(1);
	}, [selecionado, limite]);

	const filtroLabel = subAtiva ? ` em ${subAtiva.nome}` : '';

	return (
		<div className="rounded-xl border border-border bg-card shadow-xs">
			<div className="border-b border-border px-5 py-4">
				<h2 className="text-sm font-semibold">Detalhamento · {periodoLabel}</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Valores pela data de pagamento (quitação ou antecipação), não pelo vencimento
				</p>
			</div>

			<Tabs
				value={aba}
				onValueChange={(v) => setAba(v as 'subprefeituras' | 'processos')}
				className="gap-0">
				<div className="border-b border-border px-5 py-3">
					<TabsList>
						<TabsTrigger value="subprefeituras">Subprefeituras</TabsTrigger>
						<TabsTrigger value="processos">
							Processos
							{linhasProcessos.length > 0 && (
								<span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal">
									{linhasProcessos.length}
								</span>
							)}
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="subprefeituras" className="mt-0">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[480px] text-left text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
									<th className="w-10 px-5 py-3 font-semibold">#</th>
									<th className="px-5 py-3 font-semibold">Subprefeitura</th>
									<th className="px-5 py-3 text-right font-semibold">Processos</th>
									<th className="px-5 py-3 text-right font-semibold">Arrecadado</th>
								</tr>
							</thead>
							<tbody>
								{subprefeituras.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
											Nenhuma subprefeitura com arrecadação no período.
										</td>
									</tr>
								) : (
									subprefeituras.map((s, i) => {
										const ativo = selecionado === s.chave;
										return (
											<tr
												key={s.chave}
												className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30 ${
													ativo ? 'bg-primary/5' : ''
												}`}
												onClick={() => onSelecionarSubprefeitura(ativo ? null : s.chave)}>
												<td className="px-5 py-3 font-mono text-xs text-muted-foreground">
													{i + 1}
												</td>
												<td className="px-5 py-3 font-medium">
													{s.nome}
													{ativo && (
														<span className="ml-2 text-[10px] font-normal text-primary">
															selecionado
														</span>
													)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums">{s.proc}</td>
												<td className="px-5 py-3 text-right font-mono text-xs font-semibold tabular-nums">
													{fmtBrl(s.valBrl)}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</TabsContent>

				<TabsContent value="processos" className="mt-0">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[560px] text-left text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
									<th className="px-5 py-3 font-semibold">Processo</th>
									<th className="px-5 py-3 font-semibold">Interessado</th>
									{!subAtiva && (
										<th className="px-5 py-3 font-semibold">Subprefeitura</th>
									)}
									<th className="px-5 py-3 text-right font-semibold">Arrecadado</th>
								</tr>
							</thead>
							<tbody>
								{processosPagina.length === 0 ? (
									<tr>
										<td
											colSpan={subAtiva ? 3 : 4}
											className="px-5 py-8 text-center text-muted-foreground">
											Nenhum processo encontrado{filtroLabel}.
										</td>
									</tr>
								) : (
									processosPagina.map((p) => (
										<tr key={p.id} className="border-b border-border/60 hover:bg-muted/30">
											<td className="px-5 py-3 font-mono text-xs">
												<Link
													href={`/processos/${p.id}`}
													className="text-primary hover:underline">
													{p.num}
												</Link>
											</td>
											<td className="px-5 py-3">{p.interessado}</td>
											{!subAtiva && (
												<td className="px-5 py-3 text-muted-foreground">{p.subprefeitura}</td>
											)}
											<td className="px-5 py-3 text-right font-mono text-xs font-semibold tabular-nums">
												{fmtBrl(p.valBrl)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{linhasProcessos.length > 0 && (
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
							<p className="text-xs text-muted-foreground">
								{inicio + 1} a {Math.min(inicio + limite, linhasProcessos.length)} de{' '}
								{linhasProcessos.length}
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<Select
									value={String(limite)}
									onValueChange={(v) => setLimite(Number(v))}>
									<SelectTrigger className="h-8 w-[110px] text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{LIMITES.map((n) => (
											<SelectItem key={n} value={String(n)}>
												{n} por página
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Pagination className="mx-0 w-auto">
									<PaginationContent>
										<PaginationItem>
											<PaginationLink
												onClick={() => setPagina((p) => Math.max(1, p - 1))}
												className={paginaAtual <= 1 ? 'pointer-events-none opacity-40' : ''}>
												<ChevronLeftIcon className="h-4 w-4" />
											</PaginationLink>
										</PaginationItem>
										<PaginationItem>
											<span className="px-2 text-xs tabular-nums">
												{paginaAtual} / {totalPaginas}
											</span>
										</PaginationItem>
										<PaginationItem>
											<PaginationLink
												onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
												className={
													paginaAtual >= totalPaginas ? 'pointer-events-none opacity-40' : ''
												}>
												<ChevronRightIcon className="h-4 w-4" />
											</PaginationLink>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

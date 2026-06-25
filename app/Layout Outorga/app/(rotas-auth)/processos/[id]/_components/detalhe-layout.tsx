'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IProcesso, IParcela } from '@/types/processo';
import { cn } from '@/lib/utils';
import {
	ArrowLeft, Building, Calculator, CalendarDays,
	CheckCircle2, CircleDot, Clock, FolderOpen,
	Hash, Layers, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ── helpers ── */
const fmtBRL  = (n: number)  => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date | string | undefined) =>
	d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const TIPO_CLS: Record<string, string> = {
	PDE:  'bg-primary/8 text-primary border-primary/20',
	COTA: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400',
};

/* ── section definitions ── */
const SECTIONS = [
	{ id: 'dados',         label: 'Dados do Processo',       grupo: 'Processo',            Icon: FolderOpen    },
	{ id: 'parcelas',      label: 'Parcelas',                grupo: 'Processo',            Icon: Layers        },
	{ id: 'calculo',       label: 'Cálculo da Outorga',      grupo: 'Processo',            Icon: Calculator    },
	{ id: 'enquadramento', label: 'Enquadramento Urbanístico', grupo: 'Monitoramento DEUSO', Icon: Building      },
	{ id: 'situacao',      label: 'Situação',                grupo: 'Monitoramento DEUSO', Icon: CircleDot     },
];

const GRUPOS = ['Processo', 'Monitoramento DEUSO'];

/* ── KV field ── */
function KV({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
			<span className={cn(
				'text-sm px-3 py-2 rounded-md border bg-muted/40',
				!value && 'text-muted-foreground italic',
				mono && 'font-mono font-medium',
			)}>
				{value ?? '—'}
			</span>
		</div>
	);
}

/* ── Section wrapper ── */
function Section({ id, title, Icon, children }: {
	id: string; title: string;
	Icon: React.ElementType; children: React.ReactNode;
}) {
	return (
		<Card id={id} className="scroll-mt-6">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-3">
					<div className="h-9 w-9 rounded-lg bg-primary/8 text-primary grid place-items-center flex-shrink-0">
						<Icon className="h-[18px] w-[18px]" />
					</div>
					<CardTitle className="text-base">{title}</CardTitle>
				</div>
			</CardHeader>
			<Separator />
			<CardContent className="pt-5">{children}</CardContent>
		</Card>
	);
}

/* ── Parcelas table ── */
function ParcelasTable({ parcelas }: { parcelas: IParcela[] }) {
	if (!parcelas.length)
		return <p className="text-sm text-muted-foreground py-2">Nenhuma parcela cadastrada.</p>;

	const total = parcelas.reduce((s, p) => s + (p.valor ?? 0), 0);
	const quitadas = parcelas.filter((p) => p.status_quitacao).length;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-4 text-sm text-muted-foreground">
				<span><b className="text-foreground">{parcelas.length}</b> parcela{parcelas.length > 1 ? 's' : ''}</span>
				<span><b className="text-green-600">{quitadas}</b> quitada{quitadas !== 1 ? 's' : ''}</span>
				<span className="ml-auto font-semibold text-foreground">{fmtBRL(total)}</span>
			</div>
			<div className="rounded-lg border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50 hover:bg-muted/50">
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9 w-14">#</TableHead>
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9">Valor</TableHead>
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9">Vencimento</TableHead>
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9">Quitação</TableHead>
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9">CPF/CNPJ</TableHead>
							<TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-9 text-center">Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{parcelas.map((p, i) => (
							<TableRow key={p.id ?? i}>
								<TableCell className="font-mono text-sm tabular-nums text-muted-foreground">{p.num_parcela}</TableCell>
								<TableCell className="font-mono text-sm tabular-nums font-medium">{fmtBRL(p.valor)}</TableCell>
								<TableCell className="text-sm">{fmtDate(p.vencimento)}</TableCell>
								<TableCell className="text-sm">{fmtDate(p.data_quitacao)}</TableCell>
								<TableCell className="font-mono text-sm text-muted-foreground">{p.cpf_cnpj ?? '—'}</TableCell>
								<TableCell className="text-center">
									{p.status_quitacao ? (
										<span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 dark:bg-green-950/30 dark:text-green-400">
											<CheckCircle2 className="h-3 w-3" />Quitada
										</span>
									) : (
										<span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted border rounded-full px-2.5 py-0.5">
											<Clock className="h-3 w-3" />Pendente
										</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

/* ── Placeholder section ── */
function PlaceholderSection({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
			<XCircle className="h-8 w-8 opacity-30" />
			<p className="text-sm">Dados de <b>{label}</b> ainda não disponíveis nesta versão.</p>
		</div>
	);
}

/* ── Main layout ── */
export default function DetalheLayout({ processo }: { processo: IProcesso }) {
	const [activeId, setActiveId] = useState('dados');
	const containerRef = useRef<HTMLDivElement>(null);

	/* Highlight nav item based on scroll position */
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActiveId(entry.target.id);
				}
			},
			{ root: container, rootMargin: '-30% 0px -60% 0px', threshold: 0 },
		);

		SECTIONS.forEach(({ id }) => {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		});

		return () => observer.disconnect();
	}, []);

	const tipo = processo.tipo ?? '';

	return (
		<div className="flex flex-col gap-5">
			{/* Page header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
						<Link href="/processos"><ArrowLeft className="h-4 w-4" /></Link>
					</Button>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h1 className="text-2xl font-bold tracking-tight font-mono">
								{processo.num_processo}
							</h1>
							{tipo && (
								<Badge variant="outline" className={TIPO_CLS[tipo] ?? 'bg-muted'}>
									{tipo}
								</Badge>
							)}
							{processo.codigo && (
								<span className="flex items-center gap-1 text-xs text-muted-foreground">
									<Hash className="h-3 w-3" />{processo.codigo}
								</span>
							)}
						</div>
						{processo.protocolo_ad && (
							<p className="text-sm text-muted-foreground mt-0.5">
								Protocolo AD: <span className="font-mono">{processo.protocolo_ad}</span>
							</p>
						)}
					</div>
				</div>
				{processo.data_entrada && (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
						<CalendarDays className="h-3.5 w-3.5" />
						Entrada: {fmtDate(processo.data_entrada)}
					</div>
				)}
			</div>

			{/* Body: nav + content */}
			<div className="flex gap-6 items-start">
				{/* Sticky section nav */}
				<aside className="hidden lg:flex flex-col gap-0.5 w-52 flex-shrink-0 sticky top-4">
					{GRUPOS.map((grupo) => (
						<div key={grupo} className="mb-2">
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-1.5">
								{grupo}
							</p>
							{SECTIONS.filter((s) => s.grupo === grupo).map(({ id, label, Icon }) => (
								<a
									key={id}
									href={`#${id}`}
									className={cn(
										'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
										activeId === id
											? 'bg-primary/8 text-primary font-medium'
											: 'text-muted-foreground hover:text-foreground hover:bg-muted',
									)}>
									<Icon className="h-3.5 w-3.5 flex-shrink-0" />
									{label}
								</a>
							))}
						</div>
					))}
				</aside>

				{/* Scrollable content */}
				<div
					ref={containerRef}
					className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">

					<Section id="dados" title="Dados do Processo" Icon={FolderOpen}>
						<div className="grid grid-cols-2 gap-x-6 gap-y-4">
							<KV label="Nº Processo"  value={processo.num_processo} mono />
							<KV label="Tipo"         value={processo.tipo} />
							<KV label="Código"       value={processo.codigo} mono />
							<KV label="Protocolo AD" value={processo.protocolo_ad} />
							<KV label="Data de Entrada" value={fmtDate(processo.data_entrada)} />
							<KV label="Total de Parcelas" value={
								processo.total_parcelas != null
									? String(processo.total_parcelas)
									: processo.parcelas?.length != null
										? String(processo.parcelas.length)
										: undefined
							} />
						</div>
					</Section>

					<Section id="parcelas" title="Parcelas" Icon={Layers}>
						<ParcelasTable parcelas={processo.parcelas ?? []} />
					</Section>

					<Section id="calculo" title="Cálculo da Outorga" Icon={Calculator}>
						<PlaceholderSection label="Cálculo da Outorga" />
					</Section>

					<Section id="enquadramento" title="Enquadramento Urbanístico" Icon={Building}>
						<PlaceholderSection label="Enquadramento Urbanístico" />
					</Section>

					<Section id="situacao" title="Situação" Icon={CircleDot}>
						<PlaceholderSection label="Situação" />
					</Section>
				</div>
			</div>
		</div>
	);
}

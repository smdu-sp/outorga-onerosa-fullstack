'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowRight, Building, CheckCircle2, Loader2 } from 'lucide-react';
import { criar } from '@/services/processos/server-functions/criar';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IEnquadramentoResult } from '../../actions';

interface Props {
	identificador: string;
	modo: 'SQL' | 'PROCESSO';
	enquadramento?: IEnquadramentoResult;
	enquadramentoErro?: string;
}

function KV({ label, value, full, mono }: { label: string; value?: string | null; full?: boolean; mono?: boolean }) {
	return (
		<div className={cn('flex flex-col gap-1', full && 'col-span-2')}>
			<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
			<span className={cn('text-sm text-foreground', mono && 'font-mono')}>{value || '—'}</span>
		</div>
	);
}

export default function FormCriarProcesso({ identificador, modo, enquadramento, enquadramentoErro }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Pre-fill processo number if the user queried by processo number
	const [numProcesso, setNumProcesso] = useState(modo === 'PROCESSO' ? identificador : '');
	const [tipo, setTipo]               = useState<'PDE' | 'COTA'>('PDE');
	const [protocolo, setProtocolo]     = useState('');
	const [erro, setErro]               = useState('');

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!numProcesso.trim()) { setErro('O número do processo é obrigatório.'); return; }
		setErro('');

		startTransition(async () => {
			const resp = await criar({
				num_processo: numProcesso.trim(),
				tipo,
				protocolo_ad: protocolo.trim() || undefined,
				data_entrada: new Date(),
				valor_total: 0,
			});

			if (!resp.ok) {
				toast.error(resp.error ?? 'Erro ao criar o processo.');
				return;
			}

			toast.success('Processo criado com sucesso!');
			const criado = resp.data as { id?: string } | null;
			router.push(criado?.id ? `/processos/${criado.id}` : '/processos');
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Enquadramento summary */}
			{enquadramento ? (
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-lg bg-green-500/10 text-green-600 grid place-items-center flex-shrink-0">
								<Building className="h-[18px] w-[18px]" />
							</div>
							<div className="flex-1 min-w-0">
								<CardTitle className="text-base">Enquadramento Urbanístico</CardTitle>
								<CardDescription>
									Consultado para <code className="font-mono text-xs bg-muted rounded px-1 py-0.5">{identificador}</code>
								</CardDescription>
							</div>
							<Badge variant="secondary" className="flex-shrink-0 gap-1 text-xs">
								<CheckCircle2 className="h-3 w-3 text-green-500" />Confirmado
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3">
							<KV label="Distrito"      value={enquadramento.enquadramento.distrito} />
							<KV label="Subprefeitura" value={enquadramento.enquadramento.subprefeitura} />
							<KV label="Macrozona"     value={enquadramento.enquadramento.macrozona}  full />
							<KV label="Zona de Uso"   value={enquadramento.enquadramento.zonas.join(' · ')} mono />
							<KV label="Tipologia OODC" value={enquadramento.enquadramento.tipologia_uso_oodc} />
						</div>
						<Separator className="my-4" />
						<div className="grid grid-cols-3 gap-x-6 gap-y-3">
							<KV label="Coef. Básico"  value={String(enquadramento.parametros.coeficiente_basico)} />
							<KV label="Coef. Máximo"  value={String(enquadramento.parametros.coeficiente_maximo)} />
							<KV label="Área Terreno"  value={enquadramento.parametros.area_terreno.toLocaleString('pt-BR') + ' m²'} />
						</div>
					</CardContent>
				</Card>
			) : enquadramentoErro ? (
				<Card className="border-amber-200 dark:border-amber-900">
					<CardContent className="pt-5 pb-4 flex items-start gap-3">
						<AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm font-medium">Enquadramento não disponível</p>
							<p className="text-xs text-muted-foreground mt-0.5">{enquadramentoErro}</p>
						</div>
					</CardContent>
				</Card>
			) : null}

			{/* Creation form */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Dados do processo</CardTitle>
					<CardDescription>Preencha as informações para registrar o processo</CardDescription>
				</CardHeader>
				<CardContent>
					<form id="form-criar" onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-1.5">
							<Label htmlFor="num_processo">Nº Processo <span className="text-destructive">*</span></Label>
							<Input
								id="num_processo"
								value={numProcesso}
								onChange={(e) => { setNumProcesso(e.target.value); if (erro) setErro(''); }}
								placeholder="6068.0000/0000000-0"
								className={cn('font-mono', erro && 'border-destructive')}
								disabled={isPending}
								autoFocus={!numProcesso}
							/>
							{erro && (
								<p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
									<AlertTriangle className="h-3 w-3" />{erro}
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="tipo">Tipo de processo</Label>
								<Select value={tipo} onValueChange={(v) => setTipo(v as 'PDE' | 'COTA')} disabled={isPending}>
									<SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="PDE">PDE</SelectItem>
										<SelectItem value="COTA">COTA</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="protocolo">Nº Protocolo AD <span className="text-muted-foreground">(opcional)</span></Label>
								<Input
									id="protocolo"
									value={protocolo}
									onChange={(e) => setProtocolo(e.target.value)}
									placeholder="Protocolo"
									disabled={isPending}
								/>
							</div>
						</div>
					</form>
				</CardContent>
				<CardFooter className="border-t pt-4 justify-between gap-4 bg-muted/30 rounded-b-xl">
					<Button variant="outline" asChild disabled={isPending}>
						<a href="/processos/novo">← Voltar</a>
					</Button>
					<Button form="form-criar" type="submit" disabled={isPending} className="gap-2">
						{isPending
							? <><Loader2 className="h-4 w-4 animate-spin" />Criando processo…</>
							: <>Criar processo <ArrowRight className="h-4 w-4" /></>}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

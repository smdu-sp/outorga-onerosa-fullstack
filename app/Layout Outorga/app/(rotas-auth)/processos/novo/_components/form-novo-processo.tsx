'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
	Search, MapPin, Hash, Check, Loader2, Building,
	Layers, Calculator, AlertTriangle, ArrowRight,
	CheckCircle2, Info, RefreshCw, Database,
} from 'lucide-react';
import { consultarEnquadramento, type IEnquadramentoResult } from '../actions';
import Link from 'next/link';

type Modo = 'SQL' | 'PROCESSO';
type Fase = 'idle' | 'loading' | 'done' | 'error';

const PIPE_STEPS = [
	{ id: 'val',  label: 'Validando identificador',              Icon: Check       },
	{ id: 'geo',  label: 'Localizando lote no GeoSampa',         Icon: MapPin      },
	{ id: 'enq',  label: 'Apurando enquadramento urbanístico',   Icon: Building    },
	{ id: 'calc', label: 'Calculando parâmetros de outorga',     Icon: Calculator  },
];

const PCT = [15, 42, 70, 92];

const reSQL  = /^\d{3}\.\d{3}\.\d{4}-\d$/;
const reProc = /^\d{4}\.\d{4}\/\d{7}-\d$/;

const fmtBRL  = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtArea = (n: number) => n.toLocaleString('pt-BR') + ' m²';

/* ── KV helper ── */
function KV({ label, value, full, highlight, mono }: {
	label: string; value?: string | null;
	full?: boolean; highlight?: boolean; mono?: boolean;
}) {
	const empty = !value;
	return (
		<div className={cn('flex flex-col gap-1.5', full && 'col-span-2')}>
			<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
			<span className={cn(
				'text-sm px-3 py-2 rounded-md border',
				empty        && 'text-muted-foreground bg-muted/30 border-border',
				!empty && !highlight && 'bg-muted/40 border-border text-foreground',
				highlight && !empty  && 'bg-primary/8 border-primary/20 text-primary font-bold',
				mono && 'font-mono font-semibold',
			)}>
				{empty ? '—' : value}
			</span>
		</div>
	);
}

/* ── Main component ── */
export default function FormNovoProcesso() {
	const [modo, setModo]         = useState<Modo>('SQL');
	const [valor, setValor]       = useState('');
	const [erro, setErro]         = useState('');
	const [fase, setFase]         = useState<Fase>('idle');
	const [step, setStep]         = useState(0);
	const [resultado, setResult]  = useState<IEnquadramentoResult | null>(null);
	const [usado, setUsado]       = useState('');
	const [erroApi, setErroApi]   = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);

	function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }

	function validar(v: string) {
		if (!v.trim()) return `Informe o ${modo === 'SQL' ? 'SQL do lote' : 'número do processo'}.`;
		if (modo === 'SQL'      && !reSQL.test(v.trim()))  return 'SQL inválido. Formato esperado: 000.000.0000-0.';
		if (modo === 'PROCESSO' && !reProc.test(v.trim())) return 'Número inválido. Formato esperado: 0000.0000/0000000-0.';
		return '';
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (fase === 'loading') return;
		const v = valor.trim();
		const msg = validar(v);
		if (msg) { setErro(msg); inputRef.current?.focus(); return; }

		setErro(''); setErroApi(''); setResult(null);
		setFase('loading'); setStep(0); setUsado(v);
		clearTimers();

		// Animate pipeline in parallel with real API call
		timers.current.push(setTimeout(() => setStep(1), 650));
		timers.current.push(setTimeout(() => setStep(2), 1350));
		timers.current.push(setTimeout(() => setStep(3), 2100));

		const resp = await consultarEnquadramento(modo, v);
		clearTimers();

		if (!resp.ok || !resp.data) {
			setFase('error');
			setErroApi(resp.error ?? 'Erro inesperado ao consultar a API.');
			return;
		}

		setStep(4);
		setResult(resp.data);
		setTimeout(() => setFase('done'), 300);
	}

	function reiniciar() {
		setFase('idle'); setResult(null); setStep(0); setErroApi('');
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	const pct = PCT[Math.min(step, PCT.length - 1)];

	return (
		<div className="flex flex-col gap-4">

			{/* ── Identification card ── */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-lg bg-primary/8 text-primary grid place-items-center flex-shrink-0">
							<Search className="h-[18px] w-[18px]" />
						</div>
						<div>
							<CardTitle className="text-base">Identificação do imóvel</CardTitle>
							<CardDescription>Escolha como deseja localizar o lote</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-5">
					{/* Mode segmented control */}
					<div className="inline-flex rounded-lg border bg-muted p-1 gap-1">
						{(['SQL', 'PROCESSO'] as const).map((m) => (
							<button
								key={m}
								type="button"
								disabled={fase === 'loading'}
								onClick={() => { setModo(m); setErro(''); if (fase !== 'loading') setValor(''); }}
								className={cn(
									'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
									modo === m
										? 'bg-card text-primary shadow-sm font-semibold'
										: 'text-muted-foreground hover:text-foreground',
								)}>
								{m === 'SQL' ? <MapPin className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
								{m === 'SQL' ? 'SQL do lote' : 'Número do processo'}
							</button>
						))}
					</div>

					{/* Input form */}
					<form onSubmit={handleSubmit} className="space-y-2">
						<Label htmlFor="identificador">
							{modo === 'SQL' ? 'SQL — Setor · Quadra · Lote' : 'Número do processo (SEI)'}
						</Label>
						<div className="flex gap-2">
							<div className="relative flex-1">
								{modo === 'SQL'
									? <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
									: <Hash   className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />}
								<Input
									id="identificador"
									ref={inputRef}
									value={valor}
									onChange={(e) => { setValor(e.target.value); if (erro) setErro(''); }}
									placeholder={modo === 'SQL' ? '000.000.0000-0' : '0000.0000/0000000-0'}
									disabled={fase === 'loading'}
									className={cn('pl-9 font-mono text-base h-11', erro && 'border-destructive focus-visible:ring-destructive/20')}
									autoFocus
									spellCheck={false}
									autoComplete="off"
								/>
							</div>
							<Button type="submit" size="lg" disabled={fase === 'loading'} className="h-11 px-6 gap-2">
								{fase === 'loading'
									? <><Loader2 className="h-4 w-4 animate-spin" />Consultando…</>
									: <><Search  className="h-4 w-4" />Consultar</>}
							</Button>
						</div>

						{erro
							? <p className="flex items-center gap-1.5 text-sm text-destructive font-medium">
									<AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />{erro}
								</p>
							: <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<Info className="h-3 w-3 flex-shrink-0" />
									{modo === 'SQL'
										? 'Formato Setor.Quadra.Lote-Dígito, ex. 073.142.0021-0'
										: 'Formato SEI, ex. 6068.2024/0012345-6'}
								</p>}
					</form>
				</CardContent>
			</Card>

			{/* ── Loading pipeline ── */}
			{fase === 'loading' && (
				<Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-lg bg-primary/8 text-primary grid place-items-center flex-shrink-0">
								<Layers className="h-[18px] w-[18px]" />
							</div>
							<div>
								<CardTitle className="text-base">Processando consulta</CardTitle>
								<CardDescription>
									Identificador enviado · <code className="font-mono text-xs bg-muted rounded px-1 py-0.5">{usado}</code>
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Sent indicator */}
						<div className="flex items-center gap-2 text-sm font-semibold text-primary">
							<span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
							Dados enviados · aguardando resposta do servidor
							<span className="ml-auto font-mono text-sm text-foreground">{pct}%</span>
						</div>
						{/* Progress bar */}
						<div className="h-2 rounded-full bg-muted overflow-hidden border">
							<div
								className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
								style={{ width: `${pct}%` }}
							/>
						</div>
						{/* Steps */}
						<div className="space-y-0.5 pt-1">
							{PIPE_STEPS.map(({ id, label, Icon }, i) => {
								const state = i < step ? 'done' : i === step ? 'run' : 'wait';
								return (
									<div key={id} className={cn(
										'flex items-center gap-3 py-2.5 text-sm',
										state === 'done' && 'text-foreground',
										state === 'run'  && 'text-primary font-medium',
										state === 'wait' && 'text-muted-foreground',
									)}>
										<span className={cn(
											'h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[11px]',
											state === 'done' && 'bg-green-500 border-green-500 text-white',
											state === 'run'  && 'border-primary text-primary',
											state === 'wait' && 'border-border opacity-50',
										)}>
											{state === 'done' ? <Check className="h-3 w-3" />
											: state === 'run'  ? <Loader2 className="h-3 w-3 animate-spin" />
											: <Icon className="h-3 w-3" />}
										</span>
										{label}{state === 'run' ? '…' : ''}
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* ── API error ── */}
			{fase === 'error' && (
				<Card className="border-destructive animate-in fade-in slide-in-from-bottom-2 duration-300">
					<CardContent className="pt-6 pb-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-semibold text-sm">Não foi possível consultar o identificador</p>
								<p className="text-sm text-muted-foreground mt-1">{erroApi}</p>
							</div>
						</div>
					</CardContent>
					<CardFooter className="border-t pt-3 justify-end">
						<Button variant="outline" size="sm" onClick={reiniciar} className="gap-2">
							<RefreshCw className="h-3.5 w-3.5" />Tentar novamente
						</Button>
					</CardFooter>
				</Card>
			)}

			{/* ── Result ── */}
			{fase === 'done' && resultado && (
				<Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-lg bg-green-500/10 text-green-600 grid place-items-center flex-shrink-0">
								<Building className="h-[18px] w-[18px]" />
							</div>
							<div className="flex-1 min-w-0">
								<CardTitle className="text-base">Enquadramento Urbanístico</CardTitle>
								<CardDescription>
									Retornado pela API · <code className="font-mono text-xs bg-muted rounded px-1 py-0.5">{usado}</code>
								</CardDescription>
							</div>
							<Badge variant="secondary" className="gap-1 text-xs flex-shrink-0">
								<Database className="h-3 w-3" />GeoSampa
							</Badge>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Success banner */}
						<div className="flex items-center gap-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-medium dark:bg-green-950/20 dark:border-green-900 dark:text-green-400">
							<CheckCircle2 className="h-4 w-4 flex-shrink-0" />
							Lote localizado — enquadramento apurado com sucesso.
						</div>

						{/* Enquadramento fields */}
						<div className="grid grid-cols-2 gap-x-6 gap-y-4">
							<KV label="Distrito"      value={resultado.enquadramento.distrito} />
							<KV label="Subprefeitura" value={resultado.enquadramento.subprefeitura} />
							<KV label="Macrozona"     value={resultado.enquadramento.macrozona}   full />
							<KV label="Macroárea"     value={resultado.enquadramento.macroarea} />
							<KV label="Subsetor"      value={resultado.enquadramento.subsetor} />
							<KV
								label={`Zona${resultado.enquadramento.zonas.length > 1 ? 's' : ''} de Uso`}
								value={resultado.enquadramento.zonas.join('  ·  ')}
								full mono
							/>
							<KV label="Tipologia de Uso OODC" value={resultado.enquadramento.tipologia_uso_oodc} full />
						</div>

						<Separator />

						{/* Parâmetros */}
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
								<Calculator className="h-3.5 w-3.5" />
								Parâmetros para cálculo da contrapartida
							</p>
							<div className="grid grid-cols-2 gap-x-6 gap-y-4">
								<KV label="Coeficiente Básico"       value={String(resultado.parametros.coeficiente_basico)}   highlight />
								<KV label="Coeficiente Máximo"       value={String(resultado.parametros.coeficiente_maximo)}   highlight />
								<KV label="Área do Terreno"          value={fmtArea(resultado.parametros.area_terreno)} />
								<KV label="Valor m² (Quadro 14)"     value={fmtBRL(resultado.parametros.valor_m2_quadro14)} />
								<KV label="Fator de Planejamento (Fp)" value={resultado.parametros.fator_planejamento.toFixed(1)} />
								<KV label="Fator Social (Fs)"        value={resultado.parametros.fator_social.toFixed(1)} />
							</div>
						</div>
					</CardContent>

					<CardFooter className="border-t pt-4 flex-col sm:flex-row items-start sm:items-center gap-4 justify-between bg-muted/30 rounded-b-xl">
						<p className="text-xs text-muted-foreground flex items-center gap-1.5">
							<Info className="h-3.5 w-3.5 flex-shrink-0" />
							Os campos serão pré-preenchidos e poderão ser ajustados pelo DEUSO.
						</p>
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<Button variant="outline" asChild className="flex-1 sm:flex-none">
								<Link href="/processos">Cancelar</Link>
							</Button>
							<Button asChild className="flex-1 sm:flex-none gap-2">
								<Link href="/processos/novo/criar">
									Criar processo<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					</CardFooter>
				</Card>
			)}

			{fase === 'done' && (
				<div className="text-center pt-1">
					<Button variant="ghost" size="sm" onClick={reiniciar} className="gap-2 text-muted-foreground">
						<RefreshCw className="h-3.5 w-3.5" />Consultar outro identificador
					</Button>
				</div>
			)}
		</div>
	);
}

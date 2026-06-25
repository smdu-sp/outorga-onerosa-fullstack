'use client';

import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	Building,
	Calculator,
	Check,
	CheckCircle2,
	Database,
	Hash,
	Info,
	Layers,
	Loader2,
	MapPin,
	RefreshCw,
	Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { consultarEnquadramento, type IEnquadramentoResult } from '../actions';
import { resumoEnquadramento, resumoEndereco, resumoParametros } from '@/lib/geosampa-resumo';
import { GeoSampaLogPanel } from '@/app/(rotas-auth)/processos/[id]/_components/geosampa-log-panel';
import type { GeoSampaLogEntry } from '@/types/geosampa';
import { TIPOLOGIA_USO_OODC } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import {
	CampoKV,
	ChipExemplo,
	NovoCard,
	NovoCardHead,
	SegControl,
} from './novo-processo-ui';

type Modo = 'SQL' | 'PROCESSO';
type Fase = 'idle' | 'loading' | 'done' | 'error';

const PIPE_STEPS = [
	{ id: 'val', label: 'Validando identificador', Icon: Check },
	{ id: 'geo', label: 'Localizando lote no GeoSampa', Icon: MapPin },
	{ id: 'enq', label: 'Apurando enquadramento urbanístico', Icon: Building },
	{ id: 'calc', label: 'Calculando parâmetros de outorga', Icon: Calculator },
];

const PCT = [15, 42, 70, 92];
const reSQL = /^\d{3}\.\d{3}\.\d{4}-\d$/;
const reProc = /^\d{4}\.\d{4}\/\d{7}-\d$/;

/** SQL válido no GeoSampa WFS (exemplo real para testes). */
const EXEMPLO_SQL = { modo: 'SQL' as const, valor: '148.063.0024-0' };

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtArea = (n: number) => n.toLocaleString('pt-BR') + ' m²';

export default function FormNovoProcesso() {
	const [modo, setModo] = useState<Modo>('SQL');
	const [valor, setValor] = useState('');
	const [erro, setErro] = useState('');
	const [fase, setFase] = useState<Fase>('idle');
	const [step, setStep] = useState(0);
	const [resultado, setResultado] = useState<IEnquadramentoResult | null>(null);
	const [usado, setUsado] = useState('');
	const [erroApi, setErroApi] = useState('');
	const [logEntries, setLogEntries] = useState<GeoSampaLogEntry[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	function clearTimers() {
		timers.current.forEach(clearTimeout);
		timers.current = [];
	}

	function validar(v: string) {
		if (!v.trim()) {
			return `Informe o ${modo === 'SQL' ? 'SQL do lote' : 'número do processo'}.`;
		}
		if (modo === 'SQL' && !reSQL.test(v.trim())) {
			return 'SQL inválido. Formato esperado: 000.000.0000-0.';
		}
		if (modo === 'PROCESSO' && !reProc.test(v.trim())) {
			return 'Número inválido. Formato esperado: 0000.0000/0000000-0.';
		}
		return '';
	}

	function trocarModo(m: Modo) {
		if (fase === 'loading') return;
		setModo(m);
		setErro('');
		setValor('');
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (fase === 'loading') return;
		const v = valor.trim();
		const msg = validar(v);
		if (msg) {
			setErro(msg);
			inputRef.current?.focus();
			return;
		}

		setErro('');
		setErroApi('');
		setResultado(null);
		setFase('loading');
		setStep(0);
		setUsado(v);
		clearTimers();

		timers.current.push(setTimeout(() => setStep(1), 650));
		timers.current.push(setTimeout(() => setStep(2), 1350));
		timers.current.push(setTimeout(() => setStep(3), 2100));

		const resp = await consultarEnquadramento(modo, v);
		clearTimers();

		if (!resp.ok || !resp.data) {
			setFase('error');
			setErroApi(resp.error ?? 'Erro inesperado ao consultar a API.');
			setLogEntries(resp.logs ?? []);
			return;
		}

		setLogEntries([]);

		setStep(4);
		setResultado(resp.data);
		setTimeout(() => setFase('done'), 300);
	}

	function usarExemplo(ex: { modo: Modo; valor: string }) {
		setModo(ex.modo);
		setValor(ex.valor);
		setErro('');
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	function reiniciar() {
		setFase('idle');
		setResultado(null);
		setStep(0);
		setErroApi('');
		setLogEntries([]);
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	const pct = PCT[Math.min(step, PCT.length - 1)];
	const enq = resultado ? resumoEnquadramento(resultado) : null;
	const par = resultado ? resumoParametros(resultado.calculo_outorga) : null;
	const endereco = resultado ? resumoEndereco(resultado) : '';
	const labelInput =
		modo === 'SQL' ? 'SQL — Setor · Quadra · Lote' : 'Número do processo (SEI)';
	const placeholder = modo === 'SQL' ? '000.000.0000-0' : '0000.0000/0000000-0';

	return (
		<div className="flex flex-col gap-5">
			<NovoCard>
				<NovoCardHead
					icon={Search}
					title="Identificação do imóvel"
					subtitle="Escolha como deseja localizar o lote"
				/>
				<div className="px-[22px] py-5">
					<div className="mb-[18px]">
						<SegControl
							disabled={fase === 'loading'}
							value={modo}
							onChange={trocarModo}
							options={[
								{ value: 'SQL', label: 'SQL do lote', icon: MapPin },
								{ value: 'PROCESSO', label: 'Número do processo', icon: Hash },
							]}
						/>
					</div>

					<form onSubmit={handleSubmit}>
						<label
							htmlFor="identificador"
							className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
							{labelInput}
						</label>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
							<div
								className={cn(
									'flex flex-1 items-center gap-2.5 rounded-[10px] border border-border bg-secondary px-3.5 transition-colors',
									erro && 'border-destructive',
								)}>
								{modo === 'SQL' ? (
									<MapPin className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
								) : (
									<Hash className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
								)}
								<input
									id="identificador"
									ref={inputRef}
									value={valor}
									onChange={(e) => {
										setValor(e.target.value);
										if (erro) setErro('');
									}}
									placeholder={placeholder}
									disabled={fase === 'loading'}
									autoFocus
									spellCheck={false}
									autoComplete="off"
									inputMode={modo === 'SQL' ? 'numeric' : 'text'}
									className="h-12 w-full border-none bg-transparent font-mono text-base outline-none placeholder:text-muted-foreground"
								/>
							</div>
							<button
								type="submit"
								disabled={fase === 'loading'}
								className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70">
								{fase === 'loading' ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Consultando…
									</>
								) : (
									<>
										<Search className="h-4 w-4" />
										Consultar
									</>
								)}
							</button>
						</div>

						{erro ? (
							<div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-medium text-destructive">
								<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
								{erro}
							</div>
						) : (
							<div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
								<Info className="h-3.5 w-3.5 shrink-0" />
								{modo === 'SQL' ? (
									<>
										Formato{' '}
										<ChipExemplo>Setor.Quadra.Lote-Dígito</ChipExemplo>
										<span className="opacity-60">ex.</span>
										<ChipExemplo onClick={() => usarExemplo(EXEMPLO_SQL)}>
											148.063.0024-0
										</ChipExemplo>
									</>
								) : (
									<>
										Formato SEI: <ChipExemplo>0000.0000/0000000-0</ChipExemplo>
									</>
								)}
							</div>
						)}
					</form>

					{fase === 'idle' && modo === 'SQL' && (
						<div className="mt-4 flex flex-wrap items-center gap-2">
							<span className="text-xs text-muted-foreground">Exemplo real:</span>
							<ChipExemplo onClick={() => usarExemplo(EXEMPLO_SQL)}>
								{EXEMPLO_SQL.valor}
							</ChipExemplo>
						</div>
					)}
				</div>
			</NovoCard>

			{fase === 'loading' && (
				<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300">
					<NovoCardHead
						icon={Layers}
						title="Processando consulta"
						subtitle={
							<>
								Identificador enviado ·{' '}
								<code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">{usado}</code>
							</>
						}
					/>
					<div className="px-[22px] py-5">
						<div className="mb-1 flex items-center gap-2.5 text-[13px] font-semibold text-primary">
							<span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
							Dados enviados · aguardando resposta do servidor
							<span className="ml-auto font-mono text-sm text-foreground">{pct}%</span>
						</div>
						<div className="relative my-3 h-2 overflow-hidden rounded-full border border-border bg-secondary">
							<div
								className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.5_0.16_250)] transition-all duration-500 ease-out"
								style={{ width: `${pct}%` }}
							/>
						</div>
						<div className="flex flex-col gap-0.5">
							{PIPE_STEPS.map(({ id, label, Icon }, i) => {
								const state = i < step ? 'done' : i === step ? 'run' : 'wait';
								return (
									<div
										key={id}
										className={cn(
											'flex items-center gap-3 py-[11px] text-[13.5px]',
											state === 'done' && 'text-foreground',
											state === 'run' && 'font-medium text-primary',
											state === 'wait' && 'text-muted-foreground',
										)}>
										<span
											className={cn(
												'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px]',
												state === 'done' &&
													'border-success bg-success text-white',
												state === 'run' && 'border-primary text-primary',
												state === 'wait' && 'border-border bg-card opacity-60',
											)}>
											{state === 'done' ? (
												<Check className="h-3 w-3" />
											) : state === 'run' ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<Icon className="h-3 w-3" />
											)}
										</span>
										{label}
										{state === 'run' ? '…' : ''}
									</div>
								);
							})}
						</div>
					</div>
				</NovoCard>
			)}

			{fase === 'error' && (
				<NovoCard className="border-destructive animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div className="px-[22px] py-5">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
							<div>
								<p className="text-sm font-semibold">
									Não foi possível consultar o identificador
								</p>
								<p className="mt-1 text-sm text-muted-foreground">{erroApi}</p>
							</div>
						</div>
						{logEntries.length > 0 && (
							<div className="mt-4">
								<GeoSampaLogPanel
									entries={logEntries}
									onClose={() => setLogEntries([])}
									inline
								/>
							</div>
						)}
						<div className="mt-4 flex justify-end border-t border-border pt-3">
							<button
								type="button"
								onClick={reiniciar}
								className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
								<RefreshCw className="h-3.5 w-3.5" />
								Tentar novamente
							</button>
						</div>
					</div>
				</NovoCard>
			)}

			{fase === 'done' && resultado && (
				<>
					<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
						<NovoCardHead
							icon={Building}
							title="Enquadramento Urbanístico"
							subtitle={
								<>
									Retornado pela API a partir de{' '}
									<b className="font-mono text-xs">{usado}</b>
								</>
							}
							extra={
								<span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
									<Database className="h-3 w-3" />
									GeoSampa
								</span>
							}
						/>
						<div className="px-6 py-5">
							<div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-success/30 bg-success-soft px-4 py-3 text-[13.5px] font-semibold text-success">
								<CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
								Lote localizado — enquadramento apurado com sucesso.
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-[26px]">
								{resultado.proprietario_interessado && (
									<CampoKV
										label="Proprietário / Interessado"
										value={resultado.proprietario_interessado}
										full
									/>
								)}
								{endereco && <CampoKV label="Endereço" value={endereco} full />}
								<CampoKV label="Distrito" value={enq?.distrito} />
								<CampoKV label="Subprefeitura" value={enq?.subprefeitura} />
								<CampoKV label="Macrozona" value={enq?.macrozona} full />
								<CampoKV label="Macroárea" value={enq?.macroarea} />
								<CampoKV label="Subsetor" value={enq?.subsetor} />
								<CampoKV
									label={`Zona${(enq?.zonas.length ?? 0) > 1 ? 's' : ''} de Uso`}
									value={enq?.zonas.join('  ·  ')}
									full
									mono
								/>
								<CampoKV
									label="Tipologia de Uso OODC"
									value={
										enq?.tipologia_uso_oodc
											? (TIPOLOGIA_USO_OODC[enq.tipologia_uso_oodc] ?? enq.tipologia_uso_oodc)
											: undefined
									}
									full
								/>
								<CampoKV label="Uso" value={enq?.uso || undefined} full />
							</div>

							<div className="my-5 h-px bg-border" />

							<p className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
								<Calculator className="h-3.5 w-3.5" />
								Parâmetros para cálculo da contrapartida
							</p>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-[26px]">
								<CampoKV label="Coeficiente Básico" value={par?.coeficiente_basico} highlight />
								<CampoKV label="Coeficiente Máximo" value={par?.coeficiente_maximo} highlight />
								<CampoKV
									label="Área do Terreno"
									value={par ? fmtArea(par.area_terreno) : undefined}
								/>
								<CampoKV
									label="Valor m² (Quadro 14)"
									value={par ? fmtBRL(par.valor_m2_quadro14) : undefined}
								/>
								<CampoKV
									label="Fator de Planejamento (Fp)"
									value={par?.fator_planejamento.toFixed(1)}
								/>
								<CampoKV label="Fator Social (Fs)" value={par?.fator_social.toFixed(1)} />
							</div>
						</div>

						<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
							<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
								<Info className="h-3.5 w-3.5 shrink-0" />
								Os campos serão pré-preenchidos no processo e poderão ser ajustados pelo DEUSO.
							</p>
							<div className="flex w-full gap-2.5 sm:w-auto">
								<Link
									href="/processos"
									className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium no-underline hover:bg-background sm:flex-none">
									Cancelar
								</Link>
								<Link
									href={`/processos/novo/criar?modo=${modo}&id=${encodeURIComponent(usado)}`}
									className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-primary/90 sm:flex-none">
									Criar processo
								</Link>
							</div>
						</div>
					</NovoCard>

					<div className="text-center">
						<button
							type="button"
							onClick={reiniciar}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
							<RefreshCw className="h-3.5 w-3.5" />
							Consultar outro identificador
						</button>
					</div>
				</>
			)}
		</div>
	);
}

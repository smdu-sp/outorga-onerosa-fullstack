'use client';

import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	Building,
	Calculator,
	Check,
	CheckCircle2,
	Hash,
	Info,
	Loader2,
	RefreshCw,
	Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { IGeoSampaResult } from '@/types/geosampa';
import { consultarCalculo, confirmarProcessoTecnico } from '../actions-tecnico';
import { resumoEnquadramento, resumoEndereco, resumoParametros } from '@/lib/geosampa-resumo';
import { TIPOLOGIA_USO_OODC } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { CampoKV, NovoCard, NovoCardHead } from './novo-processo-ui';

type Fase = 'idle' | 'loading' | 'done' | 'error' | 'confirmando' | 'confirmado';

const reProc = /^\d{4}\.\d{4}\/\d{7}-\d$/;

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtArea = (n: number) => n.toLocaleString('pt-BR') + ' m²';

export default function FormNovoProcessoTecnico() {
	const [valor, setValor] = useState('');
	const [erro, setErro] = useState('');
	const [fase, setFase] = useState<Fase>('idle');
	const [resultado, setResultado] = useState<IGeoSampaResult | null>(null);
	const [erroApi, setErroApi] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	function validar(v: string) {
		if (!v.trim()) return 'Informe o número do processo.';
		if (!reProc.test(v.trim())) return 'Número inválido. Formato esperado: 0000.0000/0000000-0.';
		return '';
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

		const resp = await consultarCalculo(v);
		if (!resp.ok || !resp.data) {
			setFase('error');
			setErroApi(resp.error ?? 'Erro inesperado ao consultar a API de cálculo.');
			return;
		}

		setResultado(resp.data);
		setFase('done');
	}

	function reiniciar() {
		setFase('idle');
		setResultado(null);
		setErroApi('');
		setValor('');
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	async function confirmar() {
		if (!resultado) return;
		setFase('confirmando');
		const resp = await confirmarProcessoTecnico(valor.trim(), resultado);
		if (!resp.ok) {
			setFase('done');
			setErroApi(resp.error ?? 'Erro ao confirmar o processo.');
			return;
		}
		setFase('confirmado');
	}

	const enq = resultado ? resumoEnquadramento(resultado) : null;
	const par = resultado?.calculo_outorga ? resumoParametros(resultado.calculo_outorga) : null;
	const endereco = resultado ? resumoEndereco(resultado) : '';
	const semDadosDaApi = resultado != null && !resultado.calculo_outorga && !resultado.enquadramento_urbanistico;

	if (fase === 'confirmado') {
		return (
			<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300">
				<div className="px-[22px] py-8 text-center">
					<div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
						<CheckCircle2 className="h-7 w-7" />
					</div>
					<p className="text-[15px] font-bold">Processo enviado para CAP</p>
					<p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
						O processo <span className="font-mono">{valor}</span> foi cadastrado e está em CAP
						para iniciar os trâmites administrativos de pagamento da outorga.
					</p>
					<Link
						href="/processos"
						className="mt-5 inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-primary/90">
						Ver processos
					</Link>
				</div>
			</NovoCard>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<NovoCard>
				<NovoCardHead
					icon={Search}
					title="Número do processo"
					subtitle="Informe o número do processo para consultar o cálculo da outorga"
				/>
				<div className="px-[22px] py-5">
					<form onSubmit={handleSubmit}>
						<label
							htmlFor="identificador"
							className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
							Número do processo (SEI)
						</label>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
							<div
								className={cn(
									'flex flex-1 items-center gap-2.5 rounded-[10px] border border-border bg-secondary px-3.5 transition-colors',
									erro && 'border-destructive',
								)}>
								<Hash className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
								<input
									id="identificador"
									ref={inputRef}
									value={valor}
									onChange={(e) => {
										setValor(e.target.value);
										if (erro) setErro('');
									}}
									placeholder="0000.0000/0000000-0"
									disabled={fase === 'loading'}
									autoFocus
									spellCheck={false}
									autoComplete="off"
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
										<Calculator className="h-4 w-4" />
										Calcular
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
								Formato SEI: <span className="font-mono">0000.0000/0000000-0</span>
							</div>
						)}
					</form>
				</div>
			</NovoCard>

			{fase === 'error' && (
				<NovoCard className="border-destructive animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div className="px-[22px] py-5">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
							<div>
								<p className="text-sm font-semibold">Não foi possível calcular a outorga</p>
								<p className="mt-1 text-sm text-muted-foreground">{erroApi}</p>
							</div>
						</div>
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

			{(fase === 'done' || fase === 'confirmando') && resultado && (
				<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
					<NovoCardHead
						icon={Building}
						title="Cálculo da outorga"
						subtitle={
							<>
								Retornado pela API de cálculo para <b className="font-mono text-xs">{valor}</b>
							</>
						}
					/>
					<div className="px-6 py-5">
						{erroApi && (
							<div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/8 px-4 py-3 text-[13px] font-medium text-destructive">
								<AlertTriangle className="h-4 w-4 shrink-0" />
								{erroApi}
							</div>
						)}

						{semDadosDaApi ? (
							<div className="flex items-center gap-2.5 rounded-[10px] border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] font-medium text-[oklch(0.5_0.13_70)]">
								<Info className="h-[18px] w-[18px] shrink-0" />
								A API de cálculo ainda não retornou dados de enquadramento/contrapartida para
								este processo. Você pode confirmar mesmo assim — o processo será criado só com o
								número informado, para o DEUSO completar depois.
							</div>
						) : (
							<>
								<div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-success/30 bg-success-soft px-4 py-3 text-[13.5px] font-semibold text-success">
									<CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
									Cálculo recebido — confira os dados antes de confirmar.
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
								</div>

								{par && (
									<>
										<div className="my-5 h-px bg-border" />
										<p className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
											<Calculator className="h-3.5 w-3.5" />
											Parâmetros para cálculo da contrapartida
										</p>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-[26px]">
											<CampoKV label="Coeficiente Básico" value={par.coeficiente_basico} highlight />
											<CampoKV
												label="Área do Terreno"
												value={fmtArea(par.area_terreno)}
											/>
											<CampoKV
												label="Valor m² (Quadro 14)"
												value={fmtBRL(par.valor_m2_quadro14)}
											/>
										</div>
									</>
								)}
							</>
						)}
					</div>

					<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
						<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
							<Check className="h-3.5 w-3.5 shrink-0" />
							Só grava no banco se você confirmar.
						</p>
						<div className="flex w-full gap-2.5 sm:w-auto">
							<button
								type="button"
								onClick={reiniciar}
								disabled={fase === 'confirmando'}
								className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-background disabled:opacity-60 sm:flex-none">
								Cancelar
							</button>
							<button
								type="button"
								onClick={confirmar}
								disabled={fase === 'confirmando'}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70 sm:flex-none">
								{fase === 'confirmando' ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Confirmando…
									</>
								) : (
									'Confirmar'
								)}
							</button>
						</div>
					</div>
				</NovoCard>
			)}
		</div>
	);
}

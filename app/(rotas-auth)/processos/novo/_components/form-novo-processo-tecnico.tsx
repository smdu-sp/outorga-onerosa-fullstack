'use client';

import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	Building,
	Calculator,
	Check,
	CheckCircle2,
	Download,
	FileText,
	Hash,
	Info,
	Loader2,
	RefreshCw,
	Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { IGeoSampaResult } from '@/types/geosampa';
import {
	consultarCalculo,
	confirmarProcessoTecnico,
	gerarPdfMemorialCalculo,
	type TipoNovoProcesso,
} from '../actions-tecnico';
import type { DadosPdfCalculo } from '@/types/pdf-calculo-outorga';
import { resumoEnquadramento, resumoEndereco, resumoParametros } from '@/lib/geosampa-resumo';
import { parseNumeroBr } from '@/lib/parse-numero-br';
import { TIPOLOGIA_USO_OODC } from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { CampoKV, NovoCard, NovoCardHead } from './novo-processo-ui';

type Fase = 'idle' | 'loading' | 'done' | 'error' | 'anexar' | 'confirmando' | 'confirmado';

const reProc = /^\d{4}\.\d{4}\/\d{7}-\d$/;

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtArea = (n: number) => n.toLocaleString('pt-BR') + ' m²';

const TIPO_OPCOES: { valor: TipoNovoProcesso; label: string; hint: string }[] = [
	{ valor: 'OUTORGA', label: 'Outorga', hint: 'Calcula pela API de cálculo da outorga' },
	{ valor: 'COTA', label: 'Cota', hint: 'Valor digitado manualmente' },
	{ valor: 'OUTORGA_COTA', label: 'Outorga/Cota', hint: 'Calcula a Outorga e depois pede o valor da Cota' },
	{ valor: 'AIU', label: 'AIU', hint: 'Outorga em Área de Intervenção Urbana' },
];

export default function FormNovoProcessoTecnico() {
	const [tipo, setTipo] = useState<TipoNovoProcesso>('OUTORGA');
	const [valor, setValor] = useState('');
	const [areaComputavel, setAreaComputavel] = useState('');
	const [areaTerreno, setAreaTerreno] = useState('');
	const [valorCota, setValorCota] = useState('');
	const [incluirMulta, setIncluirMulta] = useState(false);
	const [valorMulta, setValorMulta] = useState('');
	const [erro, setErro] = useState('');
	const [fase, setFase] = useState<Fase>('idle');
	const [resultado, setResultado] = useState<IGeoSampaResult | null>(null);
	const [erroApi, setErroApi] = useState('');
	const [pdfBaixado, setPdfBaixado] = useState(false);
	const [baixandoPdf, setBaixandoPdf] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const cotaValida = (parseNumeroBr(valorCota) ?? 0) > 0;
	const multaValida = !incluirMulta || (parseNumeroBr(valorMulta) ?? 0) > 0;

	function trocarTipo(novoTipo: TipoNovoProcesso) {
		setTipo(novoTipo);
		setErro('');
		setErroApi('');
	}

	function validar(v: string, computavel: number, terreno: number) {
		if (!v.trim()) return 'Informe o número do processo.';
		if (!reProc.test(v.trim())) return 'Número inválido. Formato esperado: 0000.0000/0000000-0.';
		if (tipo === 'COTA') return '';
		if (!(computavel > 0)) return 'Informe a área computável (m²).';
		if (!(terreno > 0)) return 'Informe a área do terreno (m²).';
		return '';
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (fase === 'loading') return;
		const v = valor.trim();
		const computavel = parseNumeroBr(areaComputavel) ?? 0;
		const terreno = parseNumeroBr(areaTerreno) ?? 0;
		const msg = validar(v, computavel, terreno);
		if (msg) {
			setErro(msg);
			inputRef.current?.focus();
			return;
		}
		if (tipo === 'COTA' && !cotaValida) {
			setErro('Informe o valor da Cota de Solidariedade.');
			return;
		}

		setErro('');
		setErroApi('');

		if (tipo === 'COTA') {
			// Sem cálculo via API — o valor já foi digitado; em seguida vem o memorial em PDF.
			setResultado(null);
			setFase('done');
			return;
		}

		setResultado(null);
		setFase('loading');

		const resp = await consultarCalculo(v, computavel, terreno);
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
		setAreaComputavel('');
		setAreaTerreno('');
		setValorCota('');
		setIncluirMulta(false);
		setValorMulta('');
		setPdfBaixado(false);
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	function montarDadosPdf(): DadosPdfCalculo {
		const par = resultado?.calculo_outorga ? resumoParametros(resultado.calculo_outorga) : null;
		const enqResumo = resultado ? resumoEnquadramento(resultado) : null;
		const loc = resultado?.localizacao_lote;
		const areaT = par?.area_terreno || parseNumeroBr(areaTerreno) || undefined;
		const areaC = par?.area_computavel || parseNumeroBr(areaComputavel) || undefined;
		return {
			numProcesso: valor.trim(),
			tipo,
			proprietario: resultado?.proprietario_interessado,
			endereco: resultado ? resumoEndereco(resultado) || undefined : undefined,
			sql: resultado?.sql_formatado || resultado?.sql_incra,
			setor: loc?.setor,
			quadra: loc?.quadra,
			lote: loc?.lote_atualizado || loc?.lote_cadastrado,
			codigoLogradouro: loc?.codigo_logradouro,
			distrito: enqResumo?.distrito || undefined,
			subprefeitura: enqResumo?.subprefeitura || undefined,
			zonas: enqResumo?.zonas.length ? enqResumo.zonas : undefined,
			tipologiaUso: enqResumo?.tipologia_uso_oodc
				? (TIPOLOGIA_USO_OODC[enqResumo.tipologia_uso_oodc] ?? enqResumo.tipologia_uso_oodc)
				: undefined,
			areaTerreno: areaT,
			areaComputavel: areaC,
			valorM2: par?.valor_m2_quadro14 || undefined,
			fatorPlanejamento: par?.fator_planejamento,
			fatorSocial: par?.fator_social,
			contrapartida: par?.valor_calculado_total || undefined,
			valorCota: tipo === 'COTA' || tipo === 'OUTORGA_COTA' ? parseNumeroBr(valorCota) : undefined,
			valorMulta: incluirMulta ? parseNumeroBr(valorMulta) : undefined,
		};
	}

	function irParaAnexar() {
		if (tipo !== 'COTA' && !resultado) return;
		if ((tipo === 'COTA' || tipo === 'OUTORGA_COTA') && !cotaValida) {
			setErroApi('Informe o valor da Cota de Solidariedade.');
			return;
		}
		if (incluirMulta && !multaValida) {
			setErroApi('Informe o valor da multa.');
			return;
		}
		setErroApi('');
		setPdfBaixado(false);
		setFase('anexar');
	}

	async function baixarPdf() {
		if (baixandoPdf) return;
		setBaixandoPdf(true);
		setErroApi('');
		try {
			const resp = await gerarPdfMemorialCalculo(montarDadosPdf());
			if (!resp.ok || !resp.base64 || !resp.filename) {
				setErroApi(resp.error ?? 'Não foi possível gerar o PDF do cálculo.');
				return;
			}
			const bin = atob(resp.base64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = resp.filename;
			a.click();
			URL.revokeObjectURL(url);
			setPdfBaixado(true);
		} finally {
			setBaixandoPdf(false);
		}
	}

	async function enviarAoCap() {
		if (tipo !== 'COTA' && !resultado) return;
		setFase('confirmando');
		const resp = await confirmarProcessoTecnico(
			valor.trim(),
			tipo,
			resultado ?? undefined,
			tipo === 'COTA' || tipo === 'OUTORGA_COTA' ? parseNumeroBr(valorCota) : undefined,
			incluirMulta ? parseNumeroBr(valorMulta) : undefined,
		);
		if (!resp.ok) {
			setFase('anexar');
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
						para iniciar os trâmites administrativos de pagamento da outorga. Confirme que o
						memorial em PDF foi juntado ao processo SEI.
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

	if (fase === 'anexar' || fase === 'confirmando') {
		const valorOutorga = par?.valor_calculado_total;
		const valorCotaNum = tipo === 'COTA' || tipo === 'OUTORGA_COTA' ? parseNumeroBr(valorCota) : undefined;
		const valorMultaNum = incluirMulta ? parseNumeroBr(valorMulta) : undefined;
		return (
			<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
				<NovoCardHead
					icon={FileText}
					title="Anexar memorial ao processo SEI"
					subtitle="Baixe o PDF do cálculo e junte-o ao processo antes de enviar à CAP"
				/>
				<div className="px-6 py-5">
					{erroApi && (
						<div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/8 px-4 py-3 text-[13px] font-medium text-destructive">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							{erroApi}
						</div>
					)}

					<div className="mb-5 rounded-[10px] border border-border bg-secondary px-4 py-3.5">
						<p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
							Processo
						</p>
						<p className="mt-1 font-mono text-[15px] font-semibold">{valor}</p>
						<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{valorOutorga != null && valorOutorga > 0 && (
								<p className="text-sm">
									<span className="text-muted-foreground">Outorga: </span>
									<span className="font-semibold">{fmtBRL(valorOutorga)}</span>
								</p>
							)}
							{valorCotaNum != null && valorCotaNum > 0 && (
								<p className="text-sm">
									<span className="text-muted-foreground">Cota: </span>
									<span className="font-semibold">{fmtBRL(valorCotaNum)}</span>
								</p>
							)}
							{valorMultaNum != null && valorMultaNum > 0 && (
								<p className="text-sm">
									<span className="text-muted-foreground">Multa: </span>
									<span className="font-semibold">{fmtBRL(valorMultaNum)}</span>
								</p>
							)}
						</div>
					</div>

					<ol className="mb-5 space-y-3 text-sm">
						<li className="flex items-start gap-2.5">
							<span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
								1
							</span>
							<span>
								Baixe o memorial de cálculo em PDF — ele detalha parâmetros, fórmula e o valor
								confirmado.
							</span>
						</li>
						<li className="flex items-start gap-2.5">
							<span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
								2
							</span>
							<span>Junte o arquivo ao processo SEI correspondente.</span>
						</li>
						<li className="flex items-start gap-2.5">
							<span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
								3
							</span>
							<span>Depois, envie o cadastro à CAP para iniciar o parcelamento.</span>
						</li>
					</ol>

					<button
						type="button"
						onClick={baixarPdf}
						disabled={baixandoPdf || fase === 'confirmando'}
						className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70 sm:w-auto">
						{baixandoPdf ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Gerando PDF…
							</>
						) : (
							<>
								<Download className="h-4 w-4" />
								Baixar PDF do cálculo
							</>
						)}
					</button>

					{pdfBaixado && (
						<p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-success">
							<CheckCircle2 className="h-4 w-4 shrink-0" />
							PDF baixado. Anexe-o ao processo SEI e envie à CAP.
						</p>
					)}
				</div>

				<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
					<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
						<Info className="h-3.5 w-3.5 shrink-0" />
						O processo só é gravado e enviado à CAP nesta etapa.
					</p>
					<div className="flex w-full gap-2.5 sm:w-auto">
						<button
							type="button"
							onClick={() => {
								setErroApi('');
								setFase('done');
							}}
							disabled={fase === 'confirmando' || baixandoPdf}
							className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-background disabled:opacity-60 sm:flex-none">
							Voltar
						</button>
						<button
							type="button"
							onClick={enviarAoCap}
							disabled={fase === 'confirmando' || baixandoPdf}
							className={cn(
								'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-70 sm:flex-none',
								pdfBaixado
									? 'border-primary bg-primary text-white hover:bg-primary/90'
									: 'border-border bg-card hover:bg-background',
							)}>
							{fase === 'confirmando' ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Enviando…
								</>
							) : (
								'Enviar ao CAP'
							)}
						</button>
					</div>
				</div>
			</NovoCard>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<NovoCard>
				<NovoCardHead
					icon={Calculator}
					title="Tipo de obrigação"
					subtitle="Define o que este processo vai cobrar do interessado"
				/>
				<div className="grid grid-cols-1 gap-3 px-[22px] py-5 sm:grid-cols-3">
					{TIPO_OPCOES.map((opcao) => (
						<button
							key={opcao.valor}
							type="button"
							disabled={fase === 'loading'}
							onClick={() => trocarTipo(opcao.valor)}
							className={cn(
								'flex flex-col items-start gap-1 rounded-[10px] border px-4 py-3 text-left transition-colors',
								tipo === opcao.valor
									? 'border-primary bg-primary-soft'
									: 'border-border bg-card hover:border-primary/40',
							)}>
							<span
								className={cn(
									'text-sm font-semibold',
									tipo === opcao.valor ? 'text-primary' : 'text-foreground',
								)}>
								{opcao.label}
							</span>
							<span className="text-[11.5px] text-muted-foreground">{opcao.hint}</span>
						</button>
					))}
				</div>
			</NovoCard>

			<NovoCard>
				<NovoCardHead
					icon={Search}
					title="Número do processo"
					subtitle={
						tipo === 'COTA'
							? 'Informe o número do processo e o valor da Cota de Solidariedade'
							: 'Informe o número do processo para consultar o cálculo da outorga'
					}
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
										{tipo === 'COTA' ? 'Continuar' : 'Calcular'}
									</>
								)}
							</button>
						</div>

						{tipo === 'COTA' ? (
							<div className="mt-4">
								<label
									htmlFor="valorCota"
									className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
									Valor da Cota de Solidariedade (R$)
								</label>
								<input
									id="valorCota"
									type="text"
									inputMode="decimal"
									value={valorCota}
									onChange={(e) => {
										setValorCota(e.target.value);
										if (erro) setErro('');
									}}
									placeholder="0,00"
									disabled={fase === 'loading'}
									autoComplete="off"
									className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
								/>
							</div>
						) : (
							<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div>
									<label
										htmlFor="areaComputavel"
										className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
										Área computável (m²)
									</label>
									<input
										id="areaComputavel"
										type="text"
										inputMode="decimal"
										value={areaComputavel}
										onChange={(e) => {
											setAreaComputavel(e.target.value);
											if (erro) setErro('');
										}}
										placeholder="0"
										disabled={fase === 'loading'}
										autoComplete="off"
										className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
									/>
								</div>
								<div>
									<label
										htmlFor="areaTerreno"
										className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
										Área do terreno (m²)
									</label>
									<input
										id="areaTerreno"
										type="text"
										inputMode="decimal"
										value={areaTerreno}
										onChange={(e) => {
											setAreaTerreno(e.target.value);
											if (erro) setErro('');
										}}
										placeholder="0"
										disabled={fase === 'loading'}
										autoComplete="off"
										className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
									/>
								</div>
							</div>
						)}

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

			{tipo !== 'COTA' && fase === 'done' && resultado && (
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
											<CampoKV label="Área do Terreno" value={fmtArea(par.area_terreno)} />
											<CampoKV label="Área Computável" value={fmtArea(par.area_computavel)} />
											<CampoKV label="Valor m² (Quadro 14)" value={fmtBRL(par.valor_m2_quadro14)} />
											<CampoKV
												label="Contrapartida calculada"
												value={fmtBRL(par.valor_calculado_total)}
												highlight
												full
											/>
										</div>
									</>
								)}

								{tipo === 'OUTORGA_COTA' && (
									<>
										<div className="my-5 h-px bg-border" />
										<label
											htmlFor="valorCotaOutorga"
											className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
											Valor da Cota de Solidariedade (R$)
										</label>
										<input
											id="valorCotaOutorga"
											type="text"
											inputMode="decimal"
											value={valorCota}
											onChange={(e) => setValorCota(e.target.value)}
											placeholder="0,00"
											disabled={fase === 'confirmando'}
											autoComplete="off"
											className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
										/>
									</>
								)}

								<div className="my-5 h-px bg-border" />
								{!incluirMulta ? (
									<button
										type="button"
										onClick={() => setIncluirMulta(true)}
										disabled={fase === 'confirmando'}
										className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
										Incluir Multa
									</button>
								) : (
									<div className="space-y-2">
										<div className="flex items-center justify-between gap-3">
											<label
												htmlFor="valorMultaOutorga"
												className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
												Valor da Multa (R$)
											</label>
											<button
												type="button"
												onClick={() => {
													setIncluirMulta(false);
													setValorMulta('');
												}}
												disabled={fase === 'confirmando'}
												className="text-xs text-muted-foreground underline-offset-2 hover:underline">
												Remover
											</button>
										</div>
										<input
											id="valorMultaOutorga"
											type="text"
											inputMode="decimal"
											value={valorMulta}
											onChange={(e) => setValorMulta(e.target.value)}
											placeholder="0,00"
											disabled={fase === 'confirmando'}
											autoComplete="off"
											className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
										/>
									</div>
								)}
							</>
						)}
					</div>

					<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
						<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
							<Check className="h-3.5 w-3.5 shrink-0" />
							Na próxima etapa você baixa o memorial em PDF para juntar ao processo SEI.
						</p>
						<div className="flex w-full gap-2.5 sm:w-auto">
							<button
								type="button"
								onClick={reiniciar}
								className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-background sm:flex-none">
								Cancelar
							</button>
							<button
								type="button"
								onClick={irParaAnexar}
								disabled={(tipo === 'OUTORGA_COTA' && !cotaValida) || !multaValida}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70 sm:flex-none">
								Confirmar cálculo
							</button>
						</div>
					</div>
				</NovoCard>
			)}

			{tipo === 'COTA' && fase === 'done' && (
				<NovoCard className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
					<NovoCardHead
						icon={Building}
						title="Confirmar Cota de Solidariedade"
						subtitle={
							<>
								Processo <b className="font-mono text-xs">{valor}</b> — valor digitado
								manualmente, sem consulta à API
							</>
						}
					/>
					<div className="px-6 py-5 space-y-4">
						<CampoKV
							label="Valor da Cota de Solidariedade"
							value={fmtBRL(parseNumeroBr(valorCota) ?? 0)}
							highlight
							full
						/>
						{!incluirMulta ? (
							<button
								type="button"
								onClick={() => setIncluirMulta(true)}
								disabled={fase === 'confirmando'}
								className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
								Incluir Multa
							</button>
						) : (
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3">
									<label
										htmlFor="valorMultaCota"
										className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
										Valor da Multa (R$)
									</label>
									<button
										type="button"
										onClick={() => {
											setIncluirMulta(false);
											setValorMulta('');
										}}
										disabled={fase === 'confirmando'}
										className="text-xs text-muted-foreground underline-offset-2 hover:underline">
										Remover
									</button>
								</div>
								<input
									id="valorMultaCota"
									type="text"
									inputMode="decimal"
									value={valorMulta}
									onChange={(e) => setValorMulta(e.target.value)}
									placeholder="0,00"
									disabled={fase === 'confirmando'}
									autoComplete="off"
									className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
								/>
							</div>
						)}
					</div>
					<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
						<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
							<Check className="h-3.5 w-3.5 shrink-0" />
							Na próxima etapa você baixa o memorial em PDF para juntar ao processo SEI.
						</p>
						<div className="flex w-full gap-2.5 sm:w-auto">
							<button
								type="button"
								onClick={reiniciar}
								className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-background sm:flex-none">
								Cancelar
							</button>
							<button
								type="button"
								onClick={irParaAnexar}
								disabled={!multaValida}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70 sm:flex-none">
								Confirmar cálculo
							</button>
						</div>
					</div>
				</NovoCard>
			)}
		</div>
	);
}

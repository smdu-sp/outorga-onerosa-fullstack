'use client';

import { FiltroSegmented } from '@/components/filtro-ui';
import { formatarNumeroProcesso, numeroProcessoValido, PLACEHOLDER_NUMERO_PROCESSO, type FormatoNumeroProcesso } from '@/lib/mascara-processo';
import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	Building,
	Calculator,
	CheckCircle2,
	Download,
	FileText,
	Hash,
	Info,
	Loader2,
	Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	buscarDadosProcessoNovoAction,
	confirmarProcessoTecnico,
	gerarPdfMemorialCalculo,
	type TipoNovoProcesso,
} from '../actions-tecnico';
import type { DadosPdfCalculo } from '@/types/pdf-calculo-outorga';
import { parseNumeroBr } from '@/lib/parse-numero-br';
import { calcularMemorial } from '@/lib/oodc/calculo';
import type { EntradaCalculoOodc, ResultadoCalculoOodc } from '@/lib/oodc/tipos';
import { calcularCota } from '@/lib/cota/calculo';
import type { EntradaCalculoCota, ResultadoCalculoCota } from '@/lib/cota/tipos';
import { PainelCalculoOodc, type CamposOodcNaoEncontrados } from './painel-calculo-oodc';
import { PainelCalculoCota } from './painel-calculo-cota';
import { NovoCard, NovoCardHead } from './novo-processo-ui';

type Fase = 'preenchendo' | 'anexar' | 'confirmando' | 'confirmado';


const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TIPO_OPCOES: { valor: TipoNovoProcesso; label: string; hint: string }[] = [
	{ valor: 'OUTORGA', label: 'Outorga', hint: 'Calcula pelo memorial da OODC' },
	{ valor: 'COTA', label: 'Cota', hint: 'Calcula pelo memorial da Cota de Solidariedade' },
	{ valor: 'OUTORGA_COTA', label: 'Outorga/Cota', hint: 'Calcula os dois memoriais' },
	{ valor: 'AIU', label: 'AIU', hint: 'Outorga em Área de Intervenção Urbana' },
];

export default function FormNovoProcessoTecnico() {
	const [tipo, setTipo] = useState<TipoNovoProcesso>('OUTORGA');
	const [formato, setFormato] = useState<FormatoNumeroProcesso>('SEI');
	const [valor, setValor] = useState('');
	const [incluirMulta, setIncluirMulta] = useState(false);
	const [valorMulta, setValorMulta] = useState('');
	const [erro, setErro] = useState('');
	const [fase, setFase] = useState<Fase>('preenchendo');
	const [erroApi, setErroApi] = useState('');
	const [pdfBaixado, setPdfBaixado] = useState(false);
	const [baixandoPdf, setBaixandoPdf] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const [entradaOodc, setEntradaOodc] = useState<EntradaCalculoOodc>();
	const [resultadoOodc, setResultadoOodc] = useState<ResultadoCalculoOodc>();
	const [entradaCota, setEntradaCota] = useState<EntradaCalculoCota>();
	const [resultadoCota, setResultadoCota] = useState<ResultadoCalculoCota>();
	const [tipologiasOrigemBi, setTipologiasOrigemBi] = useState<Record<string, string>>({});
	const [naoEncontradosOodc, setNaoEncontradosOodc] = useState<CamposOodcNaoEncontrados>();
	const [enderecosNaoEncontradosCota, setEnderecosNaoEncontradosCota] = useState<Set<number>>();
	const [buscaVersao, setBuscaVersao] = useState(0);
	const [isPendingBusca, startTransitionBusca] = useTransition();

	const precisaCalculo = tipo === 'OUTORGA' || tipo === 'OUTORGA_COTA' || tipo === 'AIU';
	const precisaCota = tipo === 'COTA' || tipo === 'OUTORGA_COTA';
	const multaValida = !incluirMulta || (parseNumeroBr(valorMulta) ?? 0) > 0;

	function trocarTipo(novoTipo: TipoNovoProcesso) {
		setTipo(novoTipo);
		setErro('');
		setErroApi('');
	}

	function buscarDadosBi() {
		const v = valor.trim();
		if (!numeroProcessoValido(v, formato)) {
			setErro('Informe um número de processo válido (0000.0000/0000000-0) antes de buscar.');
			inputRef.current?.focus();
			return;
		}
		setErro('');
		startTransitionBusca(async () => {
			const resposta = await buscarDadosProcessoNovoAction(v);
			if (!resposta.ok || !resposta.rascunho) {
				toast.error(resposta.error ?? 'Não foi possível buscar o processo no BI.');
				return;
			}
			const { rascunho } = resposta;

			const tipologias = rascunho.oodc.entrada.tipologias.length
				? rascunho.oodc.entrada.tipologias
				: [
						{
							chave: 'busca-vazia',
							idTipologia: 0,
							caBasico: 0,
							caMaximo: 0,
							terrenoM2: 0,
							computavelM2: 0,
							tdcM2: 0,
							outorgaAdquiridaM2: 0,
						},
					];
			const entradaOodcNova: EntradaCalculoOodc = { ...rascunho.oodc.entrada, tipologias };
			setEntradaOodc(entradaOodcNova);
			setResultadoOodc(calcularMemorial(entradaOodcNova, rascunho.oodc.vMax, rascunho.oodc.valoresEncontrados));
			setTipologiasOrigemBi(rascunho.oodc.tipologiasOrigemBi);

			const idAssuntoSugerido = rascunho.oodc.assuntoCandidatos.find((c) => c.idSugerido != null)?.idSugerido ?? null;
			const enderecosOodcNaoEncontrados = new Set<number>();
			entradaOodcNova.enderecos.forEach((e, idx) => {
				if (!(e.setor.trim() && e.quadra.trim() && e.codlog.trim())) enderecosOodcNaoEncontrados.add(idx);
			});
			const tipologiasNaoEncontradas = new Set<string>();
			entradaOodcNova.tipologias.forEach((t) => {
				if (rascunho.oodc.tipologiasOrigemBi[t.chave] && t.idTipologia === 0) tipologiasNaoEncontradas.add(t.chave);
			});
			setNaoEncontradosOodc({
				assunto: idAssuntoSugerido == null,
				legislacao: rascunho.oodc.legislacaoSugestao.idLegislacao == null,
				macrozona: entradaOodcNova.idMacrozona === 0,
				macroarea: entradaOodcNova.idMacroarea === 0,
				zona: entradaOodcNova.idZona === 0,
				enderecos: enderecosOodcNaoEncontrados,
				tipologias: tipologiasNaoEncontradas,
			});

			const entradaCotaNova: EntradaCalculoCota = {
				areaTerrenoEscrituraM2: 0,
				areaTerrenoRealM2: 0,
				enderecos: rascunho.cota.enderecos,
			};
			setEntradaCota(entradaCotaNova);
			setResultadoCota(calcularCota(entradaCotaNova, rascunho.cota.vMax, rascunho.cota.valoresEncontrados));
			const enderecosCotaNaoEncontrados = new Set<number>();
			rascunho.cota.enderecos.forEach((e, idx) => {
				if (!(e.setor.trim() && e.quadra.trim() && e.codlog.trim())) enderecosCotaNaoEncontrados.add(idx);
			});
			setEnderecosNaoEncontradosCota(enderecosCotaNaoEncontrados);

			setBuscaVersao((atual) => atual + 1);

			const partes = [
				entradaOodcNova.idMacrozona ? 'macrozona' : null,
				entradaOodcNova.idMacroarea ? 'macroárea' : null,
				entradaOodcNova.enderecos.some((e) => e.setor && e.quadra) ? 'SQL' : null,
				entradaOodcNova.enderecos.some((e) => e.codlog) ? 'CODLOG' : null,
				Object.keys(rascunho.oodc.tipologiasOrigemBi).length ? 'tipologias' : null,
			].filter(Boolean);
			if (!partes.length) {
				toast.warning('Processo localizado, mas sem enquadramento/SQL/tipologias para preencher — confira os campos em vermelho.');
			} else {
				toast.success(`Preenchido a partir do BI: ${partes.join(', ')}. Confira os campos em vermelho.`);
			}
		});
	}

	function continuar() {
		const v = valor.trim();
		if (!v) {
			setErro('Informe o número do processo.');
			inputRef.current?.focus();
			return;
		}
		if (!numeroProcessoValido(v, formato)) {
			setErro('Número inválido. Formato esperado: 0000.0000/0000000-0.');
			inputRef.current?.focus();
			return;
		}
		if (precisaCalculo && !entradaOodc?.idLegislacao) {
			setErro('Selecione a legislação da OODC antes de continuar.');
			return;
		}
		if (precisaCota && !(resultadoCota && resultadoCota.terrenoUsadoM2 > 0)) {
			setErro('Informe a área de terreno da Cota de Solidariedade antes de continuar.');
			return;
		}
		if (incluirMulta && !multaValida) {
			setErro('Informe o valor da multa.');
			return;
		}
		setErro('');
		setErroApi('');
		setPdfBaixado(false);
		setFase('anexar');
	}

	function montarDadosPdf(): DadosPdfCalculo {
		const enderecoRef =
			entradaOodc?.enderecos.find((e) => e.setor.trim() && e.quadra.trim()) ??
			entradaCota?.enderecos.find((e) => e.setor.trim() && e.quadra.trim());
		const umaTipologia = resultadoOodc?.tipologias.length === 1 ? resultadoOodc.tipologias[0] : undefined;
		return {
			numProcesso: valor.trim(),
			tipo,
			setor: enderecoRef?.setor,
			quadra: enderecoRef?.quadra,
			codigoLogradouro: enderecoRef?.codlog,
			areaTerreno: resultadoOodc?.somaTerrenoM2 || resultadoCota?.terrenoUsadoM2 || undefined,
			areaComputavel: resultadoOodc?.somaComputavelM2 || undefined,
			valorM2: resultadoOodc?.vMax ?? resultadoCota?.vMax ?? undefined,
			fatorPlanejamento: umaTipologia?.fp,
			fatorSocial: umaTipologia?.fs,
			contrapartida: resultadoOodc?.valorTotalLiquidoRs,
			valorCota: precisaCota ? resultadoCota?.valorTotalRs : undefined,
			valorMulta: incluirMulta ? parseNumeroBr(valorMulta) : undefined,
		};
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
		setFase('confirmando');
		const resp = await confirmarProcessoTecnico(
			valor.trim(),
			tipo,
			entradaOodc,
			resultadoOodc,
			entradaCota,
			resultadoCota,
			incluirMulta ? parseNumeroBr(valorMulta) : undefined,
		);
		if (!resp.ok) {
			setFase('anexar');
			setErroApi(resp.error ?? 'Erro ao confirmar o processo.');
			return;
		}
		setFase('confirmado');
	}

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
		const valorOutorga = resultadoOodc?.valorTotalLiquidoRs;
		const valorCotaNum = precisaCota ? resultadoCota?.valorTotalRs : undefined;
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
								setFase('preenchendo');
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
					subtitle="Informe o número do processo (SEI) e busque no BI para pré-preencher o cálculo"
				/>
				<div className="px-[22px] py-5">
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
									setValor(formatarNumeroProcesso(e.target.value, formato));
									if (erro) setErro('');
								}}
								placeholder={PLACEHOLDER_NUMERO_PROCESSO[formato]}
								autoFocus
								spellCheck={false}
								autoComplete="off"
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										buscarDadosBi();
									}
								}}
								className="h-12 w-full border-none bg-transparent font-mono text-base outline-none placeholder:text-muted-foreground"
							/>
						</div>
						<button
							type="button"
							onClick={buscarDadosBi}
							disabled={isPendingBusca}
							className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70">
							{isPendingBusca ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Buscando…
								</>
							) : (
								<>
									<Search className="h-4 w-4" />
									Buscar no BI
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
							Formato {formato === 'SEI' ? 'SEI' : 'f?sico'}: <span className="font-mono">{PLACEHOLDER_NUMERO_PROCESSO[formato]}</span>
						</div>
					)}
				</div>
			</NovoCard>

			{precisaCalculo && (
				<PainelCalculoOodc
					key={`oodc-${buscaVersao}`}
					valorInicial={entradaOodc}
					resultadoInicial={resultadoOodc}
					tipologiasOrigemBi={tipologiasOrigemBi}
					naoEncontrados={naoEncontradosOodc}
					onChange={(e, r) => {
						setEntradaOodc(e);
						setResultadoOodc(r);
					}}
				/>
			)}

			{precisaCota && (
				<PainelCalculoCota
					key={`cota-${buscaVersao}`}
					valorInicial={entradaCota}
					resultadoInicial={resultadoCota}
					enderecosNaoEncontrados={enderecosNaoEncontradosCota}
					onChange={(e, r) => {
						setEntradaCota(e);
						setResultadoCota(r);
					}}
				/>
			)}

			<NovoCard>
				<div className="px-[22px] py-5">
					{!incluirMulta ? (
						<button
							type="button"
							onClick={() => setIncluirMulta(true)}
							className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-secondary">
							Incluir Multa
						</button>
					) : (
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-3">
								<label
									htmlFor="valorMulta"
									className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
									Valor da Multa (R$)
								</label>
								<button
									type="button"
									onClick={() => {
										setIncluirMulta(false);
										setValorMulta('');
									}}
									className="text-xs text-muted-foreground underline-offset-2 hover:underline">
									Remover
								</button>
							</div>
							<input
								id="valorMulta"
								type="text"
								inputMode="decimal"
								value={valorMulta}
								onChange={(e) => setValorMulta(e.target.value)}
								placeholder="0,00"
								autoComplete="off"
								className="h-11 w-full rounded-[10px] border border-border bg-secondary px-3.5 text-sm outline-none placeholder:text-muted-foreground"
							/>
						</div>
					)}
				</div>
			</NovoCard>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={continuar}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">
					<Building className="h-4 w-4" />
					Continuar
				</button>
			</div>
		</div>
	);
}

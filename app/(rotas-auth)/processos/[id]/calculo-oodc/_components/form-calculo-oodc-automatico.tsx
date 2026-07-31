'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcularMemorial } from '@/lib/oodc/calculo';
import { parseNumeroBr } from '@/lib/parse-numero-br';
import {
	AREAS_AIU,
	ASSUNTOS,
	BASE_CAL,
	BASE_FRUI,
	BASE_MEL,
	CLASSIFICACAO_EMPREENDIMENTO,
	IDS_LEGISLACAO_PIU_CENTRAL,
	LEIS,
	MACROAREAS,
	MACROZONAS,
	TIPOLOGIAS,
	ZONAS,
} from '@/lib/oodc/tabelas';
import type {
	DeducoesContrapartida,
	EnderecoValorUnitario,
	EntradaCalculoOodc,
	ParametrosQualificadores,
	TipologiaCalculo,
	ValorUnitarioEncontrado,
} from '@/lib/oodc/tipos';
import type { MemorialResumoDto, RascunhoCalculoOodc } from '@/lib/server/oodc-memorial';
import { buscarValorReferenciaAction, salvarMemorialCalculoAction } from '../actions';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number, casas = 4) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

let contador = 0;
function novaChave() {
	contador += 1;
	return `t${contador}`;
}

function tipologiaVazia(caSugerido?: { caBasico: number; caMaximo: number } | null): TipologiaCalculo {
	return {
		chave: novaChave(),
		idTipologia: 0,
		caBasico: caSugerido?.caBasico ?? 0,
		caMaximo: caSugerido?.caMaximo ?? 0,
		terrenoM2: 0,
		computavelM2: 0,
		tdcM2: 0,
		outorgaAdquiridaM2: 0,
	};
}

function AutoBadge({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
			auto
		</span>
	);
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{titulo}</CardTitle>
				{subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</CardContent>
		</Card>
	);
}

function Campo({
	label,
	hint,
	auto,
	children,
}: {
	label: string;
	hint?: string;
	auto?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="block min-h-8 text-[11px] font-semibold uppercase leading-tight tracking-[0.03em] text-muted-foreground">
				{label}
				<AutoBadge show={!!auto} />
			</label>
			{children}
			{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
		</div>
	);
}

function formatarNumeroBr(n: number): string {
	return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : '';
}

/** Campo numérico em formato BR — aceita milhar com "." e decimal com "," (ex.:
 * "2.099,06"). Mantém o texto digitado livre enquanto o campo está focado (pra não
 * atropelar o cursor) e só reformata ao perder o foco. */
function CampoNumero({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	const [texto, setTexto] = useState(() => formatarNumeroBr(value));
	const focado = useRef(false);

	useEffect(() => {
		if (!focado.current) setTexto(formatarNumeroBr(value));
	}, [value]);

	return (
		<Input
			type="text"
			inputMode="decimal"
			placeholder="0"
			value={texto}
			onFocus={() => {
				focado.current = true;
			}}
			onChange={(e) => {
				setTexto(e.target.value);
				onChange(parseNumeroBr(e.target.value) ?? 0);
			}}
			onBlur={() => {
				focado.current = false;
				setTexto(formatarNumeroBr(value));
			}}
		/>
	);
}

function CampoSelect({
	value,
	onChange,
	opcoes,
	placeholder = 'Selecionar',
}: {
	value: number;
	onChange: (v: number) => void;
	opcoes: { id: number; nome?: string; descricao?: string; classe?: string; sigla?: string }[];
	placeholder?: string;
}) {
	return (
		<select
			className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
			value={value}
			onChange={(e) => onChange(Number(e.target.value))}>
			<option value={0}>{placeholder}</option>
			{opcoes.map((o) => (
				<option key={o.id} value={o.id}>
					{o.classe ? `${o.classe} — ${o.descricao}` : o.sigla ? `${o.sigla} — ${o.nome}` : o.nome}
				</option>
			))}
		</select>
	);
}

export function FormCalculoOodcAutomatico({
	processoId,
	rascunho,
	historicoInicial,
}: {
	processoId: string;
	rascunho: RascunhoCalculoOodc;
	historicoInicial: MemorialResumoDto[];
}) {
	const [entrada, setEntrada] = useState<EntradaCalculoOodc>(rascunho.entrada);
	const [valoresEncontrados, setValoresEncontrados] = useState<ValorUnitarioEncontrado[]>(rascunho.valoresEncontrados);
	const [vMax, setVMax] = useState<number | null>(rascunho.vMax);
	const [isPending, startTransition] = useTransition();
	const [isPendingSalvar, startTransitionSalvar] = useTransition();
	const [historico, setHistorico] = useState(historicoInicial);

	const [legislacaoTocada, setLegislacaoTocada] = useState(false);
	const [opcaoExpressaRegimeNovo, setOpcaoExpressaRegimeNovo] = useState(false);
	const [despachoDecisorioEmitido, setDespachoDecisorioEmitido] = useState(false);

	const piuCentral = (IDS_LEGISLACAO_PIU_CENTRAL as readonly number[]).includes(entrada.idLegislacao);
	const idAssuntoSugerido = rascunho.assuntoCandidatos.find((c) => c.idSugerido != null)?.idSugerido ?? null;
	const qtdEnderecosAuto = rascunho.entrada.enderecos.filter((e) => e.setor && e.quadra).length;
	const resultadoRef = useRef<HTMLDivElement>(null);

	const resultado = useMemo(
		() => calcularMemorial(entrada, vMax, valoresEncontrados),
		[entrada, vMax, valoresEncontrados],
	);

	function atualizar<K extends keyof EntradaCalculoOodc>(campo: K, valor: EntradaCalculoOodc[K]) {
		setEntrada((prev) => ({ ...prev, [campo]: valor }));
	}

	function atualizarEndereco(idx: number, campo: keyof EnderecoValorUnitario, valor: string) {
		setEntrada((prev) => ({
			...prev,
			enderecos: prev.enderecos.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)),
		}));
	}

	function adicionarEndereco() {
		if (entrada.enderecos.length >= 10) return;
		setEntrada((prev) => ({ ...prev, enderecos: [...prev.enderecos, { setor: '', quadra: '', codlog: '' }] }));
	}

	function removerEndereco(idx: number) {
		setEntrada((prev) => ({ ...prev, enderecos: prev.enderecos.filter((_, i) => i !== idx) }));
	}

	function atualizarQualificadores<K extends keyof ParametrosQualificadores>(
		campo: K,
		valor: ParametrosQualificadores[K],
	) {
		setEntrada((prev) => ({ ...prev, qualificadores: { ...prev.qualificadores, [campo]: valor } }));
	}

	function atualizarDeducoes<K extends keyof DeducoesContrapartida>(campo: K, valor: DeducoesContrapartida[K]) {
		setEntrada((prev) => ({ ...prev, deducoes: { ...prev.deducoes, [campo]: valor } }));
	}

	function atualizarTipologia<K extends keyof TipologiaCalculo>(chave: string, campo: K, valor: TipologiaCalculo[K]) {
		setEntrada((prev) => ({
			...prev,
			tipologias: prev.tipologias.map((t) => (t.chave === chave ? { ...t, [campo]: valor } : t)),
		}));
	}

	function adicionarTipologia() {
		if (entrada.tipologias.length >= 7) return;
		setEntrada((prev) => ({ ...prev, tipologias: [...prev.tipologias, tipologiaVazia(rascunho.caSugerido)] }));
	}

	function removerTipologia(chave: string) {
		setEntrada((prev) => ({ ...prev, tipologias: prev.tipologias.filter((t) => t.chave !== chave) }));
	}

	function usarCaSugerido(chave: string) {
		if (!rascunho.caSugerido) return;
		atualizarTipologia(chave, 'caBasico', rascunho.caSugerido.caBasico);
		atualizarTipologia(chave, 'caMaximo', rascunho.caSugerido.caMaximo);
	}

	function buscarValores() {
		const enderecos = entrada.enderecos.filter((e) => e.setor.trim() && e.quadra.trim() && e.codlog.trim());
		if (!enderecos.length) {
			toast.error('Preencha setor/quadra/codlog de pelo menos um endereço.');
			return;
		}
		startTransition(async () => {
			const resposta = await buscarValorReferenciaAction(enderecos);
			if (!resposta.ok) {
				toast.error(resposta.error ?? 'Não foi possível buscar o valor de referência.');
				return;
			}
			setValoresEncontrados(resposta.valores ?? []);
			setVMax(resposta.vMax ?? null);
			if (resposta.vMax == null) {
				toast.warning('Nenhum valor de referência encontrado para os endereços informados.');
			} else {
				toast.success(`V_MÁXIMO encontrado: ${fmtBRL(resposta.vMax)}/m²`);
			}
		});
	}

	function salvarMemorial() {
		if (!entrada.idLegislacao) {
			toast.error('Selecione a legislação antes de salvar.');
			return;
		}
		startTransitionSalvar(async () => {
			const resposta = await salvarMemorialCalculoAction(processoId, entrada, resultado, {
				legislacaoOrigem: legislacaoTocada ? 'MANUAL' : rascunho.legislacaoSugestao.idLegislacao ? 'SUGERIDA' : 'MANUAL',
				legislacaoObservacao: legislacaoTocada ? undefined : rascunho.legislacaoSugestao.motivo,
				opcaoExpressaRegimeNovo,
				despachoDecisorioEmitido,
			});
			if (!resposta.ok) {
				toast.error(resposta.error ?? 'Não foi possível salvar o memorial de cálculo.');
				return;
			}
			toast.success('Memorial de cálculo salvo.');
			setHistorico((prev) => [
				{
					id: resposta.id!,
					criadoEm: new Date().toISOString(),
					criadoPorNome: null,
					idLegislacao: entrada.idLegislacao,
					legislacaoOrigem: legislacaoTocada ? 'MANUAL' : 'SUGERIDA',
					dataReferencia: (entrada.dataReferencia ?? new Date().toISOString().slice(0, 10)),
					valorTotalBrutoRs: resultado.valorTotalBrutoRs,
					valorTotalLiquidoRs: resultado.valorTotalLiquidoRs,
				},
				...prev,
			]);
		});
	}

	// O cálculo já é reativo (useMemo abaixo recalcula a cada mudança) — este botão
	// existe para dar um ponto de ação físico no fim da página: rola até o resultado
	// e confirma o total atual, sem precisar voltar pro topo pra conferir.
	function recalcular() {
		resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		toast.success(`Recalculado — valor líquido: ${fmtBRL(resultado.valorTotalLiquidoRs)}`);
	}

	const motivosValorZerado: string[] = [];
	if (resultado.valorTotalLiquidoRs === 0 && entrada.tipologias.length > 0) {
		if (!entrada.idLegislacao) motivosValorZerado.push('Legislação não selecionada');
		if (!entrada.idMacroarea) motivosValorZerado.push('Macroárea não selecionada (afeta o Fp)');
		if (!entrada.idZona) motivosValorZerado.push('Zona de uso não selecionada (afeta o Fp)');
		if (entrada.tipologias.some((t) => !t.idTipologia))
			motivosValorZerado.push(
				'Alguma tipologia sem "Classe — Descrição" selecionada — o BI sugere o Computável (m²), mas nem sempre dá pra inferir a tipologia exata (ex.: HMP até 50m² ou 51-70m²); sem ela, Fp e Fs ficam zerados',
			);
		if (vMax == null) motivosValorZerado.push('V_MÁXIMO não encontrado — busque o V nos endereços');
		if (entrada.tipologias.every((t) => t.terrenoM2 <= 0)) motivosValorZerado.push('Terreno (m²) zerado em todas as tipologias');
		if (entrada.tipologias.every((t) => t.computavelM2 <= 0)) motivosValorZerado.push('Computável (m²) zerado em todas as tipologias');
	}

	return (
		<div className="flex flex-col gap-5">
			<Secao titulo="Cabeçalho">
				<Campo label="Assunto" auto={entrada.idAssunto !== 0 && entrada.idAssunto === idAssuntoSugerido}>
					<CampoSelect value={entrada.idAssunto} onChange={(v) => atualizar('idAssunto', v)} opcoes={ASSUNTOS} />
					{rascunho.assuntoCandidatos.length > 0 && (
						<p className="text-[11px] text-muted-foreground">
							BI: {rascunho.assuntoCandidatos.map((c) => c.assunto).join('; ')}
						</p>
					)}
				</Campo>
				<Campo label="Macrozona" auto={entrada.idMacrozona !== 0 && entrada.idMacrozona === rascunho.entrada.idMacrozona}>
					<CampoSelect value={entrada.idMacrozona} onChange={(v) => atualizar('idMacrozona', v)} opcoes={MACROZONAS} />
				</Campo>
				<Campo label="Macroárea" auto={entrada.idMacroarea !== 0 && entrada.idMacroarea === rascunho.entrada.idMacroarea}>
					<CampoSelect value={entrada.idMacroarea} onChange={(v) => atualizar('idMacroarea', v)} opcoes={MACROAREAS} />
				</Campo>
				<Campo
					label={piuCentral ? 'Área - PIU Central' : 'Zona de uso'}
					auto={entrada.idZona !== 0 && entrada.idZona === rascunho.entrada.idZona}>
					<CampoSelect value={entrada.idZona} onChange={(v) => atualizar('idZona', v)} opcoes={ZONAS} />
				</Campo>
				{piuCentral && (
					<Campo label="Área AIU (Qualificação/Transformação)">
						<CampoSelect
							value={entrada.idAreaAiu ?? 0}
							onChange={(v) => atualizar('idAreaAiu', v)}
							opcoes={AREAS_AIU.map((a) => ({ id: a.id, nome: `${a.area} - ${a.tipo}` }))}
						/>
					</Campo>
				)}
			</Secao>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
						Legislação
						<AutoBadge show={!legislacaoTocada && rascunho.legislacaoSugestao.idLegislacao != null} />
					</CardTitle>
					<p className="text-xs text-muted-foreground">{rascunho.legislacaoSugestao.motivo}</p>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Campo label="Legislação">
						<CampoSelect
							value={entrada.idLegislacao}
							onChange={(v) => {
								setLegislacaoTocada(true);
								atualizar('idLegislacao', v);
							}}
							opcoes={LEIS}
						/>
					</Campo>
					<div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-3 text-xs">
						{rascunho.legislacaoSugestao.avisos.map((aviso, idx) => (
							<p key={idx} className="text-muted-foreground">
								⚠️ {aviso}
							</p>
						))}
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={opcaoExpressaRegimeNovo}
								onChange={(e) => setOpcaoExpressaRegimeNovo(e.target.checked)}
							/>
							Há opção expressa do interessado pelo regime novo
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={despachoDecisorioEmitido}
								onChange={(e) => setDespachoDecisorioEmitido(e.target.checked)}
							/>
							Já foi emitido despacho decisório para este processo
						</label>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Valores unitários (V)
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							<AutoBadge show={qtdEnderecosAuto > 0} /> {qtdEnderecosAuto} endereço(s) vieram do lote local +
							BI (dbo.prata_sql_incra — processos com terreno remembrado trazem vários SQLs); o codlog dos
							demais é uma sugestão (mesmo do 1º endereço) — confira antes de calcular. V_MÁXIMO = maior
							valor vigente encontrado.
						</p>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={buscarValores} disabled={isPending}>
						{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar V'}
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{entrada.enderecos.map((e, idx) => {
						const encontrado = valoresEncontrados[idx];
						return (
							<div key={idx} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto_auto]">
								<div className="hidden w-10 sm:block">
									<AutoBadge show={idx < qtdEnderecosAuto} />
								</div>
								<Input placeholder="Setor" value={e.setor} onChange={(ev) => atualizarEndereco(idx, 'setor', ev.target.value)} />
								<Input placeholder="Quadra" value={e.quadra} onChange={(ev) => atualizarEndereco(idx, 'quadra', ev.target.value)} />
								<Input placeholder="Codlog" value={e.codlog} onChange={(ev) => atualizarEndereco(idx, 'codlog', ev.target.value)} />
								<div className="flex min-w-[140px] items-center px-2 text-xs text-muted-foreground">
									{encontrado?.valor != null ? `${fmtBRL(encontrado.valor)} (${encontrado.dataVigencia})` : '—'}
								</div>
								<Button type="button" variant="ghost" size="icon" onClick={() => removerEndereco(idx)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						);
					})}
					<Button type="button" variant="outline" size="sm" className="w-fit" onClick={adicionarEndereco} disabled={entrada.enderecos.length >= 10}>
						<Plus className="mr-1 h-4 w-4" /> Adicionar endereço
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
						Parâmetros qualificadores da ocupação
					</CardTitle>
					<p className="text-xs text-muted-foreground">
						Benefícios de área e bases legais — 100% manual. Mesma ordem da planilha oficial; fundamento
						legal fixo (sem lista) vem desabilitado.
					</p>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Parâmetro</TableHead>
								<TableHead>Fundamento legal</TableHead>
								<TableHead className="w-40">Valor (m²)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell>Área de doação para alargamento de passeio público</TableCell>
								<TableCell>
									<CampoSelect value={entrada.qualificadores.baseLegalCalId} onChange={(v) => atualizarQualificadores('baseLegalCalId', v)} opcoes={BASE_CAL} />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaDoacaoCalcadaM2} onChange={(v) => atualizarQualificadores('areaDoacaoCalcadaM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de reserva para alargamento de passeio público</TableCell>
								<TableCell>
									<Input disabled value="artigo 37 da Lei 18.081/2024" />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaReservaCalcadaM2} onChange={(v) => atualizarQualificadores('areaReservaCalcadaM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de reserva para fruição pública</TableCell>
								<TableCell>
									<CampoSelect value={entrada.qualificadores.baseLegalFruiId} onChange={(v) => atualizarQualificadores('baseLegalFruiId', v)} opcoes={BASE_FRUI} />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaResFruicaoM2} onChange={(v) => atualizarQualificadores('areaResFruicaoM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de reserva para praça pública</TableCell>
								<TableCell>
									<Input disabled value="artigo 82-A da Lei 17.975/2023" />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaReservaPracaM2} onChange={(v) => atualizarQualificadores('areaReservaPracaM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de desapropriação para melhoramento viário</TableCell>
								<TableCell>
									<CampoSelect value={entrada.qualificadores.baseLegalDesMelId} onChange={(v) => atualizarQualificadores('baseLegalDesMelId', v)} opcoes={BASE_MEL} />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaDesapropriacaoMelhoramentoM2} onChange={(v) => atualizarQualificadores('areaDesapropriacaoMelhoramentoM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de doação para melhoramento viário</TableCell>
								<TableCell>
									<CampoSelect value={entrada.qualificadores.baseLegalMelId} onChange={(v) => atualizarQualificadores('baseLegalMelId', v)} opcoes={BASE_MEL} />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaDoacaoMelhoramentoM2} onChange={(v) => atualizarQualificadores('areaDoacaoMelhoramentoM2', v)} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Área de doação de áreas verdes</TableCell>
								<TableCell>
									<Input disabled value="artigo 12 da Lei 17.844/2022" />
								</TableCell>
								<TableCell>
									<CampoNumero value={entrada.qualificadores.areaDoacaoVerdeM2} onChange={(v) => atualizarQualificadores('areaDoacaoVerdeM2', v)} />
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Secao titulo="Parâmetros da ocupação do solo" subtitulo="Usado na penalidade do Fator Social (Fs) das leis mais recentes — manual">
				<Campo label="Cota parte máxima de terreno por unidade habitacional efetiva (m²/UH)">
					<CampoNumero value={entrada.ocupacaoSolo.cotaParteMaximaM2} onChange={(v) => atualizar('ocupacaoSolo', { cotaParteMaximaM2: v })} />
				</Campo>
			</Secao>

			<Secao titulo="Valores a deduzir e classificação do empreendimento" subtitulo="100% manual">
				<Campo label="Outorga recolhida em projeto aprovado anterior (R$)">
					<CampoNumero value={entrada.deducoes.outorgaProjetoAnteriorRs} onChange={(v) => atualizarDeducoes('outorgaProjetoAnteriorRs', v)} />
				</Campo>
				<Campo label="Incentivo de certificação (R$)">
					<CampoNumero value={entrada.deducoes.incentivoCertificacaoRs} onChange={(v) => atualizarDeducoes('incentivoCertificacaoRs', v)} />
				</Campo>
				<Campo label="Incentivo de cota ambiental (R$)">
					<CampoNumero value={entrada.deducoes.incentivoCotaAmbientalRs} onChange={(v) => atualizarDeducoes('incentivoCotaAmbientalRs', v)} />
				</Campo>
				<Campo label="Outorga recolhida em projeto modificativo (R$)">
					<CampoNumero value={entrada.deducoes.outorgaProjetoModificativoRs} onChange={(v) => atualizarDeducoes('outorgaProjetoModificativoRs', v)} />
				</Campo>
				<Campo label="Outorga no eixo estratégico do apoio urbano sul (R$)">
					<CampoNumero value={entrada.deducoes.outorgaApoioUrbanoSulRs} onChange={(v) => atualizarDeducoes('outorgaApoioUrbanoSulRs', v)} />
				</Campo>
				<Campo
					label="Classificação do empreendimento"
					hint="EHIS/EZEIS isentam a contrapartida integralmente"
					auto={entrada.idClassificacaoEmpreendimento !== 0 && entrada.idClassificacaoEmpreendimento === rascunho.entrada.idClassificacaoEmpreendimento}>
					<CampoSelect value={entrada.idClassificacaoEmpreendimento} onChange={(v) => atualizar('idClassificacaoEmpreendimento', v)} opcoes={CLASSIFICACAO_EMPREENDIMENTO} />
				</Campo>
			</Secao>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
						Tipologias ({entrada.tipologias.length}/7)
					</CardTitle>
					<Button type="button" variant="outline" size="sm" onClick={adicionarTipologia} disabled={entrada.tipologias.length >= 7}>
						<Plus className="mr-1 h-4 w-4" /> Adicionar tipologia
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="text-xs text-muted-foreground">
						Tipologias com <AutoBadge show /> vieram do BI (Aprova Digital, dbo.prata_categoria) — Computável (m²)
						já preenchido; confira a Classe/Descrição, que nem sempre dá pra inferir automaticamente.
					</p>
					{entrada.tipologias.length === 0 && (
						<p className="text-xs text-muted-foreground">Nenhuma tipologia adicionada ainda.</p>
					)}
					{entrada.tipologias.map((t, idx) => {
						const origemBi = rascunho.tipologiasOrigemBi[t.chave];
						return (
						<div key={t.chave} className="rounded-lg border p-3">
							<div className="mb-3 flex items-center justify-between">
								<span className="text-xs font-semibold text-muted-foreground">
									Tipologia {idx + 1}
									<AutoBadge show={!!origemBi} />
								</span>
								<Button type="button" variant="ghost" size="icon" onClick={() => removerTipologia(t.chave)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
							{origemBi && <p className="mb-2 text-[11px] text-muted-foreground">BI: {origemBi}</p>}
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="col-span-full">
									<Campo label="Classe — Descrição">
										<CampoSelect value={t.idTipologia} onChange={(v) => atualizarTipologia(t.chave, 'idTipologia', v)} opcoes={TIPOLOGIAS} />
									</Campo>
								</div>
								<Campo
									label="CA básico"
									hint={
										rascunho.caSugerido
											? `Sugerido p/ zona: ${fmtNum(rascunho.caSugerido.caBasico, 2)}${rascunho.caSugerido.observacao ? ' — ' + rascunho.caSugerido.observacao : ''}`
											: undefined
									}>
									<CampoNumero value={t.caBasico} onChange={(v) => atualizarTipologia(t.chave, 'caBasico', v)} />
								</Campo>
								<Campo
									label="CA máximo"
									hint={rascunho.caSugerido ? `Sugerido p/ zona: ${fmtNum(rascunho.caSugerido.caMaximo, 2)}` : undefined}>
									<div className="flex items-center gap-2">
										<div className="min-w-0 flex-1">
											<CampoNumero value={t.caMaximo} onChange={(v) => atualizarTipologia(t.chave, 'caMaximo', v)} />
										</div>
										{rascunho.caSugerido && (
											<Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => usarCaSugerido(t.chave)}>
												Usar
											</Button>
										)}
									</div>
								</Campo>
								<Campo label="Terreno (m²)">
									<CampoNumero value={t.terrenoM2} onChange={(v) => atualizarTipologia(t.chave, 'terrenoM2', v)} />
								</Campo>
								<Campo label="Computável (m²)" auto={!!origemBi}>
									<CampoNumero value={t.computavelM2} onChange={(v) => atualizarTipologia(t.chave, 'computavelM2', v)} />
								</Campo>
								<Campo label="TDC (m²)">
									<CampoNumero value={t.tdcM2} onChange={(v) => atualizarTipologia(t.chave, 'tdcM2', v)} />
								</Campo>
								<Campo label="Outorga adquirida (m²)" hint="Só entra no cálculo se assunto = projeto modificativo">
									<CampoNumero value={t.outorgaAdquiridaM2} onChange={(v) => atualizarTipologia(t.chave, 'outorgaAdquiridaM2', v)} />
								</Campo>
							</div>
						</div>
						);
					})}
				</CardContent>
			</Card>

			<Card ref={resultadoRef}>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resultado</CardTitle>
					{!resultado.dentroDaVigencia && (
						<p className="text-xs font-medium text-destructive">
							Data de referência além do limite de vigência desta versão da planilha — valores abaixo são apenas ilustrativos.
						</p>
					)}
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{motivosValorZerado.length > 0 && (
						<div className="flex flex-col gap-1.5 rounded-lg border border-warning/30 bg-warning-soft/40 p-3 text-xs">
							<p className="font-semibold text-foreground">Valor líquido está em R$ 0,00 — possíveis causas:</p>
							{motivosValorZerado.map((motivo, idx) => (
								<p key={idx} className="text-muted-foreground">
									• {motivo}
								</p>
							))}
						</div>
					)}
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tipologia</TableHead>
									<TableHead>Fp</TableHead>
									<TableHead>Fs</TableHead>
									<TableHead>Benefício (m²)</TableHead>
									<TableHead>Objeto outorga (m²)</TableHead>
									<TableHead>C (R$/m²)</TableHead>
									<TableHead>Valor (R$)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{resultado.tipologias.map((t, idx) => (
									<TableRow key={t.chave}>
										<TableCell>#{idx + 1}</TableCell>
										<TableCell>{fmtNum(t.fp)}</TableCell>
										<TableCell>{fmtNum(t.fs)}</TableCell>
										<TableCell>{fmtNum(t.beneficioM2, 2)}</TableCell>
										<TableCell>{fmtNum(t.objetoOutorgaM2, 2)}</TableCell>
										<TableCell>{fmtBRL(t.c)}</TableCell>
										<TableCell className="font-semibold">{fmtBRL(t.valorRs)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">V_MÁXIMO usado</span>
							<span>{vMax != null ? `${fmtBRL(vMax)}/m²` : '—'}</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Valor bruto</span>
							<span>{fmtBRL(resultado.valorTotalBrutoRs)}</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Dedução EHIS/EZEIS</span>
							<span>{fmtBRL(resultado.deducaoEhisEzeisRs)}</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Total a deduzir</span>
							<span>{fmtBRL(resultado.valorTotalRecolhidoRs)}</span>
						</div>
						<div className="flex justify-between py-1 text-base font-bold sm:col-span-2">
							<span>Valor líquido da OODC</span>
							<span>{fmtBRL(resultado.valorTotalLiquidoRs)}</span>
						</div>
					</div>

					<Button type="button" onClick={salvarMemorial} disabled={isPendingSalvar} className="w-fit">
						{isPendingSalvar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						Salvar memorial de cálculo
					</Button>
				</CardContent>
			</Card>

			{historico.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Histórico de cálculos salvos ({historico.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Salvo em</TableHead>
									<TableHead>Por</TableHead>
									<TableHead>Legislação</TableHead>
									<TableHead>Origem</TableHead>
									<TableHead>Valor bruto</TableHead>
									<TableHead>Valor líquido</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{historico.map((m) => (
									<TableRow key={m.id}>
										<TableCell>{new Date(m.criadoEm).toLocaleString('pt-BR')}</TableCell>
										<TableCell>{m.criadoPorNome ?? '—'}</TableCell>
										<TableCell>{LEIS.find((l) => l.id === m.idLegislacao)?.nome ?? m.idLegislacao}</TableCell>
										<TableCell>{m.legislacaoOrigem === 'SUGERIDA' ? 'Sugerida' : 'Manual'}</TableCell>
										<TableCell>{fmtBRL(m.valorTotalBrutoRs)}</TableCell>
										<TableCell className="font-semibold">{fmtBRL(m.valorTotalLiquidoRs)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			<Button type="button" variant="outline" onClick={recalcular} className="w-fit self-center">
				<RefreshCw className="mr-2 h-4 w-4" />
				Recalcular
			</Button>
		</div>
	);
}

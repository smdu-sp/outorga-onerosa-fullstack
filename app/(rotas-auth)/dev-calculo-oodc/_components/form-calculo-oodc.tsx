'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcularMemorial } from '@/lib/oodc/calculo';
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
import { buscarAssuntoPorProcessoAction, buscarValorReferenciaAction } from '../actions';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number, casas = 4) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

let contador = 0;
function novaChave() {
	contador += 1;
	return `t${contador}`;
}

function tipologiaVazia(): TipologiaCalculo {
	return {
		chave: novaChave(),
		idTipologia: 0,
		caBasico: 0,
		caMaximo: 0,
		terrenoM2: 0,
		computavelM2: 0,
		tdcM2: 0,
		outorgaAdquiridaM2: 0,
	};
}

function enderecoVazio(): EnderecoValorUnitario {
	return { setor: '', quadra: '', codlog: '' };
}

function qualificadoresVazios(): ParametrosQualificadores {
	return {
		areaResFruicaoM2: 0,
		baseLegalFruiId: 0,
		areaDoacaoVerdeM2: 0,
		areaDoacaoMelhoramentoM2: 0,
		baseLegalMelId: 0,
		areaReservaPracaM2: 0,
		areaDoacaoCalcadaM2: 0,
		baseLegalCalId: 0,
	};
}

function deducoesVazias(): DeducoesContrapartida {
	return {
		outorgaProjetoAnteriorRs: 0,
		incentivoCertificacaoRs: 0,
		incentivoCotaAmbientalRs: 0,
		outorgaProjetoModificativoRs: 0,
		outorgaApoioUrbanoSulRs: 0,
	};
}

function entradaInicial(): EntradaCalculoOodc {
	return {
		idAssunto: 0,
		idLegislacao: 0,
		idMacrozona: 0,
		idMacroarea: 0,
		idZona: 0,
		enderecos: [enderecoVazio()],
		qualificadores: qualificadoresVazios(),
		ocupacaoSolo: { cotaParteMaximaM2: 0 },
		deducoes: deducoesVazias(),
		idClassificacaoEmpreendimento: 0,
		tipologias: [tipologiaVazia()],
	};
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

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
				{label}
			</label>
			{children}
			{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
		</div>
	);
}

function CampoNumero({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	return (
		<Input
			type="number"
			step="any"
			value={value}
			onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
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

export function FormCalculoOodc() {
	const [entrada, setEntrada] = useState<EntradaCalculoOodc>(entradaInicial);
	const [valoresEncontrados, setValoresEncontrados] = useState<ValorUnitarioEncontrado[]>([]);
	const [vMax, setVMax] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();
	const [numProcesso, setNumProcesso] = useState('');
	const [isPendingAssunto, startTransitionAssunto] = useTransition();

	const piuCentral = (IDS_LEGISLACAO_PIU_CENTRAL as readonly number[]).includes(entrada.idLegislacao);

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
		setEntrada((prev) => ({ ...prev, enderecos: [...prev.enderecos, enderecoVazio()] }));
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
		setEntrada((prev) => ({ ...prev, tipologias: [...prev.tipologias, tipologiaVazia()] }));
	}

	function removerTipologia(chave: string) {
		setEntrada((prev) => ({ ...prev, tipologias: prev.tipologias.filter((t) => t.chave !== chave) }));
	}

	function buscarAssunto() {
		if (!numProcesso.trim()) {
			toast.error('Informe o número do processo.');
			return;
		}
		startTransitionAssunto(async () => {
			const resposta = await buscarAssuntoPorProcessoAction(numProcesso);
			if (!resposta.ok) {
				toast.error(resposta.error ?? 'Não foi possível buscar o assunto no BI.');
				return;
			}
			const candidatos = resposta.candidatos ?? [];
			if (!candidatos.length) {
				toast.warning('Nenhum assunto encontrado no BI para esse processo.');
				return;
			}
			const melhor = candidatos.find((c) => c.idSugerido != null) ?? candidatos[0];
			if (melhor.idSugerido != null) atualizar('idAssunto', melhor.idSugerido);
			const outros = candidatos.length > 1 ? ` (+${candidatos.length - 1} outro(s) registro(s) no BI)` : '';
			toast.success(`BI: "${melhor.assunto}"${outros}`);
		});
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

	return (
		<div className="flex flex-col gap-5">
			<Secao titulo="Cabeçalho">
				<Campo label="Processo" hint="Busca o assunto no BI (dbo.Cadastros → dbo.Assuntos) pelo número do processo">
					<div className="flex gap-2">
						<Input
							placeholder="0000.0000/0000000-0"
							value={numProcesso}
							onChange={(e) => setNumProcesso(e.target.value)}
						/>
						<Button type="button" variant="outline" size="sm" onClick={buscarAssunto} disabled={isPendingAssunto}>
							{isPendingAssunto ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar no BI'}
						</Button>
					</div>
				</Campo>
				<Campo label="Assunto">
					<CampoSelect value={entrada.idAssunto} onChange={(v) => atualizar('idAssunto', v)} opcoes={ASSUNTOS} />
				</Campo>
				<Campo label="Legislação">
					<CampoSelect value={entrada.idLegislacao} onChange={(v) => atualizar('idLegislacao', v)} opcoes={LEIS} />
				</Campo>
				<Campo label="Macrozona">
					<CampoSelect value={entrada.idMacrozona} onChange={(v) => atualizar('idMacrozona', v)} opcoes={MACROZONAS} />
				</Campo>
				<Campo label="Macroárea">
					<CampoSelect value={entrada.idMacroarea} onChange={(v) => atualizar('idMacroarea', v)} opcoes={MACROAREAS} />
				</Campo>
				<Campo label={piuCentral ? 'Área - PIU Central' : 'Zona de uso'}>
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
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Valores unitários (V)
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							Até 10 endereços (setor/quadra/codlog) — V_MÁXIMO = maior valor vigente encontrado.
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
							<div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
								<Input placeholder="Setor" value={e.setor} onChange={(ev) => atualizarEndereco(idx, 'setor', ev.target.value)} />
								<Input placeholder="Quadra" value={e.quadra} onChange={(ev) => atualizarEndereco(idx, 'quadra', ev.target.value)} />
								<Input placeholder="Codlog" value={e.codlog} onChange={(ev) => atualizarEndereco(idx, 'codlog', ev.target.value)} />
								<div className="flex min-w-[140px] items-center px-2 text-xs text-muted-foreground">
									{encontrado?.valor != null
										? `${fmtBRL(encontrado.valor)} (${encontrado.dataVigencia})`
										: '—'}
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

			<Secao titulo="Parâmetros qualificadores da ocupação" subtitulo="Benefícios de área e bases legais">
				<Campo label="Área de reserva para fruição pública (m²)">
					<CampoNumero
						value={entrada.qualificadores.areaResFruicaoM2}
						onChange={(v) => atualizarQualificadores('areaResFruicaoM2', v)}
					/>
				</Campo>
				<Campo label="Base legal — fruição pública">
					<CampoSelect
						value={entrada.qualificadores.baseLegalFruiId}
						onChange={(v) => atualizarQualificadores('baseLegalFruiId', v)}
						opcoes={BASE_FRUI}
					/>
				</Campo>
				<div />
				<Campo label="Área de doação de áreas verdes (m²)">
					<CampoNumero
						value={entrada.qualificadores.areaDoacaoVerdeM2}
						onChange={(v) => atualizarQualificadores('areaDoacaoVerdeM2', v)}
					/>
				</Campo>
				<Campo label="Área de doação para melhoramento viário (m²)">
					<CampoNumero
						value={entrada.qualificadores.areaDoacaoMelhoramentoM2}
						onChange={(v) => atualizarQualificadores('areaDoacaoMelhoramentoM2', v)}
					/>
				</Campo>
				<Campo label="Base legal — melhoramento viário">
					<CampoSelect
						value={entrada.qualificadores.baseLegalMelId}
						onChange={(v) => atualizarQualificadores('baseLegalMelId', v)}
						opcoes={BASE_MEL}
					/>
				</Campo>
				<Campo label="Área de reserva para praça pública (m²)">
					<CampoNumero
						value={entrada.qualificadores.areaReservaPracaM2}
						onChange={(v) => atualizarQualificadores('areaReservaPracaM2', v)}
					/>
				</Campo>
				<Campo label="Área de doação para alargamento de calçada (m²)">
					<CampoNumero
						value={entrada.qualificadores.areaDoacaoCalcadaM2}
						onChange={(v) => atualizarQualificadores('areaDoacaoCalcadaM2', v)}
					/>
				</Campo>
				<Campo label="Base legal — calçada">
					<CampoSelect
						value={entrada.qualificadores.baseLegalCalId}
						onChange={(v) => atualizarQualificadores('baseLegalCalId', v)}
						opcoes={BASE_CAL}
					/>
				</Campo>
			</Secao>

			<Secao
				titulo="Parâmetros da ocupação do solo"
				subtitulo="Usado na regra de penalidade do Fator Social (Fs) das leis mais recentes">
				<Campo label="Cota parte máxima de terreno por UH efetiva (m²)">
					<CampoNumero
						value={entrada.ocupacaoSolo.cotaParteMaximaM2}
						onChange={(v) => atualizar('ocupacaoSolo', { cotaParteMaximaM2: v })}
					/>
				</Campo>
			</Secao>

			<Secao titulo="Valores a deduzir e classificação do empreendimento">
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
				<Campo label="Classificação do empreendimento" hint="EHIS/EZEIS isentam a contrapartida integralmente">
					<CampoSelect
						value={entrada.idClassificacaoEmpreendimento}
						onChange={(v) => atualizar('idClassificacaoEmpreendimento', v)}
						opcoes={CLASSIFICACAO_EMPREENDIMENTO}
					/>
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
					{entrada.tipologias.map((t, idx) => (
						<div key={t.chave} className="rounded-lg border p-3">
							<div className="mb-3 flex items-center justify-between">
								<span className="text-xs font-semibold text-muted-foreground">Tipologia {idx + 1}</span>
								<Button type="button" variant="ghost" size="icon" onClick={() => removerTipologia(t.chave)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="lg:col-span-2">
									<Campo label="Classe — Descrição">
										<CampoSelect
											value={t.idTipologia}
											onChange={(v) => atualizarTipologia(t.chave, 'idTipologia', v)}
											opcoes={TIPOLOGIAS}
										/>
									</Campo>
								</div>
								<Campo label="CA básico">
									<CampoNumero value={t.caBasico} onChange={(v) => atualizarTipologia(t.chave, 'caBasico', v)} />
								</Campo>
								<Campo label="CA máximo">
									<CampoNumero value={t.caMaximo} onChange={(v) => atualizarTipologia(t.chave, 'caMaximo', v)} />
								</Campo>
								<Campo label="Terreno (m²)">
									<CampoNumero value={t.terrenoM2} onChange={(v) => atualizarTipologia(t.chave, 'terrenoM2', v)} />
								</Campo>
								<Campo label="Computável (m²)">
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
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resultado</CardTitle>
					{!resultado.dentroDaVigencia && (
						<p className="text-xs font-medium text-destructive">
							Data de referência além do limite de vigência desta versão da planilha (
							{new Date().toLocaleDateString('pt-BR')} vs. 31/12/2026) — valores abaixo são apenas
							ilustrativos.
						</p>
					)}
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
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
							<span className="text-muted-foreground">Soma terreno</span>
							<span>{fmtNum(resultado.somaTerrenoM2, 2)} m²</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Soma computável</span>
							<span>{fmtNum(resultado.somaComputavelM2, 2)} m²</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Soma objeto de outorga</span>
							<span>{fmtNum(resultado.somaOutorgaM2, 2)} m²</span>
						</div>
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
						<div className="flex justify-between py-1 text-base font-bold">
							<span>Valor líquido da OODC</span>
							<span>{fmtBRL(resultado.valorTotalLiquidoRs)}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

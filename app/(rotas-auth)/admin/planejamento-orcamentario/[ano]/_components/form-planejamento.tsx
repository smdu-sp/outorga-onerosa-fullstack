/** @format */

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, History, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputMoeda } from '@/components/ui/input-moeda';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/app/utils/funcoes-utilitarias';
import { gerarSugestao, salvar, salvarConfiguracao } from '@/services/planejamento-orcamentario';
import type {
	IConfiguracaoPlanejamento,
	IHistoricoAnoArrecadado,
	IPlanejamentoOrcamentario,
	IPlanejamentoRevisao,
	ISugestaoPlanejamento,
	MetodoDistribuicao,
} from '@/types/planejamento-orcamentario';

const MESES_NOME = [
	'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
	'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MesForm {
	mes: number;
	valor: number;
	editado_manualmente: boolean;
}

interface ParametroForm {
	nome: string;
	percentual: number;
}

interface HistoricoForm {
	ano: number;
	real: number;
	valor: number;
	editado: boolean;
}

function mesesIniciais(plano: IPlanejamentoOrcamentario | null): MesForm[] {
	if (plano && plano.meses.length === 12) {
		return [...plano.meses]
			.sort((a, b) => a.mes - b.mes)
			.map((m) => ({ mes: m.mes, valor: m.valor, editado_manualmente: m.editado_manualmente ?? false }));
	}
	return Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: 0, editado_manualmente: false }));
}

function historicoInicial(
	historicoBase: IHistoricoAnoArrecadado[],
	plano: IPlanejamentoOrcamentario | null,
): HistoricoForm[] {
	return historicoBase.map((h) => {
		const salvo = plano?.historico.find((p) => p.ano === h.ano);
		const ajustado = salvo?.valor_ajustado ?? null;
		return {
			ano: h.ano,
			real: h.total,
			valor: ajustado ?? h.total,
			editado: ajustado != null,
		};
	});
}

export function FormPlanejamento({
	ano,
	planoInicial,
	editavel,
	emRevisao,
	historico: historicoBase,
	isDev,
	configuracaoInicial,
	revisoesIniciais,
}: {
	ano: number;
	planoInicial: IPlanejamentoOrcamentario | null;
	editavel: boolean;
	/** DEV editando fora do prazo normal — a edição vira uma revisão auditável (motivo obrigatório). */
	emRevisao: boolean;
	historico: IHistoricoAnoArrecadado[];
	isDev: boolean;
	configuracaoInicial: IConfiguracaoPlanejamento;
	revisoesIniciais: IPlanejamentoRevisao[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [parametros, setParametros] = useState<ParametroForm[]>(
		planoInicial?.parametros.map((p) => ({ nome: p.nome, percentual: p.percentual })) ?? [],
	);
	const [meses, setMeses] = useState<MesForm[]>(mesesIniciais(planoInicial));
	const [historico, setHistorico] = useState<HistoricoForm[]>(historicoInicial(historicoBase, planoInicial));
	const [mediaBase, setMediaBase] = useState(planoInicial?.media_base_3_anos ?? 0);
	const [distribuicao, setDistribuicao] = useState<MetodoDistribuicao>(
		planoInicial?.metodo_distribuicao ?? 'MEDIA_HISTORICA',
	);
	const [sobrescreverEditados, setSobrescreverEditados] = useState(false);
	const [motivoRevisao, setMotivoRevisao] = useState('');

	const bloqueado = !editavel && !isDev;
	const totalAnual = useMemo(
		() => meses.reduce((s, m) => s + (Number.isFinite(m.valor) ? m.valor : 0), 0),
		[meses],
	);

	function overridesAtuais() {
		return historico.filter((h) => h.editado).map((h) => ({ ano: h.ano, valor: h.valor }));
	}

	function addParametro() {
		setParametros((atual) => [...atual, { nome: '', percentual: 0 }]);
	}

	function updateParametro(index: number, patch: Partial<ParametroForm>) {
		setParametros((atual) => atual.map((p, i) => (i === index ? { ...p, ...patch } : p)));
	}

	function removeParametro(index: number) {
		setParametros((atual) => atual.filter((_, i) => i !== index));
	}

	function updateMes(mes: number, valor: number) {
		setMeses((atual) =>
			atual.map((m) => (m.mes === mes ? { ...m, valor, editado_manualmente: true } : m)),
		);
	}

	function updateHistorico(ano: number, valor: number) {
		setHistorico((atual) => atual.map((h) => (h.ano === ano ? { ...h, valor, editado: true } : h)));
	}

	function handleRecalcular() {
		startTransition(async () => {
			const resp = await gerarSugestao(ano, parametros, overridesAtuais(), distribuicao);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao gerar sugestão.');
				return;
			}
			const sugestao = resp.data as ISugestaoPlanejamento;
			setMediaBase(sugestao.media_base_3_anos);
			setMeses((atual) =>
				atual.map((m) => {
					if (m.editado_manualmente && !sobrescreverEditados) return m;
					const sugerido = sugestao.meses.find((s) => s.mes === m.mes);
					return sugerido ? { mes: m.mes, valor: sugerido.valor, editado_manualmente: false } : m;
				}),
			);
			toast.success('Sugestão recalculada.');
		});
	}

	function handleSalvar() {
		if (emRevisao && !motivoRevisao.trim()) {
			toast.error('Informe o motivo da revisão.');
			return;
		}
		startTransition(async () => {
			const resp = await salvar(
				ano,
				parametros,
				meses,
				overridesAtuais(),
				distribuicao,
				emRevisao ? motivoRevisao.trim() : undefined,
			);
			if (!resp.ok) {
				toast.error(resp.error ?? 'Erro ao salvar planejamento.');
				return;
			}
			toast.success(emRevisao ? 'Revisão salva.' : 'Planejamento salvo.');
			setMotivoRevisao('');
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-6">
			{bloqueado && (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Prazo de edição encerrado</AlertTitle>
					<AlertDescription>
						O prazo para editar o planejamento de {ano} já passou (limite: {configuracaoInicial.dia_limite}/
						{configuracaoInicial.mes_limite}/{ano - 1}). Só um usuário DEV pode alterá-lo agora.
					</AlertDescription>
				</Alert>
			)}

			{emRevisao && (
				<Alert className="border-amber-500/40">
					<History className="h-4 w-4 text-amber-500" />
					<AlertTitle>Modo revisão</AlertTitle>
					<AlertDescription>
						O prazo normal de edição já passou. Como DEV, você pode revisar este planejamento — o
						estado atual fica registrado no histórico de revisões antes de salvar as mudanças.
						Informe o motivo abaixo para habilitar o salvamento.
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Histórico usado como base ({ano - 3}–{ano - 1})</CardTitle>
					<CardDescription>
						Arrecadação real (parcelas + multas quitadas) de cada ano — editável para ajustar a base
						de cálculo deste planejamento (não altera a arrecadação real do sistema).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{historico.map((h) => (
							<div key={h.ano} className="flex flex-col gap-1">
								<Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
									{h.ano}
									{h.editado && (
										<span
											className="h-1.5 w-1.5 rounded-full bg-amber-500"
											title={`Valor ajustado manualmente (real: ${formatCurrency(h.real)})`}
										/>
									)}
								</Label>
								<InputMoeda
									value={h.valor}
									disabled={bloqueado}
									onValueChange={(v) => updateHistorico(h.ano, v)}
								/>
							</div>
						))}
						<div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
							<div className="text-xs text-muted-foreground">Média (base do cálculo)</div>
							<div className="mt-1 text-sm font-semibold">{formatCurrency(mediaBase)}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Parâmetros de correção</CardTitle>
					<CardDescription>
						Ex.: IPCA. Cada parâmetro é combinado multiplicativamente sobre a média histórica.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{parametros.map((p, i) => (
						<div key={i} className="flex items-center gap-2">
							<Input
								placeholder="Nome (ex.: IPCA)"
								value={p.nome}
								disabled={bloqueado}
								onChange={(e) => updateParametro(i, { nome: e.target.value })}
							/>
							<div className="relative w-40 shrink-0">
								<Input
									type="number"
									step="0.01"
									placeholder="0,00"
									value={p.percentual}
									disabled={bloqueado}
									onChange={(e) => updateParametro(i, { percentual: Number(e.target.value) })}
									className="pr-7"
								/>
								<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
									%
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={bloqueado}
								onClick={() => removeParametro(i)}>
								<Trash2 className="h-4 w-4 text-destructive" />
							</Button>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" disabled={bloqueado} onClick={addParametro} className="w-fit">
						<Plus className="h-3.5 w-3.5" />
						Adicionar parâmetro
					</Button>

					<Separator className="my-1" />

					<div className="flex flex-col gap-2">
						<Label className="text-sm">Distribuição mensal</Label>
						<RadioGroup
							value={distribuicao}
							onValueChange={(v) => setDistribuicao(v as MetodoDistribuicao)}
							disabled={bloqueado}
							className="flex flex-col gap-2 sm:flex-row sm:gap-6">
							<label className="flex items-center gap-2 text-sm text-muted-foreground">
								<RadioGroupItem value="MEDIA_HISTORICA" />
								Pela média histórica mensal dos anos anteriores
							</label>
							<label className="flex items-center gap-2 text-sm text-muted-foreground">
								<RadioGroupItem value="IGUAL" />
								Dividir igualmente entre os 12 meses
							</label>
						</RadioGroup>
					</div>

					<Separator className="my-1" />

					<div className="flex flex-wrap items-center justify-between gap-3">
						<label className="flex items-center gap-2 text-sm text-muted-foreground">
							<Checkbox
								checked={sobrescreverEditados}
								disabled={bloqueado}
								onCheckedChange={(v) => setSobrescreverEditados(v === true)}
							/>
							Sobrescrever meses já editados manualmente
						</label>
						<Button type="button" disabled={bloqueado || isPending} onClick={handleRecalcular}>
							{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
							Recalcular sugestão
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Distribuição mensal</CardTitle>
					<CardDescription>
						{distribuicao === 'IGUAL'
							? 'Valor anual dividido igualmente entre os 12 meses'
							: 'Sugerida pela proporção histórica de arrecadação de cada mês'}{' '}
						— editável individualmente.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{[
							{ titulo: '1º semestre', meses: meses.slice(0, 6) },
							{ titulo: '2º semestre', meses: meses.slice(6, 12) },
						].map((semestre) => (
							<div key={semestre.titulo} className="flex flex-col gap-3">
								<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{semestre.titulo}
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{semestre.meses.map((m) => (
										<div key={m.mes} className="flex flex-col gap-1">
											<Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
												{MESES_NOME[m.mes - 1]}
												{m.editado_manualmente && (
													<span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Editado manualmente" />
												)}
											</Label>
											<InputMoeda
												value={m.valor}
												disabled={bloqueado}
												onValueChange={(v) => updateMes(m.mes, v)}
											/>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{emRevisao && (
				<Card className="border-amber-500/40">
					<CardHeader>
						<CardTitle>Motivo da revisão</CardTitle>
						<CardDescription>
							Obrigatório fora do prazo normal — fica registrado no histórico junto com o estado
							anterior do planejamento.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Textarea
							placeholder="Ex.: revisão de meio de ano para refletir a arrecadação real acumulada."
							value={motivoRevisao}
							onChange={(e) => setMotivoRevisao(e.target.value)}
						/>
					</CardContent>
				</Card>
			)}

			<div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
				<div>
					<div className="text-xs text-muted-foreground">Total anual planejado (soma dos 12 meses)</div>
					<div className="text-xl font-bold">{formatCurrency(totalAnual)}</div>
				</div>
				<Button
					size="lg"
					disabled={bloqueado || isPending || (emRevisao && !motivoRevisao.trim())}
					onClick={handleSalvar}>
					{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
					{emRevisao ? 'Salvar revisão' : 'Salvar planejamento'}
				</Button>
			</div>

			{revisoesIniciais.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<History className="h-4 w-4" />
							Histórico de revisões
						</CardTitle>
						<CardDescription>
							Registro de todas as vezes que este planejamento foi revisado fora do prazo normal.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{revisoesIniciais.map((r) => (
							<div key={r.id} className="rounded-lg border border-border p-3">
								<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
									<span>
										{formatDate(new Date(r.revisado_em))}
										{r.revisado_por_nome ? ` — ${r.revisado_por_nome}` : ''}
									</span>
									<span>
										{formatCurrency(r.valor_anual_anterior)} → {formatCurrency(r.valor_anual_novo)}
									</span>
								</div>
								<p className="mt-1 text-sm">{r.motivo}</p>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{isDev && (
				<ConfiguracaoPrazoDev configuracaoInicial={configuracaoInicial} />
			)}
		</div>
	);
}

function ConfiguracaoPrazoDev({ configuracaoInicial }: { configuracaoInicial: IConfiguracaoPlanejamento }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [dia, setDia] = useState(configuracaoInicial.dia_limite);
	const [mes, setMes] = useState(configuracaoInicial.mes_limite);

	function handleSalvarConfig() {
		startTransition(async () => {
			const resp = await salvarConfiguracao(dia, mes);
			if (!resp.ok) {
				toast.error(resp.error ?? 'Erro ao salvar prazo.');
				return;
			}
			toast.success('Prazo de edição atualizado.');
			router.refresh();
		});
	}

	return (
		<Card className="border-amber-500/40">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Prazo de edição
					<span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">
						DEV
					</span>
				</CardTitle>
				<CardDescription>
					Até que dia/mês do ano anterior um admin comum pode editar o planejamento do ano seguinte.
					DEV sempre pode editar, mesmo fora do prazo.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-wrap items-end gap-3">
				<div className="grid gap-1.5">
					<Label htmlFor="dia-limite">Dia</Label>
					<Input
						id="dia-limite"
						type="number"
						min={1}
						max={31}
						value={dia}
						onChange={(e) => setDia(Number(e.target.value))}
						className="w-24"
					/>
				</div>
				<div className="grid gap-1.5">
					<Label htmlFor="mes-limite">Mês</Label>
					<Input
						id="mes-limite"
						type="number"
						min={1}
						max={12}
						value={mes}
						onChange={(e) => setMes(Number(e.target.value))}
						className="w-24"
					/>
				</div>
				<Button type="button" variant="outline" disabled={isPending} onClick={handleSalvarConfig}>
					{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
					Salvar prazo
				</Button>
			</CardContent>
		</Card>
	);
}

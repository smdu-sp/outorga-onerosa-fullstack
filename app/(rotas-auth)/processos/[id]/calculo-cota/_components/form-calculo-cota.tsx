'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcularCota } from '@/lib/cota/calculo';
import { parseNumeroBr } from '@/lib/parse-numero-br';
import type { EnderecoValorUnitarioCota, EntradaCalculoCota, ValorUnitarioEncontradoCota } from '@/lib/cota/tipos';
import type { MemorialCotaResumoDto } from '@/lib/server/cota-memorial';
import { buscarValorReferenciaCotaAction, salvarMemorialCalculoCotaAction } from '../actions';

const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number, casas = 2) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

function enderecoVazio(): EnderecoValorUnitarioCota {
	return { setor: '', quadra: '', codlog: '' };
}

function entradaInicial(): EntradaCalculoCota {
	return {
		areaTerrenoEscrituraM2: 0,
		areaTerrenoRealM2: 0,
		enderecos: [enderecoVazio()],
	};
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

export function FormCalculoCota({
	processoId,
	historicoInicial,
}: {
	processoId: string;
	historicoInicial: MemorialCotaResumoDto[];
}) {
	const [entrada, setEntrada] = useState<EntradaCalculoCota>(entradaInicial);
	const [valoresEncontrados, setValoresEncontrados] = useState<ValorUnitarioEncontradoCota[]>([]);
	const [vMax, setVMax] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isPendingSalvar, startTransitionSalvar] = useTransition();
	const [historico, setHistorico] = useState(historicoInicial);

	const resultado = useMemo(() => calcularCota(entrada, vMax, valoresEncontrados), [entrada, vMax, valoresEncontrados]);

	function atualizar<K extends keyof EntradaCalculoCota>(campo: K, valor: EntradaCalculoCota[K]) {
		setEntrada((prev) => ({ ...prev, [campo]: valor }));
	}

	function atualizarEndereco(idx: number, campo: keyof EnderecoValorUnitarioCota, valor: string) {
		setEntrada((prev) => ({
			...prev,
			enderecos: prev.enderecos.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)),
		}));
	}

	function adicionarEndereco() {
		if (entrada.enderecos.length >= 6) return;
		setEntrada((prev) => ({ ...prev, enderecos: [...prev.enderecos, enderecoVazio()] }));
	}

	function removerEndereco(idx: number) {
		setEntrada((prev) => ({ ...prev, enderecos: prev.enderecos.filter((_, i) => i !== idx) }));
	}

	function buscarValores() {
		const enderecos = entrada.enderecos.filter((e) => e.setor.trim() && e.quadra.trim() && e.codlog.trim());
		if (!enderecos.length) {
			toast.error('Preencha setor/quadra/codlog de pelo menos um endereço.');
			return;
		}
		startTransition(async () => {
			const resposta = await buscarValorReferenciaCotaAction(processoId, enderecos);
			if (!resposta.ok) {
				toast.error(resposta.error ?? 'Não foi possível buscar o valor de referência.');
				return;
			}
			setValoresEncontrados(resposta.valores ?? []);
			setVMax(resposta.vMax ?? null);
			if (resposta.vMax == null) {
				toast.warning('Nenhum valor de referência encontrado para os endereços informados.');
			} else {
				toast.success(`Maior Valor (Vm²) encontrado: ${fmtBRL(resposta.vMax)}/m²`);
			}
		});
	}

	function salvarMemorial() {
		if (resultado.terrenoUsadoM2 <= 0) {
			toast.error('Informe a área de terreno (escritura e/ou real) antes de salvar.');
			return;
		}
		startTransitionSalvar(async () => {
			const resposta = await salvarMemorialCalculoCotaAction(processoId, entrada, resultado);
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
					terrenoUsadoM2: resultado.terrenoUsadoM2,
					vMax: resultado.vMax,
					valorTotalRs: resultado.valorTotalRs,
					valorCinquentaPctRs: resultado.valorCinquentaPctRs,
				},
				...prev,
			]);
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Cabeçalho</CardTitle>
					<p className="text-xs text-muted-foreground">Campos informativos — não entram na fórmula.</p>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<Campo label="Ano de cálculo">
						<Input
							type="number"
							value={entrada.anoCalculo ?? ''}
							onChange={(e) => atualizar('anoCalculo', e.target.value === '' ? undefined : Number(e.target.value))}
						/>
					</Campo>
					<Campo label="Nº de parcelas">
						<Input
							type="number"
							value={entrada.numeroParcelas ?? ''}
							onChange={(e) => atualizar('numeroParcelas', e.target.value === '' ? undefined : Number(e.target.value))}
						/>
					</Campo>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Terreno (m²)</CardTitle>
					<p className="text-xs text-muted-foreground">
						O cálculo usa o menor valor entre as duas áreas informadas.
					</p>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<Campo label="Área conforme escritura">
						<CampoNumero value={entrada.areaTerrenoEscrituraM2} onChange={(v) => atualizar('areaTerrenoEscrituraM2', v)} />
					</Campo>
					<Campo label="Área real">
						<CampoNumero value={entrada.areaTerrenoRealM2} onChange={(v) => atualizar('areaTerrenoRealM2', v)} />
					</Campo>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Valores unitários (Vm²)
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							Até 6 endereços (setor/quadra/codlog) — Maior Valor (Vm²) = maior valor encontrado entre eles.
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
							<div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
								<Input placeholder="Setor" value={e.setor} onChange={(ev) => atualizarEndereco(idx, 'setor', ev.target.value)} />
								<Input placeholder="Quadra" value={e.quadra} onChange={(ev) => atualizarEndereco(idx, 'quadra', ev.target.value)} />
								<Input placeholder="Codlog" value={e.codlog} onChange={(ev) => atualizarEndereco(idx, 'codlog', ev.target.value)} />
								<div className="flex min-w-[160px] flex-col justify-center px-2 text-xs text-muted-foreground">
									{encontrado?.valor != null ? (
										<>
											<span>{fmtBRL(encontrado.valor)}</span>
											{encontrado.observacao && <span className="truncate">{encontrado.observacao}</span>}
										</>
									) : (
										'—'
									)}
								</div>
								<Button type="button" variant="ghost" size="icon" onClick={() => removerEndereco(idx)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						);
					})}
					<Button type="button" variant="outline" size="sm" className="w-fit" onClick={adicionarEndereco} disabled={entrada.enderecos.length >= 6}>
						<Plus className="mr-1 h-4 w-4" /> Adicionar endereço
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resultado</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Terreno usado (menor valor)</span>
							<span>{fmtNum(resultado.terrenoUsadoM2)} m²</span>
						</div>
						<div className="flex justify-between border-b py-1">
							<span className="text-muted-foreground">Maior Valor (Vm²) usado</span>
							<span>{vMax != null ? `${fmtBRL(vMax)}/m²` : '—'}</span>
						</div>
						<div className="flex justify-between border-b py-1 sm:col-span-2">
							<span className="text-muted-foreground">
								Valor TOTAL da Cota de Solidariedade{' '}
								<span className="text-[11px]">(= 0,10 × terreno × Vm²)</span>
							</span>
							<span className="font-semibold">{fmtBRL(resultado.valorTotalRs)}</span>
						</div>
						<div className="flex justify-between py-1 text-base font-bold sm:col-span-2">
							<span>Valor dos 50% (Alvará de Execução)</span>
							<span>{fmtBRL(resultado.valorCinquentaPctRs)}</span>
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
									<TableHead>Terreno usado</TableHead>
									<TableHead>Vm²</TableHead>
									<TableHead>Valor total</TableHead>
									<TableHead>50% (execução)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{historico.map((m) => (
									<TableRow key={m.id}>
										<TableCell>{new Date(m.criadoEm).toLocaleString('pt-BR')}</TableCell>
										<TableCell>{m.criadoPorNome ?? '—'}</TableCell>
										<TableCell>{fmtNum(m.terrenoUsadoM2)} m²</TableCell>
										<TableCell>{m.vMax != null ? fmtBRL(m.vMax) : '—'}</TableCell>
										<TableCell className="font-semibold">{fmtBRL(m.valorTotalRs)}</TableCell>
										<TableCell>{fmtBRL(m.valorCinquentaPctRs)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

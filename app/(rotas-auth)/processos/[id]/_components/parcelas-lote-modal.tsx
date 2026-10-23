'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { criarParcelasEmLoteAction } from '@/services/processos/server-functions/acao-parcela';
import { IParcela } from '@/types/processo';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { valorEntradaCota } from '@/lib/cota/entrada';
import { cn } from '@/lib/utils';
import { ListPlus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (s: string) => Number(s.replace(',', '.'));
const centavos = (n: number) => Math.round(n * 100) / 100;

/** Saldo da Cota (total − entrada) dividido igualmente nas parcelas. */
function valorParcelaSaldo(total: number, entrada: number, qtd: number) {
	return qtd > 0 && total > entrada ? centavos((total - entrada) / qtd) : 0;
}

export function ParcelasLoteModal({
	processoId,
	parcelas,
	obrigacao,
	valorTotalCota,
	onAtualizado,
}: {
	processoId: string;
	parcelas: IParcela[];
	obrigacao: 'PDE' | 'COTA';
	/** Valor calculado da Cota (ficha) — sugere o total no plano de Cota. */
	valorTotalCota?: number | null;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const cota = obrigacao === 'COTA';
	const [open, setOpen] = useState(false);

	const [quantidade, setQuantidade] = useState('10');
	const [numParcelaInicial, setNumParcelaInicial] = useState('1');
	const [valor, setValor] = useState('');
	const [vencimentoInicial, setVencimentoInicial] = useState('');
	// Só Cota: total, forma de pagamento e entrada de 50%.
	const [formaCota, setFormaCota] = useState<'parcelado' | 'a_vista'>('parcelado');
	const [totalCota, setTotalCota] = useState('');
	const [valorEntrada, setValorEntrada] = useState('');
	const [vencimentoEntrada, setVencimentoEntrada] = useState('');
	const [pending, startTransition] = useTransition();

	function abrir(aberto: boolean) {
		if (aberto) {
			setNumParcelaInicial('1');
			setVencimentoInicial('');
			if (cota) {
				const total = valorTotalCota && valorTotalCota > 0 ? valorTotalCota : 0;
				const entrada = total ? valorEntradaCota(total) : 0;
				setFormaCota('parcelado');
				setTotalCota(total ? String(total) : '');
				setValorEntrada(entrada ? String(entrada) : '');
				setVencimentoEntrada('');
				setQuantidade('5');
				setValor(total ? String(valorParcelaSaldo(total, entrada, 5)) : '');
			} else {
				setQuantidade('10');
				setValor('');
			}
		}
		setOpen(aberto);
	}

	/** Mudou total, entrada ou nº de parcelas: recalcula entrada/saldo sugeridos. */
	function alterarTotal(v: string) {
		setTotalCota(v);
		const total = num(v);
		if (!(total > 0)) return;
		if (formaCota === 'a_vista') {
			setValor(String(total));
			return;
		}
		const entrada = valorEntradaCota(total);
		setValorEntrada(String(entrada));
		setValor(String(valorParcelaSaldo(total, entrada, Number(quantidade))));
	}
	function alterarEntrada(v: string) {
		setValorEntrada(v);
		setValor(String(valorParcelaSaldo(num(totalCota), num(v), Number(quantidade))));
	}
	function alterarQuantidade(v: string) {
		setQuantidade(v);
		if (cota) setValor(String(valorParcelaSaldo(num(totalCota), num(valorEntrada), Number(v))));
	}
	function alterarForma(forma: 'parcelado' | 'a_vista') {
		setFormaCota(forma);
		const total = num(totalCota);
		if (forma === 'a_vista') {
			setValor(total > 0 ? String(total) : '');
		} else if (total > 0) {
			const entrada = valorEntradaCota(total);
			setValorEntrada(String(entrada));
			setQuantidade('5');
			setValor(String(valorParcelaSaldo(total, entrada, 5)));
		}
	}

	const cotaAVista = cota && formaCota === 'a_vista';
	const cotaParcelada = cota && formaCota === 'parcelado';
	const somaPlano = cotaAVista
		? num(valor) || 0
		: (cotaParcelada ? num(valorEntrada) || 0 : 0) + (num(valor) || 0) * (Number(quantidade) || 0);
	const diferencaCota = cota && num(totalCota) > 0 ? centavos(somaPlano - num(totalCota)) : 0;
	const totalParcelasGeradas = cotaAVista ? 1 : (Number(quantidade) || 0) + (cotaParcelada ? 1 : 0);

	function salvar() {
		const dados = {
			quantidade: cotaAVista ? 1 : Number(quantidade),
			num_parcela_inicial: Number(numParcelaInicial),
			valor: num(valor),
			vencimento_inicial: vencimentoInicial,
			obrigacao,
			entrada: cotaParcelada ? { valor: num(valorEntrada), vencimento: vencimentoEntrada } : undefined,
		};

		startTransition(async () => {
			const resp = await criarParcelasEmLoteAction(processoId, dados);
			if (!resp.ok || !resp.data) {
				toast.error(resp.error ?? 'Erro ao gerar parcelas.');
				return;
			}
			onAtualizado(resp.data);
			toast.success(`${totalParcelasGeradas} parcela(s) gerada(s).`);
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={abrir}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<ListPlus className="h-3.5 w-3.5" />
					Gerar parcelas
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Gerar parcelas em lote — {obrigacao === 'COTA' ? 'Cota de Solidariedade' : 'Outorga'}</DialogTitle>
					<DialogDescription>
						{cota
							? 'A Cota é paga à vista ou com entrada de 50% e o saldo parcelado. A entrada vira a 1ª parcela; o saldo é dividido igualmente, com vencimentos mensais.'
							: 'Informe o número total de parcelas e o valor — o mesmo valor é aplicado a todas. Os vencimentos seguem mensalmente a partir da 1ª parcela.'}
						{parcelas.length > 0 && (
							<span className="mt-1.5 block font-medium text-destructive">
								Este processo já tem {parcelas.length} parcela(s) de{' '}
								{obrigacao === 'COTA' ? 'Cota' : 'Outorga'} cadastrada(s) — gerar um novo lote vai
								substituí-las (as de {obrigacao === 'COTA' ? 'Outorga' : 'Cota'}, se houver, não
								são afetadas).
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				{cota && (
					<div className="flex flex-col gap-4">
						<div className="grid grid-cols-2 gap-2">
							{(
								[
									['parcelado', 'Entrada 50% + saldo parcelado'],
									['a_vista', 'À vista (parcela única)'],
								] as const
							).map(([forma, label]) => (
								<button
									key={forma}
									type="button"
									onClick={() => alterarForma(forma)}
									className={cn(
										'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
										formaCota === forma
											? 'border-primary bg-primary/10 font-semibold'
											: 'border-border hover:bg-muted',
									)}>
									{label}
								</button>
							))}
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium">Valor total da Cota</label>
							<Input type="number" step="0.01" value={totalCota} onChange={(e) => alterarTotal(e.target.value)} />
							{valorTotalCota ? (
								<span className="text-xs text-muted-foreground">
									Valor calculado no processo: {fmtBRL(valorTotalCota)}
								</span>
							) : null}
						</div>
						{cotaParcelada && (
							<div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-medium">Valor da entrada (50%)</label>
									<Input
										type="number"
										step="0.01"
										value={valorEntrada}
										onChange={(e) => alterarEntrada(e.target.value)}
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-medium">Vencimento da entrada</label>
									<Input
										type="date"
										value={vencimentoEntrada}
										onChange={(e) => setVencimentoEntrada(e.target.value)}
									/>
								</div>
							</div>
						)}
					</div>
				)}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{!cotaAVista && (
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium">{cota ? 'Nº de parcelas do saldo' : 'Nº de parcelas'}</label>
							<Input
								type="number"
								min={1}
								value={quantidade}
								onChange={(e) => alterarQuantidade(e.target.value)}
							/>
						</div>
					)}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">
							{cotaParcelada ? 'Nº da entrada (as do saldo seguem)' : 'Nº da primeira parcela'}
						</label>
						<Input
							type="number"
							min={1}
							value={numParcelaInicial}
							onChange={(e) => setNumParcelaInicial(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">
							{cotaAVista ? 'Valor da parcela única' : cota ? 'Valor de cada parcela do saldo' : 'Valor de cada parcela'}
						</label>
						<Input
							type="number"
							step="0.01"
							value={valor}
							onChange={(e) => setValor(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium">
							{cotaAVista
								? 'Vencimento'
								: cota
									? 'Vencimento da 1ª parcela do saldo'
									: 'Vencimento da 1ª parcela'}
						</label>
						<Input
							type="date"
							value={vencimentoInicial}
							onChange={(e) => setVencimentoInicial(e.target.value)}
						/>
					</div>
				</div>
				{cota && (
					<div className="rounded-lg bg-muted/40 px-3 py-2 text-xs tabular-nums">
						{totalParcelasGeradas} parcela(s) · soma do plano <b>{fmtBRL(somaPlano)}</b>
						{num(totalCota) > 0 && Math.abs(diferencaCota) >= 0.01 && (
							<span className="ml-1 text-destructive">
								({diferencaCota > 0 ? '+' : ''}
								{fmtBRL(diferencaCota)} em relação ao total da Cota)
							</span>
						)}
					</div>
				)}
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
						Cancelar
					</Button>
					{parcelas.length > 0 ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button disabled={pending}>{pending ? 'Gerando…' : 'Gerar parcelas'}</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Substituir parcelas existentes?</AlertDialogTitle>
									<AlertDialogDescription>
										Este processo já tem {parcelas.length} parcela(s) cadastrada(s). Gerar o
										novo lote vai apagar todas as parcelas existentes e criar as novas no
										lugar. Essa ação não pode ser desfeita.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction onClick={salvar}>Substituir e gerar</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Button onClick={salvar} disabled={pending}>
							{pending ? 'Gerando…' : 'Gerar parcelas'}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

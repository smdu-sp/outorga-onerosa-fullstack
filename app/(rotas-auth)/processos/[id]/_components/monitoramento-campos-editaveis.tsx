'use client';

import type { SecaoDetalhe } from '@/app/(rotas-auth)/_components/processo-detalhe-secoes';
import {
	INCIDENCIA_COTA,
	LABELS_ENDERECO,
	LABELS_LICENCA,
	ORIGEM_MONITORAMENTO,
	SITUACAO_MONITORAMENTO,
	TIPO_LICENCA,
} from '@/app/(rotas-auth)/_components/processo-detalhe-labels';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { salvarSecao } from '@/services/monitoramento/server-functions/salvar-secao';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

const CAMPOS_IGNORADOS = new Set([
	'id',
	'processo_id',
	'monitoramento_ficha_id',
	'criado_em',
	'alterado_em',
]);

const CAMPOS_TEXTAREA = new Set([
	'processo_modificativo',
	'proprietario_interessado',
	'observacao_historico',
	'solicitacao_dsiz',
	'preenchimento_qgis',
	'lote_cadastrado',
	'lote_atualizado',
	'nome',
	'macrozona',
	'macroarea',
	'uso_r_hmp_his',
	'uso_nr',
]);

const CAMPOS_DATA = new Set(['data_informacao_dmus', 'data_expedicao']);

const CAMPOS_ENUM: Record<string, Record<string, string>> = {
	incidencia_cota_solidariedade: INCIDENCIA_COTA,
	situacao: SITUACAO_MONITORAMENTO,
	origem: ORIGEM_MONITORAMENTO,
	tipo: TIPO_LICENCA,
};

function valorParaInput(chave: string, valor: unknown): string {
	if (valor === null || valor === undefined || valor === '') return '';
	if (typeof valor === 'object' && 'toString' in valor) {
		return (valor as { toString: () => string }).toString();
	}
	if (CAMPOS_DATA.has(chave) && typeof valor === 'string') {
		return valor.slice(0, 10);
	}
	return String(valor);
}

function valoresIguais(a: unknown, b: unknown): boolean {
	return valorParaInput('', a).trim() === valorParaInput('', b).trim();
}

function CampoEditavel({
	chave,
	label,
	valor,
	onSalvar,
	salvando,
}: {
	chave: string;
	label: string;
	valor: unknown;
	onSalvar: (chave: string, valor: string) => void;
	salvando: boolean;
}) {
	const [local, setLocal] = useState(() => valorParaInput(chave, valor));
	const original = useRef(valorParaInput(chave, valor));

	useEffect(() => {
		const texto = valorParaInput(chave, valor);
		setLocal(texto);
		original.current = texto;
	}, [chave, valor]);

	const commit = () => {
		if (valoresIguais(local, original.current)) return;
		onSalvar(chave, local);
	};

	const enumOpcoes = CAMPOS_ENUM[chave];
	const inputClass =
		'h-9 rounded-md border border-border bg-background px-3 text-sm shadow-none focus-visible:ring-1';

	if (enumOpcoes) {
		return (
			<div className="flex flex-col gap-1.5">
				<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
					{label}
				</label>
				<Select
					value={local || undefined}
					onValueChange={(v) => {
						setLocal(v);
						if (!valoresIguais(v, original.current)) onSalvar(chave, v);
					}}
					disabled={salvando}>
					<SelectTrigger className={cn(inputClass, 'w-full')}>
						<SelectValue placeholder="—" />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(enumOpcoes).map(([k, rotulo]) => (
							<SelectItem key={k} value={k}>
								{rotulo}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}

	if (CAMPOS_TEXTAREA.has(chave)) {
		return (
			<div className="flex flex-col gap-1.5 sm:col-span-2">
				<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
					{label}
				</label>
				<Textarea
					value={local}
					onChange={(e) => setLocal(e.target.value)}
					onBlur={commit}
					disabled={salvando}
					rows={3}
					className="resize-y text-sm"
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
				{label}
			</label>
			<div className="relative">
				<Input
					type={CAMPOS_DATA.has(chave) ? 'date' : 'text'}
					value={local}
					onChange={(e) => setLocal(e.target.value)}
					onBlur={commit}
					onKeyDown={(e) => {
						if (e.key === 'Enter') e.currentTarget.blur();
					}}
					disabled={salvando}
					className={inputClass}
				/>
				{salvando && (
					<Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
				)}
			</div>
		</div>
	);
}

function useSalvarSecao(
	processoId: string,
	secaoId: string,
	onAtualizado: (detalhe: IProcessoDetalhe) => void,
) {
	const [pending, startTransition] = useTransition();
	const salvandoRef = useRef(false);

	const salvar = useCallback(
		(payload: Record<string, unknown> | Record<string, unknown>[]) => {
			if (salvandoRef.current) return;
			salvandoRef.current = true;

			startTransition(async () => {
				try {
					const resp = await salvarSecao(processoId, secaoId, payload);
					if (!resp.ok || !resp.data) {
						toast.error(resp.error ?? 'Erro ao salvar.');
						return;
					}
					onAtualizado(resp.data);
					toast.success('Salvo.');
				} finally {
					salvandoRef.current = false;
				}
			});
		},
		[onAtualizado, processoId, secaoId],
	);

	return { salvar, pending };
}

function CamposGridEditavel({
	secaoId,
	processoId,
	dados,
	labels,
	onAtualizado,
}: {
	secaoId: string;
	processoId: string;
	dados: Record<string, unknown> | null | undefined;
	labels: Record<string, string>;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [valores, setValores] = useState<Record<string, unknown>>(() => ({ ...(dados ?? {}) }));

	useEffect(() => {
		setValores({ ...(dados ?? {}) });
	}, [dados]);

	const { salvar, pending } = useSalvarSecao(processoId, secaoId, onAtualizado);

	const handleSalvar = (chave: string, valor: string) => {
		const next = { ...valores, [chave]: valor };
		setValores(next);
		salvar(next);
	};

	const entradas = Object.keys(labels).filter((chave) => !CAMPOS_IGNORADOS.has(chave));

	return (
		<div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
			{entradas.map((chave) => (
				<CampoEditavel
					key={chave}
					chave={chave}
					label={labels[chave]}
					valor={valores[chave]}
					onSalvar={handleSalvar}
					salvando={pending}
				/>
			))}
		</div>
	);
}

function TabelaEnderecosEditavel({
	secaoId,
	processoId,
	enderecos,
	labels,
	onAtualizado,
}: {
	secaoId: string;
	processoId: string;
	enderecos: Record<string, unknown>[];
	labels: Record<string, string>;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const [linhas, setLinhas] = useState<Record<string, unknown>[]>(() =>
		enderecos.length > 0 ? enderecos.map((e) => ({ ...e })) : [{ ordem: 1 }],
	);

	useEffect(() => {
		setLinhas(enderecos.length > 0 ? enderecos.map((e) => ({ ...e })) : [{ ordem: 1 }]);
	}, [enderecos]);

	const { salvar, pending } = useSalvarSecao(processoId, secaoId, onAtualizado);

	const atualizarCelula = (index: number, chave: string, valor: string) => {
		const next = linhas.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha));
		setLinhas(next);
		salvar(next);
	};

	const colunas = Object.keys(labels).filter((c) => !CAMPOS_IGNORADOS.has(c));

	return (
		<div className="space-y-4">
			{linhas.map((linha, index) => (
				<div key={index} className="rounded-md border p-4">
					<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Endereço {(linha.ordem as number) ?? index + 1}
					</p>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{colunas.map((chave) => (
							<CampoEditavel
								key={chave}
								chave={chave}
								label={labels[chave]}
								valor={linha[chave]}
								onSalvar={(_, valor) => atualizarCelula(index, chave, valor)}
								salvando={pending}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function TabelaLicencasEditavel({
	secaoId,
	processoId,
	licencas,
	labels,
	onAtualizado,
}: {
	secaoId: string;
	processoId: string;
	licencas: Record<string, unknown>[];
	labels: Record<string, string>;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const tiposPadrao = Object.keys(TIPO_LICENCA);
	const [linhas, setLinhas] = useState<Record<string, unknown>[]>(() => {
		if (licencas.length > 0) return licencas.map((l) => ({ ...l }));
		return tiposPadrao.map((tipo) => ({ tipo }));
	});

	useEffect(() => {
		if (licencas.length > 0) {
			setLinhas(licencas.map((l) => ({ ...l })));
		} else {
			setLinhas(tiposPadrao.map((tipo) => ({ tipo })));
		}
	}, [licencas]);

	const { salvar, pending } = useSalvarSecao(processoId, secaoId, onAtualizado);

	const atualizarCelula = (index: number, chave: string, valor: string) => {
		const next = linhas.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha));
		setLinhas(next);
		const payload = next.filter(
			(l) => l.tipo && (l.numero || l.tipo_documento || l.data_expedicao),
		);
		salvar(payload);
	};

	const colunas = Object.keys(labels).filter((c) => !CAMPOS_IGNORADOS.has(c));

	return (
		<div className="space-y-4">
			{linhas.map((linha, index) => (
				<div key={String(linha.tipo ?? index)} className="rounded-md border p-4">
					<p className="mb-3 text-sm font-medium">
						{TIPO_LICENCA[String(linha.tipo)] ?? `Licença ${index + 1}`}
					</p>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{colunas
							.filter((c) => c !== 'tipo')
							.map((chave) => (
								<CampoEditavel
									key={chave}
									chave={chave}
									label={labels[chave]}
									valor={linha[chave]}
									onSalvar={(_, valor) => atualizarCelula(index, chave, valor)}
									salvando={pending}
								/>
							))}
					</div>
				</div>
			))}
		</div>
	);
}

export function RenderSecaoMonitoramentoEditavel({
	secao,
	detalhe,
	onAtualizado,
}: {
	secao: SecaoDetalhe;
	detalhe: IProcessoDetalhe;
	onAtualizado: (detalhe: IProcessoDetalhe) => void;
}) {
	const processoId = detalhe.id;

	if (secao.tipo === 'enderecos') {
		return (
			<TabelaEnderecosEditavel
				secaoId={secao.id}
				processoId={processoId}
				enderecos={secao.getLista(detalhe) ?? []}
				labels={LABELS_ENDERECO}
				onAtualizado={onAtualizado}
			/>
		);
	}

	if (secao.tipo === 'licencas') {
		return (
			<TabelaLicencasEditavel
				secaoId={secao.id}
				processoId={processoId}
				licencas={secao.getLista(detalhe) ?? []}
				labels={LABELS_LICENCA}
				onAtualizado={onAtualizado}
			/>
		);
	}

	if (secao.tipo === 'grid') {
		return (
			<CamposGridEditavel
				secaoId={secao.id}
				processoId={processoId}
				dados={secao.getDados(detalhe)}
				labels={secao.labels}
				onAtualizado={onAtualizado}
			/>
		);
	}

	return null;
}

/** @format */

'use client';

import type { ReactNode } from 'react';
import { IProcessoDetalhe } from '@/types/processo-detalhe';
import {
	SECOES_PROCESSO_DETALHE,
	type SecaoDetalhe,
} from './processo-detalhe-secoes';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	LABELS_ANOTACOES,
	LABELS_CALCULO_OUTORGA,
	LABELS_COORDENADA,
	LABELS_COTA,
	LABELS_ENDERECO,
	LABELS_ENQUADRAMENTO,
	LABELS_LICENCA,
	LABELS_LOCALIZACAO_LOTE,
	LABELS_MONITORAMENTO_FICHA,
	LABELS_PARCELA,
	LABELS_PROCESSO,
	LABELS_SITUACAO,
	LABELS_SUBCATEGORIA_USO,
	CONSTA_DOCUMENTO,
	INCIDENCIA_COTA,
	ORIGEM_MONITORAMENTO,
	SITUACAO_MONITORAMENTO,
	STATUS_PAGAMENTO,
	TIPO_LICENCA,
	TIPO_PROCESSO,
} from './processo-detalhe-labels';

const CAMPOS_IGNORADOS = new Set([
	'id',
	'processo_id',
	'monitoramento_ficha_id',
	'parcelas',
	'monitoramento',
	'monitoramento_cota',
	'coordenada',
	'localizacao_lote',
	'enderecos',
	'enquadramento_urbanistico',
	'subcategorias_uso',
	'calculo_outorga',
	'situacao',
	'licencas',
	'anotacoes_deuso',
]);

function formatarValor(
	chave: string,
	valor: unknown,
	labels?: Record<string, string>,
): string {
	if (valor === null || valor === undefined || valor === '') return '—';

	if (typeof valor === 'object') {
		if ('toString' in valor && typeof (valor as { toString: () => string }).toString === 'function') {
			const texto = (valor as { toString: () => string }).toString();
			if (texto && texto !== '[object Object]') {
				return formatarValor(chave, texto, labels);
			}
		}
		return '—';
	}

	if (chave === 'status_pagamento' && typeof valor === 'string') {
		return STATUS_PAGAMENTO[valor] ?? valor;
	}
	if (chave === 'tipo' && typeof valor === 'string') {
		return TIPO_LICENCA[valor] ?? TIPO_PROCESSO[valor] ?? valor;
	}
	if (chave === 'incidencia_cota_solidariedade' && typeof valor === 'string') {
		return INCIDENCIA_COTA[valor] ?? valor;
	}
	if (chave === 'situacao' && typeof valor === 'string') {
		return SITUACAO_MONITORAMENTO[valor] ?? valor;
	}
	if (chave === 'origem' && typeof valor === 'string') {
		return ORIGEM_MONITORAMENTO[valor] ?? valor;
	}
	if (
		(chave === 'planilha_calculo_cota' || chave === 'termo_compromisso_portaria') &&
		typeof valor === 'string'
	) {
		return CONSTA_DOCUMENTO[valor] ?? valor;
	}
	if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
	if (typeof valor === 'number') {
		if (chave === 'valor' || chave.startsWith('valor_') || chave.startsWith('estimativa_')) {
			return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
		}
		return valor.toLocaleString('pt-BR');
	}
	if (typeof valor === 'string' && valor.trim() !== '' && !isNaN(Number(valor))) {
		const n = Number(valor);
		if (
			chave.includes('area_') ||
			chave.startsWith('coeficiente_') ||
			chave === 'valor_m2_quadro14' ||
			chave === 'area_construida_computavel_total'
		) {
			return n.toLocaleString('pt-BR');
		}
		if (
			chave === 'valor' ||
			chave.startsWith('valor_') ||
			chave.startsWith('estimativa_')
		) {
			return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
		}
	}
	if (typeof valor === 'string') {
		if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
			const data = new Date(valor);
			if (!isNaN(data.getTime())) {
				return chave === 'criado_em' || chave === 'alterado_em'
					? data.toLocaleString('pt-BR')
					: data.toLocaleDateString('pt-BR');
			}
		}
		if (labels?.[chave] && labels[chave].includes('Valor') && !isNaN(Number(valor))) {
			return Number(valor).toLocaleString('pt-BR', {
				style: 'currency',
				currency: 'BRL',
			});
		}
		return valor.replace(/_/g, ' ');
	}
	return String(valor);
}

function CamposGrid({
	dados,
	labels,
}: {
	dados: Record<string, unknown> | null | undefined;
	labels: Record<string, string>;
}) {
	const entradas = Object.keys(labels)
		.filter((chave) => !CAMPOS_IGNORADOS.has(chave))
		.map((chave) => [chave, dados?.[chave]] as const);

	return (
		<dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3'>
			{entradas.map(([chave, valor]) => (
				<div key={chave} className='border-b border-border/50 pb-2'>
					<dt className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
						{labels[chave]}
					</dt>
					<dd className='text-sm mt-0.5 break-words whitespace-pre-wrap'>
						{formatarValor(chave, valor, labels)}
					</dd>
				</div>
			))}
		</dl>
	);
}

function TabelaParcelas({ parcelas }: { parcelas: Record<string, unknown>[] }) {
	const colunas = Object.keys(LABELS_PARCELA);

	return (
		<Table className='border'>
			<TableHeader className='bg-primary hover:opacity-100'>
				<TableRow className='hover:opacity-100'>
					{colunas.map((chave) => (
						<TableHead key={chave} className='text-secondary text-center text-xs'>
							{LABELS_PARCELA[chave]}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{parcelas.length === 0 && (
					<TableRow>
						<TableCell
							colSpan={colunas.length}
							className='text-center text-sm text-muted-foreground py-6'>
							Nenhuma parcela cadastrada.
						</TableCell>
					</TableRow>
				)}
				{parcelas.map((parcela, index) => (
					<TableRow key={index}>
						{Object.keys(LABELS_PARCELA).map((chave) => {
							const valor = parcela[chave];
							return (
								<TableCell key={chave} className='text-center text-sm'>
									{chave === 'status_quitacao' ? (
										valor === true || valor === 'true' ? (
											<Badge variant='success'>Quitada</Badge>
										) : valor === false || valor === 'false' ? (
											<Badge variant='destructive'>Pendente</Badge>
										) : (
											'—'
										)
									) : (
										formatarValor(chave, valor, LABELS_PARCELA)
									)}
								</TableCell>
							);
						})}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function formatarEnderecoLinha(endereco: Record<string, unknown>): string | null {
	const partes = [endereco.tipo, endereco.titulo, endereco.nome, endereco.numero]
		.filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
		.map((p) => String(p).trim());

	if (partes.length === 0) return null;

	const logradouro = [endereco.tipo, endereco.titulo, endereco.nome]
		.filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
		.map((p) => String(p).trim())
		.join(' ');

	return endereco.numero ? `${logradouro}, ${endereco.numero}` : logradouro;
}

function SecaoEnderecosResumo({
	enderecosDeuso,
	enderecoCota,
	variante = 'completa',
}: {
	enderecosDeuso?: Record<string, unknown>[] | null;
	enderecoCota?: string | null;
	variante?: 'completa' | 'compacta';
}) {
	const linhasDeuso =
		enderecosDeuso
			?.map((e) => formatarEnderecoLinha(e))
			.filter((l): l is string => !!l) ?? [];

	const temAlgum = linhasDeuso.length > 0 || !!enderecoCota?.trim();

	if (!temAlgum) {
		return (
			<div className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>
				<p className='font-medium text-foreground'>Endereço</p>
				<p className='mt-1'>
					Não há endereço neste processo. Endereços estruturados vêm da planilha DEUSO
					(aba <strong>Endereços</strong>); o texto completo da planilha de Cota fica na
					aba <strong>Cota de Solidariedade</strong> (campo Endereço).
				</p>
			</div>
		);
	}

	return (
		<div className='rounded-md border p-3 space-y-3'>
			<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
				Endereço
			</p>
			{linhasDeuso.length > 0 && (
				<div>
					<p className='text-xs text-muted-foreground mb-1'>Planilha DEUSO (monitoramento)</p>
					<ul className='space-y-1'>
						{linhasDeuso.map((linha, i) => (
							<li key={i} className='text-sm font-medium'>
								{linha}
							</li>
						))}
					</ul>
				</div>
			)}
			{enderecoCota?.trim() && (
				<div>
					<p className='text-xs text-muted-foreground mb-1'>
						Planilha Cota de Solidariedade
					</p>
					<p className='text-sm font-medium whitespace-pre-wrap'>{enderecoCota.trim()}</p>
				</div>
			)}
			{variante === 'completa' && linhasDeuso.length > 0 && (
				<p className='text-xs text-muted-foreground'>
					Detalhamento (tipo, título, logradouro, número) na aba{' '}
					<strong>Endereços</strong>.
				</p>
			)}
		</div>
	);
}

function TabelaEnderecos({ enderecos }: { enderecos: Record<string, unknown>[] }) {
	if (!enderecos.length) {
		return (
			<div className='space-y-3'>
				<SecaoEnderecosResumo enderecosDeuso={[]} enderecoCota={null} />
				<CamposGrid dados={undefined} labels={LABELS_ENDERECO} />
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<SecaoEnderecosResumo enderecosDeuso={enderecos} variante='compacta' />
			{enderecos.map((endereco, index) => {
				const linha = formatarEnderecoLinha(endereco);
				return (
					<div key={index} className='rounded-md border p-3'>
						<p className='text-xs font-semibold text-muted-foreground mb-1'>
							Endereço {(endereco.ordem as number) ?? index + 1}
						</p>
						{linha && (
							<p className='text-sm font-medium mb-3 text-primary'>{linha}</p>
						)}
						<CamposGrid dados={endereco} labels={LABELS_ENDERECO} />
					</div>
				);
			})}
		</div>
	);
}

function TabelaLicencas({ licencas }: { licencas: Record<string, unknown>[] }) {
	const colunas = Object.keys(LABELS_LICENCA);

	return (
		<Table className='border'>
			<TableHeader className='bg-primary hover:opacity-100'>
				<TableRow className='hover:opacity-100'>
					{colunas.map((chave) => (
						<TableHead key={chave} className='text-secondary text-center text-xs'>
							{LABELS_LICENCA[chave]}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{licencas.length === 0 && (
					<TableRow>
						<TableCell
							colSpan={colunas.length}
							className='text-center text-sm text-muted-foreground py-6'>
							Nenhuma licença cadastrada.
						</TableCell>
					</TableRow>
				)}
				{licencas.map((licenca, index) => (
					<TableRow key={index}>
						{Object.keys(LABELS_LICENCA).map((chave) => (
							<TableCell key={chave} className='text-center text-sm'>
								{formatarValor(chave, licenca[chave], LABELS_LICENCA)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function SecaoBloco({
	titulo,
	tabela,
	children,
}: {
	titulo: string;
	tabela: string;
	children: ReactNode;
}) {
	return (
		<section id={tabela} className='scroll-mt-4 space-y-3 pb-6 border-b border-border/60 last:border-0'>
			<div>
				<h3 className='text-sm font-semibold text-foreground'>{titulo}</h3>
				<p className='text-xs text-muted-foreground font-mono'>{tabela}</p>
			</div>
			{children}
		</section>
	);
}

function secaoSemRegistro(secao: SecaoDetalhe, detalhe: IProcessoDetalhe): boolean {
	if (secao.id === 'cota') return !detalhe.monitoramento_cota;
	if (secao.tabela.startsWith('monitoramento_') && secao.id !== 'cota') {
		return !detalhe.monitoramento;
	}
	return false;
}

function RenderSecao({ secao, detalhe }: { secao: SecaoDetalhe; detalhe: IProcessoDetalhe }) {
	if (secao.tipo === 'parcelas') {
		return <TabelaParcelas parcelas={secao.getLista(detalhe) ?? []} />;
	}
	if (secao.tipo === 'enderecos') {
		return <TabelaEnderecos enderecos={secao.getLista(detalhe) ?? []} />;
	}
	if (secao.tipo === 'licencas') {
		return <TabelaLicencas licencas={secao.getLista(detalhe) ?? []} />;
	}
	if (secao.tipo === 'grid') {
		return <CamposGrid dados={secao.getDados(detalhe)} labels={secao.labels} />;
	}
	return null;
}

function VisaoCompletaDetalhe({ detalhe }: { detalhe: IProcessoDetalhe }) {
	return (
		<div className='space-y-1'>
			{SECOES_PROCESSO_DETALHE.map((secao) => (
				<SecaoBloco key={secao.id} titulo={secao.titulo} tabela={secao.tabela}>
					{secaoSemRegistro(secao, detalhe) ? (
						<p className='text-sm text-muted-foreground'>
							Sem registro nesta tabela para este processo.
						</p>
					) : (
						<RenderSecao secao={secao} detalhe={detalhe} />
					)}
				</SecaoBloco>
			))}
		</div>
	);
}

export {
	CamposGrid,
	SecaoBloco,
	VisaoCompletaDetalhe,
	RenderSecao,
	SecaoEnderecosResumo,
	TabelaParcelas,
	TabelaEnderecos,
	TabelaLicencas,
	LABELS_PROCESSO,
	LABELS_MONITORAMENTO_FICHA,
	LABELS_COORDENADA,
	LABELS_LOCALIZACAO_LOTE,
	LABELS_ENQUADRAMENTO,
	LABELS_SUBCATEGORIA_USO,
	LABELS_CALCULO_OUTORGA,
	LABELS_SITUACAO,
	LABELS_ANOTACOES,
	LABELS_COTA,
};

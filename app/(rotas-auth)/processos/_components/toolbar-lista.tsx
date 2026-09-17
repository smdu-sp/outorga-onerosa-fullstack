'use client';

import { ORDEM_PENDENCIAS, PENDENCIAS_META } from '@/lib/pendencias-processo';
import { cn } from '@/lib/utils';
import { FiltroBar, FiltroSegmented, filtroSelectClass } from '@/components/filtro-ui';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FiltroGrupo } from './filtro-grupo';

const PENDENCIA_OPCOES = [
	{ value: '', label: 'Completude: todos' },
	{ value: 'TODAS', label: 'Com pendências' },
	...ORDEM_PENDENCIAS.map((c) => ({ value: c, label: PENDENCIAS_META[c].label })),
];

const VENC_CHIPS = [
	{ value: '', label: 'Todos' },
	{ value: 'MES', label: 'Vence este mês' },
	{ value: '7DIAS', label: 'Vence em 7 dias' },
] as const;

export function ToolbarLista({
	buscaInicial = '',
	tipoInicial = 'TODOS',
	statusInicial = 'TODOS',
	vencimentoInicial = '',
	pendenciaInicial = '',
	novoInicial = 'TODOS',
	mostrarFiltroNovo = false,
}: {
	buscaInicial?: string;
	tipoInicial?: string;
	statusInicial?: string;
	vencimentoInicial?: string;
	pendenciaInicial?: string;
	novoInicial?: string;
	mostrarFiltroNovo?: boolean;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [busca, setBusca] = useState(buscaInicial);
	const [vencimento, setVencimento] = useState(vencimentoInicial);
	const [pendencia, setPendencia] = useState(pendenciaInicial);

	const atualizarParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (!value || value === 'TODOS') params.delete(key);
				else params.set(key, value);
			}
			params.set('pagina', '1');
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	return (
		<FiltroBar>
			<div className="flex h-8 min-w-[120px] max-w-[420px] flex-1 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 sm:h-9 sm:min-w-[220px] sm:gap-[7px] sm:px-2.5">
				<Search className="h-[13px] w-[13px] shrink-0 text-muted-foreground sm:h-[15px] sm:w-[15px]" />
				<input
					value={busca}
					onChange={(e) => {
						setBusca(e.target.value);
						if (e.target.value === '') atualizarParams({ busca: null });
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							atualizarParams({ busca: busca.trim() || null });
						}
					}}
					placeholder="Buscar por número, interessado ou CPF/CNPJ…"
					className="w-full min-w-0 border-none bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
				/>
			</div>

			<div className="shrink-0">
				<FiltroGrupo
					valor={tipoInicial}
					onChange={(tipo) => atualizarParams({ tipo })}
					opcoes={[
						{ value: 'TODOS', label: 'Todos os tipos' },
						{ value: 'PDE', label: 'Outorga' },
						{ value: 'COTA', label: 'Cota' },
						{ value: 'AIU', label: 'AIU' },
					]}
				/>
			</div>
			<div className="shrink-0">
				<FiltroGrupo
					valor={statusInicial}
					onChange={(status) => atualizarParams({ status })}
					opcoes={[
						{ value: 'TODOS', label: 'Todos' },
						{ value: 'EM_PAGAMENTO', label: 'Em pagamento' },
						{ value: 'QUITADO', label: 'Quitado' },
						{ value: 'QUEBRA', label: 'Quebra' },
					]}
				/>
			</div>
			{mostrarFiltroNovo && (
				<div className="shrink-0">
					<FiltroGrupo
						valor={novoInicial}
						onChange={(novo) => atualizarParams({ novo })}
						opcoes={[
							{ value: 'TODOS', label: 'Todos' },
							{ value: 'SIM', label: 'Novos' },
						]}
					/>
				</div>
			)}

			<div className="shrink-0">
				<FiltroSegmented
					opcoes={VENC_CHIPS.map((c) => ({ value: c.value, label: c.label }))}
					valor={vencimento}
					onChange={(value) => {
						setVencimento(value);
						atualizarParams({ vencimento: value || null });
					}}
				/>
			</div>

			<select
				value={pendencia}
				onChange={(e) => {
					setPendencia(e.target.value);
					atualizarParams({ pendencia: e.target.value || null });
				}}
				title="Filtrar por dados faltantes para os relatórios"
				className={cn(filtroSelectClass, 'w-[120px] shrink-0 sm:w-auto')}>
				{PENDENCIA_OPCOES.map((opcao) => (
					<option key={opcao.value} value={opcao.value}>
						{opcao.label}
					</option>
				))}
			</select>
		</FiltroBar>
	);
}

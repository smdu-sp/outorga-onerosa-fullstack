'use client';

import { useState, useTransition } from 'react';
import {
	AlertTriangle,
	ArrowRight,
	Building,
	CheckCircle2,
	ClipboardList,
	Database,
	Info,
	Loader2,
} from 'lucide-react';
import { salvarDadosGeoSampa } from '@/services/monitoramento/server-functions/salvar-geosampa';
import { criar } from '@/services/processos/server-functions/criar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IEnquadramentoResult } from '../../actions';
import { resumoEnquadramento, resumoEndereco, resumoParametros } from '@/lib/geosampa-resumo';
import {
	CampoKV,
	NovoCard,
	NovoCardHead,
} from '../../_components/novo-processo-ui';

interface Props {
	identificador: string;
	modo: 'SQL' | 'PROCESSO';
	enquadramento?: IEnquadramentoResult;
	enquadramentoErro?: string;
}

const fmtArea = (n: number) => n.toLocaleString('pt-BR') + ' m²';
const fmtBRL = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function CampoForm({
	label,
	required,
	children,
	erro,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
	erro?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
				{label}
				{required && <span className="text-destructive"> *</span>}
			</label>
			{children}
			{erro && (
				<p className="flex items-center gap-1 text-xs font-medium text-destructive">
					<AlertTriangle className="h-3 w-3" />
					{erro}
				</p>
			)}
		</div>
	);
}

export default function FormCriarProcesso({
	identificador,
	modo,
	enquadramento,
	enquadramentoErro,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [numProcesso, setNumProcesso] = useState(modo === 'PROCESSO' ? identificador : '');
	const [tipo, setTipo] = useState<'PDE' | 'COTA'>('PDE');
	const [protocolo, setProtocolo] = useState('');
	const [erro, setErro] = useState('');

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!numProcesso.trim()) {
			setErro('O número do processo é obrigatório.');
			return;
		}
		setErro('');

		startTransition(async () => {
			const resp = await criar({
				num_processo: numProcesso.trim(),
				tipo,
				protocolo_ad: protocolo.trim() || undefined,
				data_entrada: new Date(),
				valor_total: 0,
			});

			if (!resp.ok) {
				toast.error(resp.error ?? 'Erro ao criar o processo.');
				return;
			}

			const criado = resp.data as { id?: string } | null;

			if (enquadramento && criado?.id) {
				const salvarGeo = await salvarDadosGeoSampa(
					criado.id,
					modo,
					identificador,
					enquadramento,
				);

				if (!salvarGeo.ok) {
					toast.warning(
						salvarGeo.error ??
							'Processo criado, mas os dados do GeoSampa não foram salvos.',
					);
					router.push(`/processos/${criado.id}`);
					return;
				}
			}

			toast.success('Processo criado com sucesso!');
			router.push(criado?.id ? `/processos/${criado.id}` : '/processos');
		});
	}

	const enq = enquadramento ? resumoEnquadramento(enquadramento) : null;
	const par = enquadramento ? resumoParametros(enquadramento.calculo_outorga) : null;
	const endereco = enquadramento ? resumoEndereco(enquadramento) : '';

	return (
		<div className="flex flex-col gap-5">
			{enquadramento ? (
				<NovoCard>
					<NovoCardHead
						icon={Building}
						title="Enquadramento Urbanístico"
						subtitle={
							<>
								Consultado para{' '}
								<b className="font-mono text-xs">{identificador}</b>
							</>
						}
						extra={
							<span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
								<Database className="h-3 w-3" />
								GeoSampa
							</span>
						}
					/>
					<div className="space-y-5 px-6 py-5">
						<div className="flex items-center gap-2 rounded-[10px] border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-semibold text-success">
							<CheckCircle2 className="h-4 w-4 shrink-0" />
							Enquadramento confirmado
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-[26px]">
							{enquadramento.proprietario_interessado && (
								<CampoKV
									label="Proprietário / Interessado"
									value={enquadramento.proprietario_interessado}
									full
								/>
							)}
							{endereco && <CampoKV label="Endereço" value={endereco} full />}
							<CampoKV label="Distrito" value={enq?.distrito} />
							<CampoKV label="Subprefeitura" value={enq?.subprefeitura} />
							<CampoKV label="Macrozona" value={enq?.macrozona} full />
							<CampoKV
								label="Zona de Uso"
								value={enq?.zonas.join(' · ')}
								full
								mono
							/>
							<CampoKV label="Tipologia OODC" value={enq?.tipologia_uso_oodc} />
						</div>

						<div className="h-px bg-border" />

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-[26px]">
							<CampoKV label="Coef. Básico" value={par?.coeficiente_basico} highlight />
							<CampoKV label="Coef. Máximo" value={par?.coeficiente_maximo} highlight />
							<CampoKV label="Área Terreno" value={par ? fmtArea(par.area_terreno) : undefined} />
							<CampoKV
								label="Valor m² (Quadro 14)"
								value={par ? fmtBRL(par.valor_m2_quadro14) : undefined}
							/>
						</div>
					</div>
				</NovoCard>
			) : enquadramentoErro ? (
				<NovoCard className="border-amber-200">
					<div className="flex items-start gap-3 px-6 py-5">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
						<div>
							<p className="text-sm font-medium">Enquadramento não disponível</p>
							<p className="mt-0.5 text-xs text-muted-foreground">{enquadramentoErro}</p>
						</div>
					</div>
				</NovoCard>
			) : null}

			<NovoCard className="overflow-hidden">
				<NovoCardHead
					icon={ClipboardList}
					title="Dados do processo"
					subtitle="Preencha as informações para registrar o processo"
				/>
				<form id="form-criar" onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
					<CampoForm label="Nº Processo" required erro={erro}>
						<input
							id="num_processo"
							value={numProcesso}
							onChange={(e) => {
								setNumProcesso(e.target.value);
								if (erro) setErro('');
							}}
							placeholder="6068.0000/0000000-0"
							disabled={isPending}
							autoFocus={!numProcesso}
							className={cn(
								'h-11 w-full rounded-lg border border-border bg-secondary px-3 font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
								erro && 'border-destructive',
							)}
						/>
					</CampoForm>

					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<CampoForm label="Tipo de processo">
							<select
								id="tipo"
								value={tipo}
								onChange={(e) => setTipo(e.target.value as 'PDE' | 'COTA')}
								disabled={isPending}
								className="h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
								<option value="PDE">PDE</option>
								<option value="COTA">COTA</option>
							</select>
						</CampoForm>

						<CampoForm label="Nº Protocolo AD">
							<input
								id="protocolo"
								value={protocolo}
								onChange={(e) => setProtocolo(e.target.value)}
								placeholder="Opcional"
								disabled={isPending}
								className="h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</CampoForm>
					</div>
				</form>

				<div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-secondary px-[22px] py-[18px] sm:flex-row sm:items-center">
					<p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
						<Info className="h-3.5 w-3.5 shrink-0" />
						Após criar, o processo ficará disponível na lista para edição.
					</p>
					<div className="flex w-full gap-2.5 sm:w-auto">
						<Link
							href="/processos/novo"
							className={cn(
								'inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium no-underline hover:bg-background sm:flex-none',
								isPending && 'pointer-events-none opacity-50',
							)}>
							Voltar
						</Link>
						<button
							form="form-criar"
							type="submit"
							disabled={isPending}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70 sm:flex-none">
							{isPending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Criando processo…
								</>
							) : (
								<>
									Criar processo
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</div>
				</div>
			</NovoCard>
		</div>
	);
}

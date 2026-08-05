import Link from 'next/link';
import { BarChart3, FolderOpen, FolderPlus, Sparkles } from 'lucide-react';

const atalhos = [
	{
		href: '/processos/novo',
		titulo: 'Novo processo',
		descricao: 'Abrir processo via SQL/GeoSampa ou número.',
		icone: FolderPlus,
	},
	{
		href: '/processos',
		titulo: 'Processos',
		descricao: 'Listar, filtrar e acompanhar processos.',
		icone: FolderOpen,
	},
	{
		href: '/relatorios',
		titulo: 'Relatórios',
		descricao: 'Análise de arrecadação e mapas.',
		icone: BarChart3,
	},
	{
		href: '/processos?novo=SIM',
		titulo: 'Processos novos',
		descricao: 'Criados no portal e ainda sem parcelas.',
		icone: Sparkles,
	},
] as const;

export function PainelAtalhos() {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{atalhos.map((item) => {
				const Icon = item.icone;
				return (
					<Link
						key={item.href}
						href={item.href}
						className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
						<div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
							<Icon className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<div className="text-sm font-semibold text-foreground group-hover:text-primary">
								{item.titulo}
							</div>
							<div className="mt-0.5 text-xs text-muted-foreground">{item.descricao}</div>
						</div>
					</Link>
				);
			})}
		</div>
	);
}

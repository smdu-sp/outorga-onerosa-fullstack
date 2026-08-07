/** @format */

import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { requireAuth, usuarioPermitido } from '@/lib/auth/session';
import {
	listarProcessosSeiComProtocoloAd,
	listarProcessosSemCategoriaUso,
} from '@/lib/server/admin-dados-faltantes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PainelDadosFaltantes } from './_components/painel-dados-faltantes';
import { PainelSeiVsBi } from './_components/painel-sei-vs-bi';

export const dynamic = 'force-dynamic';

export default async function AdminDadosFaltantesPage() {
	const session = await requireAuth();
	const permitido =
		session.usuario.dev ||
		(await usuarioPermitido(session.usuario.sub, 'processos_ver_todos'));
	if (!permitido) redirect('/');

	const [inicial, seiInicial] = await Promise.all([
		listarProcessosSemCategoriaUso(),
		listarProcessosSeiComProtocoloAd(),
	]);

	return (
		<div className="mx-auto w-full px-4 py-7 pb-[60px] sm:px-8">
			<div className="mb-6">
				<h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight">
					<AlertTriangle className="h-6 w-6 text-amber-500" />
					Dados faltantes
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Categoria de uso incompleta e cruzamento SEI × BI pelo protocolo do Aprova Digital.
				</p>
			</div>

			<Tabs defaultValue="categoria" className="gap-5">
				<TabsList>
					<TabsTrigger value="categoria">
						Categoria faltante ({inicial.length})
					</TabsTrigger>
					<TabsTrigger value="sei-bi">
						Protocolo AD × BI ({seiInicial.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="categoria" className="mt-0">
					<PainelDadosFaltantes inicial={inicial} />
				</TabsContent>

				<TabsContent value="sei-bi" className="mt-0">
					<PainelSeiVsBi inicial={seiInicial} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

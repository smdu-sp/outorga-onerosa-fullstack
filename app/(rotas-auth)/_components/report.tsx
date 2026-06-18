/** @format */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Landmark, Wallet } from 'lucide-react';
import React from 'react';

const formatter = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

export default function Report({ processosTotal, totalRecebido, totalReceber }: { processosTotal?: number; totalRecebido?: number; totalReceber?: number }) {
	const data = [
		{
			name: 'Total de processos',
			value: (processosTotal || 0).toLocaleString('pt-BR'),
			icon: FileText,
		},
		{
			name: 'Valor recebido',
			value: formatter.format(totalRecebido || 0),
			icon: Landmark,
		},
		{
			name: 'Valor a receber',
			value: formatter.format(totalReceber || 0),
			icon: Wallet,
		},
	];
	return (
		<div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
			{data.map((item, index) => {
				const Icon = item.icon;
				return (
					<Card
						key={index}
						className='rounded-2xl border-border/70 bg-card shadow-xs'>
						<CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2'>
							<div className='space-y-1'>
								<p className='text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground'>
									{item.name}
								</p>
								<CardTitle className='text-2xl font-semibold tracking-tight'>{item.value}</CardTitle>
							</div>
							<div className='grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
								<Icon className='h-4 w-4' />
							</div>
						</CardHeader>
						<CardContent className='pt-0 text-xs text-muted-foreground'>
							Dados consolidados do período atual.
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

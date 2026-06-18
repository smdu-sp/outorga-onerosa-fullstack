/** @format */

'use client';

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';

export default function ProgressaoSemestralProjetada({ projecaoMensal }: { projecaoMensal?: { label: string; value: number }[] }) {	
	const chartConfig = {
		value: {
			label: 'Valor Projetado',
			color: 'hsl(var(--chart-1))',
		},
	} satisfies ChartConfig;
	const chartData = projecaoMensal || [];
	return (
		<Card className='rounded-2xl border-border/70 shadow-xs'>
			<CardHeader>
				<CardTitle>Progressão Projetada (até o final do ano)</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className='max-h-60 w-full'
					config={chartConfig}>
					<BarChart
						accessibilityLayer
						data={chartData}
						margin={{
							top: 32
						}}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey='label'
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									indicator='line'
									className='w-40'
								/>
							}
						/>
						<Bar
							dataKey='value'
							fill='var(--color-value)'
							radius={8}>
							<LabelList
								position='top'
								offset={12}
								className='fill-foreground'
								fontSize={12}
								formatter={(val: number) =>
									val.toLocaleString('pt-BR', {
										style: 'currency',
										currency: 'brl',
									})
								}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

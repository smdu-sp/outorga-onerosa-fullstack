/** @format */

'use client';

import { Area, AreaChart, CartesianGrid, LabelList, XAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';

export default function ValorRecebidoAno({ recebidoMensal }: { recebidoMensal?: { label: string; value: number }[] }) {
	const chartConfig = {
		value: {
			label: 'Recebido',
			color: 'hsl(var(--chart-1))',
		},
	} satisfies ChartConfig;
	const chartData = recebidoMensal || [];
	return (
		<Card className='rounded-2xl border-border/70 shadow-xs'>
			<CardHeader>
				<CardTitle>Valor Recebido (até o mês anterior)</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className='max-h-60 w-full'
					config={chartConfig}>
					<AreaChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 28,
							right: 28,
							top: 20,
						}}>
						<CartesianGrid vertical={false} />
						<defs>
							<linearGradient
								id='fillValue'
								x1='0'
								y1='0'
								x2='0'
								y2='1'>
								<stop
									offset='5%'
									stopColor='var(--color-value)'
									stopOpacity={0.8}
								/>
								<stop
									offset='95%'
									stopColor='var(--color-value)'
									stopOpacity={0.2}
								/>
							</linearGradient>
						</defs>
						<XAxis
							dataKey='label'
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator='line'
									className='w-40'
								/>
							}
						/>
						<Area
							dataKey='value'
							type='natural'
							fill='url(#fillValue)'
							fillOpacity={0.4}
							stroke='var(--color-value)'>
							<LabelList
								position='top'
								offset={8}
								className='fill-foreground'
								fontSize={10}
								formatter={(val: number) =>
									val.toLocaleString('pt-BR', {
										style: 'currency',
										currency: 'brl',
									})
								}
							/>
						</Area>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

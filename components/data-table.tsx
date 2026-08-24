/** @format */

'use client';

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/table';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	onRowClick?: (row: TData) => void;
}

export default function DataTable<TData, TValue>({
	columns,
	data,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="text-muted-foreground font-semibold text-xs uppercase tracking-wider h-10">
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row, i) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}
								onClick={() => onRowClick?.(row.original)}
								className={cn(
									i % 2 === 1 && 'bg-muted/30',
									onRowClick && 'cursor-pointer',
								)}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id} className="text-sm py-3">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
								Nenhum resultado encontrado.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export function TableSkeleton() {
	return (
		<div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs space-y-0">
			<div className="h-10 bg-muted border-b border-border/70" />
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 px-4 h-14 border-b last:border-0">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-8" />
					<Skeleton className="h-4 w-36" />
				</div>
			))}
		</div>
	);
}

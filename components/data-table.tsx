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
		<div className="rounded-lg border overflow-hidden">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
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
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}
								onClick={() => onRowClick?.(row.original)}
								className={onRowClick ? 'cursor-pointer' : undefined}>
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
		<div className="rounded-lg border overflow-hidden space-y-0">
			<div className="h-10 bg-muted/50 border-b" />
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

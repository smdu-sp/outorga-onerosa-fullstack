'use client';

import type { GeoSampaLogEntry } from '@/types/geosampa';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

const LEVEL_COLOR: Record<GeoSampaLogEntry['level'], string> = {
	info: 'text-sky-400',
	success: 'text-emerald-400',
	warn: 'text-amber-400',
	error: 'text-red-400',
};

const LEVEL_LABEL: Record<GeoSampaLogEntry['level'], string> = {
	info: 'INFO',
	success: ' OK ',
	warn: 'WARN',
	error: 'ERR!',
};

function fmtTs(ts: number): string {
	const d = new Date(ts);
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	const ss = String(d.getSeconds()).padStart(2, '0');
	const ms = String(d.getMilliseconds()).padStart(3, '0');
	return `${hh}:${mm}:${ss}.${ms}`;
}

export function GeoSampaLogPanel({
	entries,
	onClose,
	inline = false,
}: {
	entries: GeoSampaLogEntry[];
	onClose: () => void;
	inline?: boolean;
}) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [entries.length]);

	return (
		<div className={inline
			? 'w-full rounded-lg border border-yellow-500/40 bg-zinc-950'
			: 'absolute left-0 top-full z-50 mt-1 w-[520px] rounded-lg border border-yellow-500/40 bg-zinc-950 shadow-2xl'
		}>
			<div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
				<div className="flex items-center gap-2">
					<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-400">
						DEV
					</span>
					<span className="font-mono text-xs font-semibold text-zinc-300">GeoSampa Log</span>
					<span className="font-mono text-[10px] text-zinc-600">
						{entries.length} evento{entries.length !== 1 ? 's' : ''}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded p-0.5 text-zinc-500 hover:text-zinc-300">
					<X className="h-3.5 w-3.5" />
				</button>
			</div>
			<div className="max-h-64 overflow-y-auto p-2">
				{entries.map((e, i) => (
					<div key={i} className="flex gap-2 py-px font-mono text-[11px] leading-5">
						<span className="shrink-0 text-zinc-600">{fmtTs(e.ts)}</span>
						<span className={`shrink-0 font-bold ${LEVEL_COLOR[e.level]}`}>
							[{LEVEL_LABEL[e.level]}]
						</span>
						<span className="text-zinc-300">{e.msg}</span>
					</div>
				))}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}

'use client';

import { clearDevLogSessions, loadDevLogSessions, type DevLogSession } from '@/lib/dev-log-store';
import type { GeoSampaLogEntry } from '@/types/geosampa';
import { ChevronDown, ChevronRight, Terminal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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

const LEVEL_BG: Record<GeoSampaLogEntry['level'], string> = {
	info: '',
	success: '',
	warn: 'bg-amber-950/30',
	error: 'bg-red-950/40',
};

function fmtTs(ts: number): string {
	const d = new Date(ts);
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	const ss = String(d.getSeconds()).padStart(2, '0');
	const ms = String(d.getMilliseconds()).padStart(3, '0');
	return `${hh}:${mm}:${ss}.${ms}`;
}

function fmtDate(ts: number): string {
	return new Date(ts).toLocaleString('pt-BR');
}

function sessionStatus(entries: GeoSampaLogEntry[]): 'error' | 'warn' | 'success' {
	if (entries.some((e) => e.level === 'error')) return 'error';
	if (entries.some((e) => e.level === 'warn')) return 'warn';
	return 'success';
}

const STATUS_DOT: Record<string, string> = {
	error: 'bg-red-500',
	warn: 'bg-amber-400',
	success: 'bg-emerald-400',
};

function SessionCard({ session }: { session: DevLogSession }) {
	const [open, setOpen] = useState(false);
	const status = sessionStatus(session.entries);

	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/60 transition-colors">
				<span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
				<span className="font-mono text-sm font-semibold text-zinc-100 min-w-0 truncate">
					{session.processo}
				</span>
				<span className="ml-auto shrink-0 font-mono text-[11px] text-zinc-500">
					{fmtDate(session.ts)}
				</span>
				<span className="shrink-0 font-mono text-[11px] text-zinc-600">
					{session.entries.length} eventos
				</span>
				{open ? (
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
				) : (
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
				)}
			</button>

			{open && (
				<div className="border-t border-zinc-800 p-3 space-y-0.5">
					{session.entries.map((e, i) => (
						<div
							key={i}
							className={`flex gap-2 rounded px-1 py-px font-mono text-[11px] leading-5 ${LEVEL_BG[e.level]}`}>
							<span className="shrink-0 text-zinc-600">{fmtTs(e.ts)}</span>
							<span className={`shrink-0 font-bold ${LEVEL_COLOR[e.level]}`}>
								[{LEVEL_LABEL[e.level]}]
							</span>
							<span className="text-zinc-300">{e.msg}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function DevLogsPage() {
	const [sessions, setSessions] = useState<DevLogSession[]>([]);

	useEffect(() => {
		setSessions(loadDevLogSessions());
	}, []);

	function handleClear() {
		clearDevLogSessions();
		setSessions([]);
	}

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-8">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/40 bg-yellow-500/10">
						<Terminal className="h-4 w-4 text-yellow-400" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-bold">Dev Logs</h1>
							<span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-400">
								DEV
							</span>
						</div>
						<p className="mt-0.5 text-sm text-muted-foreground">
							Histórico de buscas GeoSampa — {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}
						</p>
					</div>
				</div>

				{sessions.length > 0 && (
					<button
						type="button"
						onClick={handleClear}
						className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20">
						<Trash2 className="h-3.5 w-3.5" />
						Limpar tudo
					</button>
				)}
			</div>

			{sessions.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20 text-center">
					<Terminal className="mb-3 h-8 w-8 text-zinc-600" />
					<p className="text-sm font-medium text-zinc-400">Nenhum log registrado</p>
					<p className="mt-1 text-xs text-zinc-600">
						Pressione &quot;Atualizar do GeoSampa&quot; em um processo para gerar logs.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{sessions.map((s) => (
						<SessionCard key={s.id} session={s} />
					))}
				</div>
			)}
		</div>
	);
}

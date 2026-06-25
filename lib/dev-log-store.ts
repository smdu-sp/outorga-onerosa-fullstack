import type { GeoSampaLogEntry } from '@/types/geosampa';

export type DevLogSession = {
	id: string;
	ts: number;
	processo: string;
	entries: GeoSampaLogEntry[];
};

const KEY = '__dev_geosampa_logs';
const MAX_SESSIONS = 100;

export function saveDevLogSession(session: DevLogSession): void {
	try {
		const existing = loadDevLogSessions();
		const updated = [session, ...existing].slice(0, MAX_SESSIONS);
		localStorage.setItem(KEY, JSON.stringify(updated));
	} catch {}
}

export function loadDevLogSessions(): DevLogSession[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as DevLogSession[]) : [];
	} catch {
		return [];
	}
}

export function clearDevLogSessions(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {}
}

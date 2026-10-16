import type { Movement } from './model.ts';

export type Portfolio = { id: string; name: string };
export type Platform = { id: string; portfolioId: string; name: string };
export type Valuation = { platformId: string; date: string; month: string; amount: number };
export const initialPortfolios = (): Portfolio[] => [{ id: 'long-term', name: 'Cartera principal' }];
export const initialPlatforms = (): Platform[] => [
	{ id: 'funds', portfolioId: 'long-term', name: 'Plataforma de fondos' },
	{ id: 'broker', portfolioId: 'long-term', name: 'Bróker de ejemplo' },
	{ id: 'crypto', portfolioId: 'long-term', name: 'Cripto de ejemplo' },
];
export function initialValuations(): Valuation[] {
	// Synthetic balances, not market quotes. Each closing balance includes that month's seeded contributions.
	const amounts: Record<string, number[]> = {
		funds: [800000, 829500, 844000, 879000, 892500, 924000, 960000],
		broker: [220000, 232000, 237000, 253000, 246000, 265000, 267000],
		crypto: [90000, 85000, 98000, 87000, 105000, 102000, 96000],
	};
	return Object.entries(amounts).flatMap(([platformId, values]) => values.map((amount, i) => {
		const month = `2026-${String(i + 4).padStart(2, '0')}`;
		const date = i === 6 ? '2026-10-12' : new Date(Date.UTC(2026, i + 4, 0)).toISOString().slice(0, 10);
		return { platformId, month, date, amount };
	}));
}
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
function validate(platforms: Platform[], id: string, date: string, amount: number, role: string) {
	if (role !== 'admin' || !platforms.some((p) => p.id === id) || !validDate(date) ||
		!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000)
		throw new Error('Revisa la plataforma, la fecha y el importe.');
}
export function createPortfolio(data: Portfolio[], value: Portfolio, role: string): Portfolio[] {
	const name = value.name.trim();
	if (role !== 'admin' || !value.id || !name || name.length > 60 ||
		data.some((p) => p.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && p.id !== value.id))
		throw new Error('Escribe un nombre distinto de entre 1 y 60 caracteres.');
	return data.some((p) => p.id === value.id) ? data.map((p) => p.id === value.id ? { ...value, name } : p) : [...data, { ...value, name }];
}
export function savePlatform(data: Platform[], portfolios: Portfolio[], value: Platform, role: string): Platform[] {
	const name = value.name.trim(); const existing = data.find((p) => p.id === value.id);
	if (role !== 'admin' || !value.id || !name || name.length > 60 || !portfolios.some((p) => p.id === value.portfolioId) ||
		(existing && existing.portfolioId !== value.portfolioId) ||
		data.some((p) => p.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && p.portfolioId === value.portfolioId && p.id !== value.id))
		throw new Error('Revisa el nombre y la cartera. No se cambia la cartera de una plataforma con historial.');
	return existing ? data.map((p) => p.id === value.id ? { ...value, name } : p) : [...data, { ...value, name }];
}
export function addContribution(movements: Movement[], platforms: Platform[], input: {
	id: string; platformId: string; date: string; amount: number; account: string;
}, role: string): Movement[] {
	validate(platforms, input.platformId, input.date, input.amount, role);
	if (movements.length >= 1000 || input.amount === 0 || !input.id || movements.some((m) => m.id === input.id) ||
		!['Cuenta principal', 'Fondo de emergencia'].includes(input.account)) throw new Error('Revisa el importe y la cuenta de origen.');
	const platform = platforms.find((p) => p.id === input.platformId)!;
	return [{ id: input.id, platformId: platform.id, portfolioId: platform.portfolioId, context: 'own', date: input.date,
		concept: `Aportación · ${platform.name}`, amount: input.amount, kind: 'investment',
		category: 'Inversión', account: input.account, fixed: false }, ...movements];
}
export function saveValuation(data: Valuation[], platforms: Platform[], value: Valuation, role: string): Valuation[] {
	validate(platforms, value.platformId, value.date, value.amount, role);
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month)) throw new Error('Elige un mes de referencia válido.');
	return [...data.filter((v) => !(v.platformId === value.platformId && v.date === value.date)), { ...value }];
}
export function monthlyValuation(data: Valuation[], platformId: string, month: string): Valuation | null {
	return data.filter((v) => v.platformId === platformId && v.month === month).toSorted((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}
export const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
export function modifiedDietz(start: { date: string; amount: number }, end: { date: string; amount: number }, flows: { date: string; amount: number }[]) {
	const duration = day(end.date) - day(start.date);
	if (duration <= 0) return null;
	// Closing valuations include flows on their date; opening-date flows are already in the opening valuation.
	const scoped = flows.filter((f) => f.date > start.date && f.date <= end.date);
	const net = scoped.reduce((sum, f) => sum + f.amount, 0);
	const gain = end.amount - start.amount - net;
	const denominator = start.amount + scoped.reduce((sum, f) => sum + ((day(end.date) - day(f.date)) / duration) * f.amount, 0);
	return { gain, net, rate: denominator > 0 ? gain / denominator : null, start: start.date, end: end.date };
}
export function periodPerformance(ids: string[], values: Valuation[], movements: Movement[], month: string) {
	const ends = ids.map((id) => monthlyValuation(values, id, month));
	const complete = ids.length > 0 && ends.every((v) => v !== null);
	const total = ends.reduce((sum, v) => sum + (v?.amount ?? 0), 0);
	if (!complete) return { total, complete, result: null, reason: 'Faltan valoraciones mensuales de plataformas.' };
	const closing = ends as Valuation[];
	if (new Set(closing.map((v) => v.date)).size !== 1) return { total, complete, result: null, reason: 'Fechas de cierre distintas entre plataformas.' };
	const startDates = values.filter((v) => v.date < closing[0].date && ids.includes(v.platformId)).map((v) => v.date).toSorted().toReversed();
	const startDate = startDates.find((date) => ids.every((id) => values.some((v) => v.platformId === id && v.date === date)));
	if (!startDate) return { total, complete, result: null, reason: 'Falta una valoración inicial común.' };
	const initial = ids.reduce((sum, id) => sum + values.find((v) => v.platformId === id && v.date === startDate)!.amount, 0);
	const flows = movements.filter((m) => m.context === 'own' && m.kind === 'investment' && ids.includes(m.platformId ?? '')).map((m) => ({ date: m.date, amount: m.amount }));
	return { total, complete, result: modifiedDietz({ date: startDate, amount: initial }, { date: closing[0].date, amount: total }, flows), reason: '' };
}
export function investmentSeries(ids: string[], values: Valuation[], movements: Movement[], year: number) {
	let base: { date: string; amount: number } | null = null;
	const flows = movements.filter((m) => m.context === 'own' && m.kind === 'investment' && ids.includes(m.platformId ?? '')).map((m) => ({ date: m.date, amount: m.amount }));
	// Compute each interval once, chaining geometrically. A missing month is not invented as zero.
	let previous: { date: string; amount: number } | null = null; let index: number | null = 100;
	return Array.from({ length: 12 }, (_, i) => {
		const month = `${year}-${String(i + 1).padStart(2, '0')}`;
		const snapshots = ids.map((id) => monthlyValuation(values, id, month));
		const complete = ids.length > 0 && snapshots.every((v) => v !== null);
		const date = complete ? snapshots[0]!.date : null;
		const aligned = complete && snapshots.every((v) => v!.date === date);
		const total = complete ? snapshots.reduce((sum, v) => sum + v!.amount, 0) : null;
		if (aligned && date && total !== null) {
			const end = { date, amount: total };
			if (!base && total > 0) base = end;
			if (base && previous) {
				const rate = modifiedDietz(previous, end, flows)?.rate;
				index = index !== null && rate !== null && rate !== undefined ? index * (1 + rate) : null;
			}
			if (base) previous = end;
		}
		const years = base && date ? (day(date) - day(base.date)) / 365 : 0;
		return { month, date, total, index: aligned && base ? index : null,
			five: aligned && base ? 100 * 1.05 ** years : null,
			nine: aligned && base ? 100 * 1.09 ** years : null };
	});
}

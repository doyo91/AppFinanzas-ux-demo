import type { Movement } from './model.ts';

export type Portfolio = { id: string; name: string };
export type Valuation = { portfolioId: string; date: string; amount: number };
export const initialPortfolios = (): Portfolio[] => [
	{ id: 'long-term', name: 'Cartera a largo plazo' },
	{ id: 'complement', name: 'Cartera complementaria' },
];
export const initialValuations = (): Valuation[] => [
	{ portfolioId: 'long-term', date: '2026-09-30', amount: 947000 },
	{ portfolioId: 'long-term', date: '2026-10-12', amount: 985000 },
	{ portfolioId: 'complement', date: '2026-09-30', amount: 253000 },
	{ portfolioId: 'complement', date: '2026-10-12', amount: 260000 },
];
function validDate(date: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
		new Date(date).toISOString().slice(0, 10) === date;
}
function validate(portfolios: Portfolio[], portfolioId: string, date: string, amount: number, role: string) {
	if (role !== 'admin' || !portfolios.some((p) => p.id === portfolioId) ||
		!validDate(date) || !Number.isSafeInteger(amount) || amount < 0 || amount > 100000000)
		throw new Error('Revisa la cartera, la fecha y el importe.');
}
export function createPortfolio(portfolios: Portfolio[], portfolio: Portfolio, role: string): Portfolio[] {
	const name = portfolio.name.trim();
	if (role !== 'admin' || !portfolio.id || !name || name.length > 60 ||
		portfolios.some((p) => p.id === portfolio.id || p.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es')))
		throw new Error('Escribe un nombre distinto de entre 1 y 60 caracteres.');
	return [...portfolios, { ...portfolio, name }];
}
export function addContribution(movements: Movement[], portfolios: Portfolio[], input: {
	id: string; portfolioId: string; date: string; amount: number; account: string;
}, role: string): Movement[] {
	validate(portfolios, input.portfolioId, input.date, input.amount, role);
	if (movements.length >= 1000 || input.amount === 0 || !input.id || movements.some((m) => m.id === input.id) ||
		!['Cuenta principal', 'Fondo de emergencia'].includes(input.account))
		throw new Error('Revisa el importe y la cuenta de origen.');
	const portfolio = portfolios.find((p) => p.id === input.portfolioId)!;
	return [{ id: input.id, portfolioId: input.portfolioId, context: 'own', date: input.date,
		concept: `Aportación · ${portfolio.name}`, amount: input.amount, kind: 'investment',
		category: 'Inversión', account: input.account, fixed: false }, ...movements];
}
export function saveValuation(data: Valuation[], portfolios: Portfolio[], value: Valuation, role: string): Valuation[] {
	validate(portfolios, value.portfolioId, value.date, value.amount, role);
	return [...data.filter((v) => !(v.portfolioId === value.portfolioId && v.date === value.date)), { ...value }];
}
export function latestValuation(data: Valuation[], portfolioId: string): Valuation | null {
	return data.filter((v) => v.portfolioId === portfolioId).toSorted((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

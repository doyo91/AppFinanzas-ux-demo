// Local-only fixtures. No real data, network calls or persistence.
export type Context = 'own' | 'father';
export type Kind = 'expense' | 'income' | 'transfer' | 'investment';
export type Movement = {
	id: string;
	context: Context;
	date: string;
	concept: string;
	amount: number; // Integer euro cents, always positive.
	kind: Kind;
	category: string;
	account: string;
	destination?: string;
	fixed: boolean;
};

export const DEMO_MONTH = '2026-10';
export type Budget = {
	context: Context;
	month: string;
	category: string;
	amount: number;
	color?: string;
};
export function initialBudgets(): Budget[] {
	return [
		...['2026-09', '2026-10'].flatMap((month) =>
			budgets.map((b) => ({ ...b, context: 'own' as const, month })),
		),
		...fatherBudgets.map((b) => ({
			...b,
			context: 'father' as const,
			month: DEMO_MONTH,
		})),
	];
}

// Demo guards, not a replacement for server authorization or RLS.
export function saveFatherExpense(
	data: Movement[],
	movement: Movement,
	role: 'admin' | 'father',
): Movement[] {
	if (
		role !== 'admin' ||
		movement.context !== 'father' ||
		movement.kind !== 'expense' ||
		!Number.isSafeInteger(movement.amount) ||
		movement.amount <= 0 ||
		movement.amount > 100000000 ||
		!categories.includes(movement.category) ||
		movement.account !== 'Cuenta principal'
	)
		throw new Error('Invalid father expense');
	const existing = data.find((m) => m.id === movement.id);
	if (
		existing &&
		(existing.context !== 'father' || existing.kind !== 'expense')
	)
		throw new Error('Context cannot change');
	return existing
		? data.map((m) => (m.id === movement.id ? { ...movement } : m))
		: [{ ...movement }, ...data];
}

export function setBudget(
	data: Budget[],
	context: Context,
	month: string,
	category: string,
	amount: number | null,
	role: 'admin' | 'father',
): Budget[] {
	if (
		role !== 'admin' ||
		!categories.includes(category) ||
		!/^2026-(08|09|10)$/.test(month) ||
		(amount !== null &&
			(!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000))
	)
		throw new Error('Invalid budget');
	const remaining = data.filter(
		(b) =>
			!(b.context === context && b.month === month && b.category === category),
	);
	return amount === null
		? remaining
		: [...remaining, { context, month, category, amount }];
}
export const categories = [
	'Alimentación',
	'Vivienda',
	'Transporte',
	'Ocio',
	'Salud',
	'Servicios',
	'Otros',
];
export const accounts = ['Cuenta principal', 'Fondo de emergencia', 'Tarjeta'];
export const budgets = [
	{ category: 'Alimentación', amount: 35000, color: '#497b67' },
	{ category: 'Ocio', amount: 18000, color: '#b78955' },
	{ category: 'Transporte', amount: 12000, color: '#6a86a3' },
];

const seeds: Movement[] = [
	{
		id: 'o1',
		context: 'own',
		date: '2026-10-01',
		concept: 'Nómina',
		amount: 245000,
		kind: 'income',
		category: 'Trabajo',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'o2',
		context: 'own',
		date: '2026-10-02',
		concept: 'Alquiler',
		amount: 72000,
		kind: 'expense',
		category: 'Vivienda',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'o3',
		context: 'own',
		date: '2026-10-03',
		concept: 'Compra semanal',
		amount: 6845,
		kind: 'expense',
		category: 'Alimentación',
		account: 'Tarjeta',
		fixed: false,
	},
	{
		id: 'o4',
		context: 'own',
		date: '2026-10-04',
		concept: 'Aportación mensual',
		amount: 30000,
		kind: 'investment',
		category: 'Inversión',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'o5',
		context: 'own',
		date: '2026-10-05',
		concept: 'Colchón para imprevistos',
		amount: 15000,
		kind: 'transfer',
		category: 'Transferencia',
		account: 'Cuenta principal',
		destination: 'Fondo de emergencia',
		fixed: false,
	},
	{
		id: 'o6',
		context: 'own',
		date: '2026-10-06',
		concept: 'Abono de transporte',
		amount: 4200,
		kind: 'expense',
		category: 'Transporte',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'o7',
		context: 'own',
		date: '2026-10-08',
		concept: 'Cena con amigos',
		amount: 3850,
		kind: 'expense',
		category: 'Ocio',
		account: 'Tarjeta',
		fixed: false,
	},
	{
		id: 'o8',
		context: 'own',
		date: '2026-10-09',
		concept: 'Internet y móvil',
		amount: 4990,
		kind: 'expense',
		category: 'Servicios',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'o9',
		context: 'own',
		date: '2026-10-11',
		concept: 'Compra semanal',
		amount: 7240,
		kind: 'expense',
		category: 'Alimentación',
		account: 'Tarjeta',
		fixed: false,
	},
	{
		id: 'o10',
		context: 'own',
		date: '2026-10-12',
		concept: 'Farmacia',
		amount: 1875,
		kind: 'expense',
		category: 'Salud',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'o11',
		context: 'own',
		date: '2026-09-01',
		concept: 'Nómina',
		amount: 245000,
		kind: 'income',
		category: 'Trabajo',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'o12',
		context: 'own',
		date: '2026-09-02',
		concept: 'Alquiler',
		amount: 72000,
		kind: 'expense',
		category: 'Vivienda',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'o13',
		context: 'own',
		date: '2026-09-20',
		concept: 'Otros gastos del mes · ejemplo',
		amount: 82300,
		kind: 'expense',
		category: 'Otros',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f1',
		context: 'father',
		date: '2026-10-01',
		concept: 'Pensión',
		amount: 125000,
		kind: 'income',
		category: 'Pensión',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f2',
		context: 'father',
		date: '2026-10-02',
		concept: 'Vivienda',
		amount: 48000,
		kind: 'expense',
		category: 'Vivienda',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'f3',
		context: 'father',
		date: '2026-10-06',
		concept: 'Supermercado',
		amount: 11200,
		kind: 'expense',
		category: 'Alimentación',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f4',
		context: 'father',
		date: '2026-10-08',
		concept: 'Luz',
		amount: 6350,
		kind: 'expense',
		category: 'Servicios',
		account: 'Cuenta principal',
		fixed: true,
	},
	{
		id: 'f5',
		context: 'father',
		date: '2026-10-10',
		concept: 'Supermercado',
		amount: 9700,
		kind: 'expense',
		category: 'Alimentación',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f6',
		context: 'father',
		date: '2026-10-12',
		concept: 'Farmacia',
		amount: 3200,
		kind: 'expense',
		category: 'Salud',
		account: 'Cuenta principal',
		fixed: false,
	},
];

export function initialMovements(): Movement[] {
	return [...seeds, ...fatherHistorySeeds].map((movement) => ({ ...movement }));
}

export const fatherBudgets = [
	{ category: 'Alimentación', amount: 25000 },
	{ category: 'Ocio', amount: 8000 },
	{ category: 'Transporte', amount: 3000 },
	{ category: 'Salud', amount: 6000 },
	{ category: 'Servicios', amount: 10000 },
];

const fatherHistorySeeds: Movement[] = [
	{
		id: 'f7',
		context: 'father',
		date: '2026-10-11',
		concept: 'Salidas y cafés · ejemplo',
		amount: 8500,
		kind: 'expense',
		category: 'Ocio',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f8',
		context: 'father',
		date: '2026-10-09',
		concept: 'Transporte · ejemplo',
		amount: 1800,
		kind: 'expense',
		category: 'Transporte',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f9',
		context: 'father',
		date: '2026-09-01',
		concept: 'Pensión',
		amount: 125000,
		kind: 'income',
		category: 'Pensión',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f10',
		context: 'father',
		date: '2026-09-30',
		concept: 'Gastos del mes resumidos · ejemplo',
		amount: 94500,
		kind: 'expense',
		category: 'Otros',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f11',
		context: 'father',
		date: '2026-08-01',
		concept: 'Pensión',
		amount: 125000,
		kind: 'income',
		category: 'Pensión',
		account: 'Cuenta principal',
		fixed: false,
	},
	{
		id: 'f12',
		context: 'father',
		date: '2026-08-31',
		concept: 'Gastos del mes resumidos · ejemplo',
		amount: 98000,
		kind: 'expense',
		category: 'Otros',
		account: 'Cuenta principal',
		fixed: false,
	},
];

export function parseAmount(input: string): number | null {
	const normalized = input.trim().replace(',', '.');
	if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;
	const [whole, fraction = ''] = normalized.split('.');
	const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
	return cents > 0 && cents <= 100000000 ? cents : null;
}

export function money(cents: number): string {
	if (!Number.isSafeInteger(cents))
		throw new Error('Money must be integer cents');
	const absolute = Math.abs(cents);
	return `${cents < 0 ? '−' : ''}${Math.trunc(absolute / 100).toLocaleString('es-ES')},${String(absolute % 100).padStart(2, '0')} €`;
}

export function summarize(
	movements: Movement[],
	context: Context,
	month: string,
) {
	const scoped = movements.filter(
		(m) => m.context === context && m.date.startsWith(month),
	);
	const sum = (kind: Kind) =>
		scoped
			.filter((m) => m.kind === kind)
			.reduce((total, m) => total + m.amount, 0);
	const income = sum('income');
	const expenses = sum('expense');
	const fixed = scoped
		.filter((m) => m.kind === 'expense' && m.fixed)
		.reduce((total, m) => total + m.amount, 0);
	return {
		income,
		expenses,
		savings: income - expenses,
		fixed,
		variable: expenses - fixed,
		investment: sum('investment'),
		rate:
			income === 0 ? null : Math.round(((income - expenses) * 100) / income),
	};
}

export function categorySpend(
	movements: Movement[],
	context: Context,
	month: string,
	category: string,
) {
	return movements
		.filter(
			(m) =>
				m.context === context &&
				m.date.startsWith(month) &&
				m.kind === 'expense' &&
				m.category === category,
		)
		.reduce((total, m) => total + m.amount, 0);
}

export function budgetStatus(
	spent: number,
	budget: number | null,
): 'normal' | 'warning' | 'exceeded' | 'unconfigured' {
	if (budget === null || budget <= 0) return 'unconfigured';
	if (spent >= budget) return 'exceeded';
	return spent * 100 >= budget * 80 ? 'warning' : 'normal';
}

export function emergencyBalance(movements: Movement[]): number {
	// Fictional opening balance at 01/10/2026. Only October own movements apply.
	return movements
		.filter((m) => m.context === 'own' && m.date.startsWith(DEMO_MONTH))
		.reduce((balance, m) => {
			if (m.kind === 'transfer') {
				if (m.destination === 'Fondo de emergencia') balance += m.amount;
				if (m.account === 'Fondo de emergencia') balance -= m.amount;
			} else if (m.account === 'Fondo de emergencia') {
				if (m.kind === 'income') balance += m.amount;
				if (m.kind === 'expense' || m.kind === 'investment')
					balance -= m.amount;
			}
			return balance;
		}, 420000);
}

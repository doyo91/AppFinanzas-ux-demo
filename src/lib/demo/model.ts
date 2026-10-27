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
	portfolioId?: string;
	platformId?: string;
	fixed: boolean;
};

export const DEMO_MONTH = '2026-10';
export const DEMO_PERIODS = [
	{ month: '2026-05', label: 'Mayo' },
	{ month: '2026-06', label: 'Junio' },
	{ month: '2026-07', label: 'Julio' },
	{ month: '2026-08', label: 'Agosto' },
	{ month: '2026-09', label: 'Septiembre' },
	{ month: DEMO_MONTH, label: 'Octubre' },
];
export type Budget = {
	context: Context;
	month: string;
	category: string;
	amount: number;
	color?: string;
};
export function initialBudgets(): Budget[] {
	return [
		...DEMO_PERIODS.flatMap(({ month }) =>
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

export function saveOwnIncome(data: Movement[], movement: Movement, role: 'admin' | 'father'): Movement[] {
	if (role !== 'admin' || movement.context !== 'own' || movement.kind !== 'income' ||
		!Number.isSafeInteger(movement.amount) || movement.amount <= 0 || movement.amount > 100000000 ||
		!['Trabajo', 'Otros ingresos'].includes(movement.category) ||
		!['Cuenta principal', 'Fondo de emergencia'].includes(movement.account))
		throw new Error('No se puede guardar este ingreso.');
	const previous = data.find(m => m.id === movement.id);
	if (previous && (previous.context !== 'own' || previous.kind !== 'income'))
		throw new Error('No se puede cambiar el tipo o contexto del movimiento.');
	return previous ? data.map(m => m.id === movement.id ? { ...movement } : m) : [{ ...movement }, ...data];
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
		!DEMO_PERIODS.some((period) => period.month === month) ||
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
		portfolioId: 'long-term',
		platformId: 'funds',
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
	return [
		...seeds.filter((movement) => movement.date.startsWith(DEMO_MONTH)),
		...fatherHistorySeeds.filter((movement) => movement.date.startsWith(DEMO_MONTH)),
		...historicalMovements(),
	].map((movement) => ({ ...movement }));
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

];

// Reproducible synthetic months: recurring bills, everyday purchases and occasional expenses.
function historicalMovements(): Movement[] {
	return DEMO_PERIODS.filter((period) => period.month !== DEMO_MONTH).flatMap(
		({ month }, monthIndex) => (['own', 'father'] as const).flatMap((context) => {
			const father = context === 'father';
			const items: Movement[] = [];
			function add(day: number, concept: string, category: string, amount: number,
				fixed = false, kind: Kind = 'expense') {
				items.push({
					id: `demo-${context}-${month}-${items.length}`,
					context, date: `${month}-${String(day).padStart(2, '0')}`,
					concept, category, amount, fixed, kind,
					account: father || fixed || kind !== 'expense' ? 'Cuenta principal' : 'Tarjeta',
				});
			}
			add(1, father ? 'Pensión' : 'Nómina', father ? 'Pensión' : 'Trabajo', father ? 125000 : 245000, false, 'income');
			add(2, father ? 'Vivienda' : 'Alquiler', 'Vivienda', father ? 48000 : 72000, true);
			add(5, 'Internet y móvil', 'Servicios', father ? 2990 : 4990, true);
			add(8, 'Luz', 'Servicios', 4800 + monthIndex * 430, true);
			add(6, 'Abono de transporte', 'Transporte', father ? 1500 : 4200, true);
			for (let week = 0; week < 4; week++) {
				const day = 3 + week * 7;
				add(day, 'Supermercado', 'Alimentación', (father ? 4200 : 5700) + ((monthIndex * 631 + week * 457) % 2500));
				add(day + 1, 'Panadería y frutería', 'Alimentación', 850 + ((monthIndex * 97 + week * 163) % 1100));
				add(day + 2, week % 2 === 0 ? 'Café y merienda' : 'Comida fuera', 'Ocio', (father ? 1100 : 2100) + ((monthIndex * 311 + week * 571) % 2200));
			}
			add(12, 'Farmacia', 'Salud', 1875 + monthIndex * 390);
			add(17, 'Gasolina o desplazamientos', 'Transporte', 2400 + monthIndex * 320);
			add(21, 'Productos para casa', 'Otros', 2150 + monthIndex * 275);
			add(26, 'Cine y ocio', 'Ocio', 1900 + monthIndex * 410);
			if (!father) {
				for (const [platformId, day, amount] of [['funds', 5, 20000], ['broker', 15, 10000], ['crypto', 20, 5000]] as const) {
					add(day, 'Aportación de ejemplo', 'Inversión', amount, false, 'investment');
					items.at(-1)!.platformId = platformId;
					items.at(-1)!.portfolioId = 'long-term';
				}
			}
			if (month === '2026-07') add(19, 'Reparación del coche', 'Transporte', father ? 68000 : 92000);
			if (month === '2026-08') add(23, 'Escapada de verano', 'Ocio', father ? 12500 : 48000);
			if (month === '2026-09') add(18, 'Revisión dental', 'Salud', father ? 14500 : 9500);
			return items;
		}),
	);
}

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


export function currentHistoryPeriod(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit',
	}).formatToParts(now);
	return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

export function historyPeriods(year: number) {
	return Array.from({ length: 12 }, (_, index) => ({
		month: `${year}-${String(index + 1).padStart(2, '0')}`,
		label: new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' })
			.format(new Date(Date.UTC(year, index, 1)))
			.replace(/^./, (letter) => letter.toUpperCase()),
	}));
}

export function historyYears(movements: Movement[], context: Context, currentYear: number) {
	return [...new Set([
		currentYear - 1, currentYear, currentYear + 1,
		...movements.filter((m) => m.context === context).map((m) => Number(m.date.slice(0, 4))),
	])].toSorted((a, b) => b - a);
}

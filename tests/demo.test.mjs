import assert from 'node:assert/strict';
import test from 'node:test';
import {
	fatherBudgets,
	DEMO_PERIODS,
	currentHistoryPeriod,
	historyPeriods,
	historyYears,
	categorySpend,
	initialMovements,
	parseAmount,
	money,
	summarize,
	budgetStatus,
	emergencyBalance,
	initialBudgets,
	setBudget,
	saveFatherExpense,
} from '../src/lib/demo/model.ts';

test('father expense creation and replacement never affect own finances or duplicate expense', () => {
	const data = initialMovements();
	const original = summarize(data, 'own', '2026-10');
	const expense = {
		...data.find((m) => m.id === 'f7'),
		id: 'new-father',
		amount: 1234,
	};
	const added = saveFatherExpense(data, expense, 'admin');
	assert.equal(summarize(added, 'father', '2026-10').expenses, 88750 + 1234);
	const edited = saveFatherExpense(
		added,
		{ ...expense, amount: 5678, category: 'Salud' },
		'admin',
	);
	assert.equal(edited.length, added.length);
	assert.equal(summarize(edited, 'father', '2026-10').expenses, 88750 + 5678);
	assert.deepEqual(summarize(edited, 'own', '2026-10'), original);
	assert.equal(
		categorySpend(edited, 'father', '2026-10', 'Salud'),
		3200 + 5678,
	);
	assert.throws(() => saveFatherExpense(data, expense, 'father'));
	assert.throws(() =>
		saveFatherExpense(data, { ...expense, id: 'o2' }, 'admin'),
	);
	assert.throws(() =>
		saveFatherExpense(data, { ...expense, kind: 'income' }, 'admin'),
	);
	assert.throws(() =>
		saveFatherExpense(data, { ...expense, amount: 1.23 }, 'admin'),
	);
});

test('budgets are isolated by month and context; unset is not zero; father cannot edit', () => {
	const data = initialBudgets();
	const updated = setBudget(data, 'father', '2026-10', 'Ocio', 12000, 'admin');
	assert.equal(
		updated.find((b) => b.context === 'father' && b.category === 'Ocio').amount,
		12000,
	);
	assert.equal(
		updated.find(
			(b) =>
				b.context === 'own' && b.category === 'Ocio' && b.month === '2026-10',
		).amount,
		18000,
	);
	const own = setBudget(updated, 'own', '2026-10', 'Ocio', 22000, 'admin');
	assert.equal(
		own.find(
			(b) =>
				b.context === 'own' && b.category === 'Ocio' && b.month === '2026-09',
		).amount,
		18000,
	);
	const removed = setBudget(own, 'father', '2026-10', 'Ocio', null, 'admin');
	assert.equal(
		removed.some((b) => b.context === 'father' && b.category === 'Ocio'),
		false,
	);
	assert.throws(() =>
		setBudget(data, 'father', '2026-10', 'Ocio', 12000, 'father'),
	);
	assert.throws(() => setBudget(data, 'own', '2026-10', 'Ocio', 0, 'admin'));
	assert.equal(
		initialBudgets().find(
			(b) => b.context === 'father' && b.category === 'Ocio',
		).amount,
		8000,
	);
});

test('monthly category chart reconciles to expense total for each context', () => {
	const data = initialMovements();
	for (const context of ['own', 'father'])
		for (const { month } of DEMO_PERIODS) {
			const names = new Set(
				data
					.filter((m) => m.context === context && m.kind === 'expense')
					.map((m) => m.category),
			);
			assert.equal(
				[...names].reduce(
					(sum, name) => sum + categorySpend(data, context, month, name),
					0,
				),
				summarize(data, context, month).expenses,
			);
		}
});

test('amounts use exact minor units and reject invalid or excessive precision', () => {
	assert.equal(parseAmount('0,10'), 10);
	assert.equal(parseAmount('12.34'), 1234);
	assert.equal(money(parseAmount('0.10') + parseAmount('0.20')), '0,30 €');
	for (const value of ['0', '-12', '1.234', '1e3', 'NaN', '', '1000000.01'])
		assert.equal(parseAmount(value), null);
});

test('ordinary savings exclude internal transfers and investment contributions', () => {
	const data = initialMovements();
	const result = summarize(data, 'own', '2026-10');
	assert.equal(result.income, 245000);
	assert.equal(result.expenses, 101000);
	assert.equal(result.savings, 144000);
	assert.equal(result.investment, 30000);
	assert.equal(result.fixed + result.variable, result.expenses);
});

test('context and month selection never aggregate unrelated movements', () => {
	const data = initialMovements();
	assert.equal(summarize(data, 'father', '2026-10').income, 125000);
	assert.equal(summarize(data, 'own', '2026-09').expenses, 155085);
	assert.equal(summarize(data, 'own', '2026-04').rate, null);
});

test('budget notices use approved boundaries and distinguish missing budgets', () => {
	assert.equal(budgetStatus(7999, 10000), 'normal');
	assert.equal(budgetStatus(8000, 10000), 'warning');
	assert.equal(budgetStatus(10000, 10000), 'exceeded');
	assert.equal(budgetStatus(0, null), 'unconfigured');
});

test('father budget screen distinguishes exceeded leisure and preventive groceries', () => {
	const movements = initialMovements();
	const leisure = fatherBudgets.find((budget) => budget.category === 'Ocio');
	const food = fatherBudgets.find(
		(budget) => budget.category === 'Alimentación',
	);
	assert.equal(categorySpend(movements, 'father', '2026-10', 'Ocio'), 8500);
	assert.equal(budgetStatus(8500, leisure.amount), 'exceeded');
	assert.equal(
		budgetStatus(
			categorySpend(movements, 'father', '2026-10', 'Alimentación'),
			food.amount,
		),
		'warning',
	);
});

test('father monthly chart derives independent months, not cumulative or admin totals', () => {
	const movements = initialMovements();
	assert.equal(summarize(movements, 'father', '2026-08').expenses, 120604);
	assert.equal(summarize(movements, 'father', '2026-09').savings, 3615);
	assert.equal(summarize(movements, 'father', '2026-10').expenses, 88750);
	assert.equal(summarize(movements, 'own', '2026-10').expenses, 101000);
});

test('reset returns independent data and emergency transfers are neutral for savings', () => {
	const data = initialMovements();
	assert.equal(emergencyBalance(data), 435000);
	data[0].amount = 1;
	assert.equal(initialMovements()[0].amount, 245000);
	const reset = initialMovements();
	const before = summarize(reset, 'own', '2026-10');
	reset.push({
		id: 'test',
		context: 'own',
		date: '2026-10-13',
		concept: 'Test transfer',
		amount: 10000,
		kind: 'transfer',
		account: 'Fondo de emergencia',
		destination: 'Cuenta principal',
		category: 'Transferencia',
		fixed: false,
	});
	assert.equal(emergencyBalance(reset), 425000);
	assert.deepEqual(summarize(reset, 'own', '2026-10'), before);
});


test('six synthetic months are reproducible, detailed and have unique valid movements', () => {
	const data = initialMovements();
	assert.deepEqual(data, initialMovements());
	assert.equal(new Set(data.map((m) => m.id)).size, data.length);
	for (const movement of data) {
		assert.ok(Number.isSafeInteger(movement.amount) && movement.amount > 0);
		assert.equal(new Date(movement.date).toISOString().slice(0, 10), movement.date);
	}
	for (const context of ['own', 'father']) {
		for (const { month } of DEMO_PERIODS.slice(0, -1)) {
			const entries = data.filter((m) => m.context === context && m.date.startsWith(month));
			assert.ok(entries.length >= 20);
			assert.ok(new Set(entries.filter((m) => m.kind === 'expense').map((m) => m.category)).size >= 6);
		}
	}
	assert.ok(summarize(data, 'father', '2026-07').savings < 0);
});


test('history defaults follow the Madrid year boundary and months do not leak between years', () => {
	assert.equal(currentHistoryPeriod(new Date('2026-12-31T22:59:59Z')), '2026-12');
	assert.equal(currentHistoryPeriod(new Date('2026-12-31T23:00:00Z')), '2027-01');
	const periods = historyPeriods(2027);
	assert.equal(periods.length, 12);
	assert.deepEqual(periods[0], { month: '2027-01', label: 'Enero' });
	assert.equal(periods[11].month, '2027-12');
	const data = initialMovements();
	assert.deepEqual(summarize(data, 'father', '2027-07'), {
		income: 0, expenses: 0, savings: 0, fixed: 0, variable: 0, investment: 0, rate: null,
	});
	const scoped = [...data, { ...data[0], id: 'old-own', context: 'own', date: '2020-01-01' }];
	assert.ok(historyYears(scoped, 'own', 2027).includes(2020));
	assert.ok(!historyYears(scoped, 'father', 2027).includes(2020));
	assert.ok(historyYears(scoped, 'father', 2027).includes(2027));
});

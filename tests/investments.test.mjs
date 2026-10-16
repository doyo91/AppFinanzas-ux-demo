import assert from 'node:assert/strict';
import test from 'node:test';
import { initialMovements, summarize, emergencyBalance } from '../src/lib/demo/model.ts';
import { initialPortfolios, initialValuations, addContribution, saveValuation, createPortfolio, latestValuation } from '../src/lib/demo/investments.ts';

test('contributions have one source and do not change expenses, income or ordinary savings', () => {
	const original = initialMovements(); const portfolios = initialPortfolios();
	const input = { id: 'new-investment', portfolioId: portfolios[1].id, date: '2026-10-13', amount: 12345, account: 'Cuenta principal' };
	const before = summarize(original, 'own', '2026-10');
	const added = addContribution(original, portfolios, input, 'admin');
	const after = summarize(added, 'own', '2026-10');
	assert.equal(after.investment, before.investment + 12345);
	assert.equal(after.savings, before.savings); assert.equal(after.expenses, before.expenses); assert.equal(after.income, before.income);
	assert.equal(added[0].portfolioId, portfolios[1].id);
	assert.deepEqual(summarize(added, 'father', '2026-10'), summarize(original, 'father', '2026-10'));
	assert.throws(() => addContribution(added, portfolios, input, 'admin'));
	assert.throws(() => addContribution(original, portfolios, input, 'father'));
	for (const invalid of [{ amount: 0 }, { amount: 1.234 }, { date: '2026-02-30' }, { portfolioId: 'missing' }, { account: 'Tarjeta' }])
		assert.throws(() => addContribution(original, portfolios, { ...input, ...invalid }, 'admin'));
	const fromFund = addContribution(original, portfolios, { ...input, account: 'Fondo de emergencia' }, 'admin');
	assert.equal(emergencyBalance(fromFund), emergencyBalance(original) - 12345);
});

test('a valuation replaces the same portfolio and date, zero differs from no valuation', () => {
	const portfolios = initialPortfolios(); const original = initialValuations();
	const value = { portfolioId: portfolios[0].id, date: '2026-10-12', amount: 0 };
	const changed = saveValuation(original, portfolios, value, 'admin');
	assert.equal(changed.length, original.length);
	assert.equal(latestValuation(changed, portfolios[0].id).amount, 0);
	assert.equal(latestValuation(changed, 'missing'), null);
	assert.equal(latestValuation(changed, portfolios[1].id).amount, 260000);
	assert.equal(latestValuation(original, portfolios[0].id).amount, 985000);
	const older = saveValuation(changed, portfolios, { ...value, date: '2026-01-01', amount: 10000 }, 'admin');
	assert.equal(latestValuation(older, portfolios[0].id).date, '2026-10-12');
	assert.throws(() => saveValuation(original, portfolios, value, 'father'));
	assert.throws(() => saveValuation(original, portfolios, { ...value, amount: -1 }, 'admin'));
});

test('portfolios are configurable and reject duplicate names and unauthorized creation', () => {
	const original = initialPortfolios();
	const created = createPortfolio(original, { id: 'new', name: ' Nueva plataforma ' }, 'admin');
	assert.equal(created.at(-1).name, 'Nueva plataforma'); assert.equal(original.length, 2);
	assert.throws(() => createPortfolio(created, { id: 'other', name: 'nueva plataforma' }, 'admin'));
	assert.throws(() => createPortfolio(original, { id: 'new', name: 'Otra' }, 'father'));
});

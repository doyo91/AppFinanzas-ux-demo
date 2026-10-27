import assert from 'node:assert/strict';
import test from 'node:test';
import { initialMovements, summarize, emergencyBalance } from '../src/lib/demo/model.ts';
import { initialPortfolios, initialPlatforms, initialValuations, addContribution, editContribution, saveValuation, createPortfolio, savePlatform, monthlyValuation, modifiedDietz, periodPerformance, investmentSeries } from '../src/lib/demo/investments.ts';

test('platform contributions have one source without changing ordinary income, expenses or savings', () => {
	const original = initialMovements(); const platforms = initialPlatforms();
	const input = { id: 'new-investment', platformId: 'broker', date: '2026-10-13', amount: 12345, account: 'Cuenta principal' };
	const before = summarize(original, 'own', '2026-10');
	const added = addContribution(original, platforms, input, 'admin'); const after = summarize(added, 'own', '2026-10');
	assert.equal(after.investment, before.investment + 12345);
	assert.equal(after.savings, before.savings); assert.equal(after.expenses, before.expenses); assert.equal(after.income, before.income);
	assert.equal(added[0].portfolioId, 'long-term'); assert.equal(added[0].platformId, 'broker');
	assert.deepEqual(summarize(added, 'father', '2026-10'), summarize(original, 'father', '2026-10'));
	assert.throws(() => addContribution(added, platforms, input, 'admin'));
	assert.throws(() => addContribution(original, platforms, input, 'father'));
	for (const invalid of [{ amount: 0 }, { amount: 1.234 }, { date: '2026-02-30' }, { platformId: 'missing' }, { account: 'Tarjeta' }])
		assert.throws(() => addContribution(original, platforms, { ...input, ...invalid }, 'admin'));
	assert.equal(emergencyBalance(addContribution(original, platforms, { ...input, account: 'Fondo de emergencia' }, 'admin')), emergencyBalance(original) - 12345);
});

test('valuation dates are unique per platform, zero is valued and reference month preserves actual date', () => {
	const platforms = initialPlatforms(); const original = initialValuations();
	const value = { platformId: 'funds', date: '2026-10-12', month: '2026-10', amount: 0 };
	const changed = saveValuation(original, platforms, value, 'admin');
	assert.equal(changed.length, original.length); assert.equal(monthlyValuation(changed, 'funds', '2026-10').amount, 0);
	assert.equal(monthlyValuation(changed, 'missing', '2026-10'), null);
	assert.equal(monthlyValuation(original, 'funds', '2026-10').amount, 960000);
	const different = saveValuation(changed, platforms, { ...value, date: '2026-11-01', month: '2026-10', amount: 10000 }, 'admin');
	assert.equal(monthlyValuation(different, 'funds', '2026-10').date, '2026-11-01');
	assert.throws(() => saveValuation(original, platforms, value, 'father'));
	assert.throws(() => saveValuation(original, platforms, { ...value, amount: -1 }, 'admin'));
	assert.throws(() => saveValuation(original, platforms, { ...value, month: '2026-13' }, 'admin'));
});

test('carteras group configurable platforms, renaming preserves relationships and historical identity', () => {
	const portfolios = initialPortfolios(); const platforms = initialPlatforms();
	assert.equal(portfolios.length, 1); assert.equal(platforms.length, 3);
	const created = createPortfolio(portfolios, { id: 'new', name: ' Otra cartera ' }, 'admin');
	assert.equal(created.at(-1).name, 'Otra cartera');
	const renamed = savePlatform(platforms, created, { ...platforms[0], name: 'Plataforma renombrada' }, 'admin');
	assert.equal(renamed[0].id, platforms[0].id);
	assert.throws(() => savePlatform(platforms, created, { ...platforms[0], portfolioId: 'new' }, 'admin'));
	assert.throws(() => savePlatform(platforms, portfolios, { id: 'unknown', portfolioId: 'missing', name: 'Otra' }, 'admin'));
	assert.throws(() => createPortfolio(created, { id: 'other', name: 'otra cartera' }, 'admin'));
	assert.throws(() => createPortfolio(portfolios, { id: 'new', name: 'Otra' }, 'father'));
});

test('Modified Dietz weights dated capital and includes closing-date flows only once', () => {
	const result = modifiedDietz({ date: '2026-01-01', amount: 10000 }, { date: '2026-01-31', amount: 16000 }, [{ date: '2026-01-16', amount: 5000 }]);
	assert.equal(result.gain, 1000); assert.equal(result.rate, 0.08);
	assert.equal(modifiedDietz({ date: '2026-01-01', amount: 10000 }, { date: '2026-01-31', amount: 16000 }, [{ date: '2026-01-31', amount: 5000 }, { date: '2026-01-01', amount: 999999 }]).rate, 0.1);
	assert.equal(modifiedDietz({ date: '2026-01-01', amount: 0 }, { date: '2026-01-31', amount: 1000 }, []).rate, null);
	assert.equal(modifiedDietz({ date: '2026-01-31', amount: 1 }, { date: '2026-01-01', amount: 2 }, []), null);
});

test('aggregate performance uses combined amounts, refuses missing and misaligned valuations', () => {
	const values = [
		{ platformId: 'a', date: '2026-01-01', month: '2026-01', amount: 10000 },
		{ platformId: 'b', date: '2026-01-01', month: '2026-01', amount: 90000 },
		{ platformId: 'a', date: '2026-01-31', month: '2026-01', amount: 11000 },
		{ platformId: 'b', date: '2026-01-31', month: '2026-01', amount: 90000 },
	];
	assert.equal(periodPerformance(['a', 'b'], values, [], '2026-01').result.rate, 0.01);
	assert.equal(periodPerformance(['a'], values, [], '2026-01').result.rate, 0.1);
	assert.equal(periodPerformance(['a', 'b'], values.filter((v) => v.platformId !== 'b'), [], '2026-01').complete, false);
	assert.equal(periodPerformance(['a', 'b'], values.map((v) => v.platformId === 'b' && v.date === '2026-01-31' ? { ...v, date: '2026-01-30' } : v), [], '2026-01').result, null);
});

test('comparison series chain returns geometrically and compare compounded references on actual dates', () => {
	const values = [
		{ platformId: 'a', month: '2026-01', date: '2026-01-01', amount: 10000 },
		{ platformId: 'a', month: '2026-02', date: '2026-02-01', amount: 11000 },
		{ platformId: 'a', month: '2026-03', date: '2026-03-01', amount: 12100 },
	];
	const series = investmentSeries(['a'], values, [], 2026);
	assert.equal(series[0].index, 100); assert.ok(Math.abs(series[2].index - 121) < 1e-10);
	assert.ok(Math.abs(series[1].five - 100 * 1.05 ** (31 / 365)) < 1e-10);
	assert.ok(series[2].nine > series[2].five);
	assert.equal(investmentSeries(['a'], [{ ...values[0], amount: 0 }], [], 2026)[0].index, null);
	assert.equal(series[3].total, null); assert.equal(series[3].index, null);
});

test('editar aportación actualiza movimiento, plataforma y cuenta sin duplicar ni afectar ahorro', () => {
 const platforms = initialPlatforms();
 const base = initialMovements();
 const before = summarize(base, 'own', '2026-10');
 const input = {id:'o4', platformId:'broker', date:'2026-10-08', amount:40000, account:'Fondo de emergencia'};
 const after = editContribution(base, platforms, input, 'admin');
 assert.equal(after.length, base.length);
 assert.equal(after.filter(m => m.id === 'o4').length, 1);
 assert.equal(after.find(m => m.id === 'o4').platformId, 'broker');
 assert.equal(after.find(m => m.id === 'o4').portfolioId, 'long-term');
 assert.equal(summarize(after, 'own', '2026-10').investment, before.investment + 10000);
 assert.equal(summarize(after, 'own', '2026-10').savings, before.savings);
 assert.equal(emergencyBalance(after), emergencyBalance(base) - 40000);
 assert.throws(() => editContribution(base, platforms, {...input,id:'o1'}, 'admin'));
 assert.throws(() => editContribution(base, platforms, input, 'father'));
 assert.throws(() => editContribution(base, platforms, {...input,amount:0}, 'admin'));
});

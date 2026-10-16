<script lang="ts">
	import {
		money,
		currentHistoryPeriod,
		historyPeriods,
		historyYears,
		summarize,
		categorySpend,
		categories,
		type Movement,
		type Context,
	} from '#lib/demo/model.ts';
	let {
		movements,
		context = 'father',
		onview,
	}: { movements: Movement[]; context?: Context; onview?: (month: string) => void } = $props();
	const currentPeriod = currentHistoryPeriod();
	const currentYear = Number(currentPeriod.slice(0, 4));
	let selectedYear = $state(currentYear);
	let monthNumber = $state(currentPeriod.slice(5));
	let selectedMonth = $derived(`${selectedYear}-${monthNumber}`);
	let years = $derived(historyYears(movements, context, currentYear));
	let chart: HTMLDivElement;
	$effect(() => {
		selectedMonth;
		chart?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
	});
	let history = $derived(
		historyPeriods(selectedYear).map((period) => ({
			...period,
			...summarize(movements, context, period.month),
		})),
	);
	let scale = $derived(
		Math.max(
			1,
			...history.flatMap((period) => [period.income, period.expenses]),
		),
	);
	let selected = $derived(
		history.find((period) => period.month === selectedMonth)!,
	);
	let hasMovements = $derived(movements.some((m) => m.context === context && m.date.startsWith(selectedMonth)));
	let hasYearMovements = $derived(movements.some((m) => m.context === context && m.date.startsWith(`${selectedYear}-`)));
	let breakdown = $derived(
		categories
			.map((name) => ({
				name,
				amount: categorySpend(movements, context, selectedMonth, name),
			}))
			.filter((c) => c.amount > 0)
			.toSorted((a, b) => b.amount - a.amount),
	);
</script>

<section class="panel father-history">
	<div class="panel-title">
		<div>
			<h2>Así van tus meses</h2>
			<p>Ingresos y gastos registrados · {selectedYear}</p>
		</div>
		<span class="soft-tag">Datos ficticios</span>
	</div>
	<div class="history-selectors">
		<label>Año<select aria-label="Año del histórico" bind:value={selectedYear}>
			{#each years as year}<option value={year}>{year}</option>{/each}
		</select></label>
		{#if context === 'own'}
			<label>Mes<select aria-label="Mes del histórico" bind:value={monthNumber}>
				{#each history as period}<option value={period.month.slice(5)}>{period.label}</option>{/each}
			</select></label>
		{/if}
	</div>
	{#if !hasYearMovements}<p class="history-empty" role="status">Sin movimientos registrados en {selectedYear}.</p>{/if}
	<div class="chart-legend">
		<span><i class="income-key"></i>Ingresos</span><span
			><i class="expense-key"></i>Gastos</span
		>
	</div>
	<div
		class="monthly-chart"
		bind:this={chart}
		style={`grid-template-columns:repeat(${history.length}, minmax(100px, 1fr));overflow-x:auto`}
		role="group"
		aria-label="Seleccionar mes del histórico"
	>
		{#each history as period}
			<button
				class="month-column"
				class:selected={selectedMonth === period.month}
				aria-pressed={selectedMonth === period.month}
				aria-label={`${period.label}: ingresos ${money(period.income)}, gastos ${money(period.expenses)}`}
				onclick={() => (monthNumber = period.month.slice(5))}
			>
				<span class="chart-bars" aria-hidden="true"
					><i
						class="income-bar"
						style={`height:${(period.income * 100) / scale}%`}
					></i><i
						class="expense-bar"
						style={`height:${(period.expenses * 100) / scale}%`}
					></i></span
				>
				<strong>{period.label}</strong><small
					>{period.month === currentPeriod
						? 'Mes en curso'
						: movements.some((m) => m.context === context && m.date.startsWith(period.month)) ? 'Registrado' : 'Sin movimientos'}</small
				>
			</button>
		{/each}
	</div>
	<div class="selected-month" aria-live="polite">
		<h3>{selected.label} {selectedYear}</h3>
		{#if !hasMovements}<p class="history-empty" role="status">Sin movimientos registrados en este mes.</p>{:else}
		<dl>
			<div>
				<dt>Ingresos registrados</dt>
				<dd>{money(selected.income)}</dd>
			</div>
			<div>
				<dt>Gastos registrados</dt>
				<dd class="expense-amount">{money(selected.expenses)}</dd>
			</div>
			<div>
				<dt>Resultado del mes</dt>
				<dd class:expense-amount={selected.savings < 0}>{money(selected.savings)}</dd>
			</div>
			{#if context === 'own'}
				<div><dt>Margen de ahorro</dt><dd>{selected.rate ?? '—'}{selected.rate === null ? '' : ' %'}</dd></div>
			{/if}
		</dl>
		{/if}
		{#if onview && hasMovements}<button class="text-button history-movements" onclick={() => onview?.(selectedMonth)}>Consultar movimientos</button>{/if}
	</div>
	<section class="history-categories" aria-label="Gastos por categoría">
		<h3>Gastos por categoría · {selected.label}</h3>
		<p class="muted">Importes registrados en este mes y contexto.</p>
		{#each breakdown as item}
			<div class="history-category">
				<div><span>{item.name}</span><strong>{money(item.amount)}</strong></div>
				<progress
					value={item.amount}
					max={Math.max(1, ...breakdown.map((c) => c.amount))}
					aria-label={`${item.name}: ${money(item.amount)}`}
				></progress>
			</div>
		{/each}
		{#if breakdown.length === 0}<p>
				No hay gastos registrados en este mes de la demo.
			</p>{/if}

	</section>
	<div class="panel-footer">
		Desliza el gráfico para ver todos los meses y toca uno para ver sus importes. El mes en curso no debe compararse como si estuviera completo. El resultado no es el saldo bancario ni el
		disponible prudente.
	</div>
</section>

<style>
	.history-selectors { display: flex; flex-wrap: wrap; gap: 16px; padding: 0 24px 24px; }
	.history-selectors label { display: flex; align-items: center; gap: 8px; }
	.history-selectors select { padding: 10px; border: 1px solid #cbd9c0; border-radius: 6px; background: #fff; color: inherit; font: inherit; }
	.history-empty { padding: 12px 0; line-height: 1.6; }
	.father-history > .history-empty { padding: 0 24px 20px; }
	.history-movements { margin-bottom: 20px; }
</style>

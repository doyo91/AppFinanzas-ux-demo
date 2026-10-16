<script lang="ts">
	import {
		money,
		summarize,
		categorySpend,
		categories,
		type Movement,
		type Context,
	} from '#lib/demo/model.ts';
	let {
		movements,
		context = 'father',
	}: { movements: Movement[]; context?: Context } = $props();
	let selectedMonth = $state('2026-10');
	const periods = [
		{ month: '2026-08', label: 'Agosto' },
		{ month: '2026-09', label: 'Septiembre' },
		{ month: '2026-10', label: 'Octubre' },
	];
	const expenseColors = [
		'#a72121', '#c34b4b', '#da7770', '#b96b48', '#b18478', '#d4aaa0', '#9c687b',
	];
	let history = $derived(
		periods
			.filter((p) => context === 'father' || p.month !== '2026-08')
			.map((period) => ({
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
			<p>Ingresos y gastos registrados · 2026</p>
		</div>
		<span class="soft-tag">Datos ficticios</span>
	</div>
	<div class="chart-legend">
		<span><i class="income-key"></i>Ingresos</span><span
			><i class="expense-key"></i>Gastos</span
		>
	</div>
	<div
		class="monthly-chart"
		role="group"
		aria-label="Seleccionar mes del histórico"
	>
		{#each history as period}
			<button
				class="month-column"
				class:selected={selectedMonth === period.month}
				aria-pressed={selectedMonth === period.month}
				aria-label={`${period.label}: ingresos ${money(period.income)}, gastos ${money(period.expenses)}`}
				onclick={() => (selectedMonth = period.month)}
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
					>{period.month === '2026-10'
						? 'Mes en curso'
						: 'Mes de ejemplo'}</small
				>
			</button>
		{/each}
	</div>
	<div class="selected-month" aria-live="polite">
		<h3>{selected.label} 2026</h3>
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
				<dd>{money(selected.savings)}</dd>
			</div>
		</dl>
	</div>
	<section class="history-categories" aria-label="Gastos por categoría">
		<h3>Gastos por categoría · {selected.label}</h3>
		<p class="muted">Importes registrados en este mes y contexto.</p>
		{#if context === 'father' && breakdown.length > 0}
			<div class="spending-layout father-history-spending">
				<div class="spending-total">
					<span>Total gastado</span>
					<strong class="expense-amount">{money(selected.expenses)}</strong>
					<div class="mini-bars" aria-hidden="true">
						{#each breakdown as item, index}
							<i style={`height:${(item.amount / breakdown[0].amount) * 100}%;--bar-color:${expenseColors[index % expenseColors.length]}`}></i>
						{/each}
					</div>
				</div>
				<div class="category-breakdown">
					{#each breakdown as item, index}
						<div>
							<span><i style={`background:${expenseColors[index % expenseColors.length]}`}></i>{item.name}</span>
							<strong class="expense-amount">{money(item.amount)}</strong>
						</div>
					{/each}
				</div>
			</div>
		{:else}
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
		{/if}
		{#if breakdown.length === 0}<p>
				No hay gastos registrados en este mes de la demo.
			</p>{/if}
		{#if selectedMonth !== '2026-10'}<small
				>Los ejemplos anteriores contienen gastos resumidos en «Otros»; no se
				inventa su reparto.</small
			>{/if}
	</section>
	<div class="panel-footer">
		Toca un mes para ver sus importes. Octubre está en curso: no lo compares
		como si estuviera completo. El resultado no es el saldo bancario ni el
		disponible prudente.
	</div>
</section>

<style>
	.father-history-spending {
		padding: 20px 0;
	}
	.father-history-spending .mini-bars i {
		min-height: 0;
		flex: 1;
		max-width: 22px;
	}
	@media (max-width: 420px) {
		.father-history-spending {
			flex-wrap: wrap;
			gap: 16px;
		}
		.father-history-spending .spending-total,
		.father-history-spending .category-breakdown {
			width: 100%;
		}
	}
</style>

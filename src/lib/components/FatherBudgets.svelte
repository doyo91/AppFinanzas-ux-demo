<script lang="ts">
	import {
		money,
		categorySpend,
		budgetStatus,
		type Movement,
		type Budget,
	} from '#lib/demo/model.ts';
	let { movements, budgets }: { movements: Movement[]; budgets: Budget[] } =
		$props();
</script>

<section class="panel father-budget-panel">
	<div class="panel-title">
		<div>
			<h2>Tus presupuestos de octubre</h2>
			<p>Los límites que ha marcado el administrador</p>
		</div>
	</div>
	<div class="father-budget-grid">
		{#each budgets.filter((b) => b.context === 'father' && b.month === '2026-10') as budget}
			{@const spent = categorySpend(
				movements,
				'father',
				'2026-10',
				budget.category,
			)}
			{@const status = budgetStatus(spent, budget.amount)}
			<article
				class="father-budget-card"
				class:budget-warning={status === 'warning'}
				class:budget-exceeded={status === 'exceeded'}
			>
				<div>
					<h3>{budget.category}</h3>
					<span class="budget-status"
						>{status === 'exceeded'
							? 'Has superado el límite'
							: status === 'warning'
								? 'Te acercas al límite'
								: 'Dentro del presupuesto'}</span
					>
				</div>
				<p>
					<strong>{money(spent)}</strong><span
						>gastados de {money(budget.amount)}</span
					>
				</p>
				<progress
					value={Math.min(spent, budget.amount)}
					max={budget.amount}
					aria-label={`Presupuesto de ${budget.category}`}
				></progress>
				<div class="budget-remaining">
					<strong
						>{spent > budget.amount
							? `${money(spent - budget.amount)} de exceso`
							: `${money(budget.amount - spent)} disponibles`}</strong
					><span
						>{(Math.round((spent * 1000) / budget.amount) / 10).toLocaleString(
							'es-ES',
						)} %</span
					>
				</div>
			</article>
		{/each}
		{#if !budgets.some((b) => b.context === 'father' && b.month === '2026-10')}<p
			>
				No hay presupuestos asignados para octubre.
			</p>{/if}
	</div>
	<div class="panel-footer">
		El aviso aparece desde el 80 % y se destaca desde el 100 %. Los límites
		sirven para orientarte; no bloquean gastos. Solo aparecen las categorías con
		presupuesto asignado.
	</div>
</section>

<style>
	.budget-warning .budget-status,
	.budget-exceeded .budget-status {
		padding: 6px 10px;
		border-radius: 6px;
		font-weight: 700;
	}
	.budget-warning .budget-status {
		color: #795116;
		background: #fae9c4;
	}
	.budget-exceeded {
		border-color: #d47474;
		border-left: 5px solid #b32626;
	}
	.budget-exceeded .budget-status {
		color: #fff;
		background: #b32626;
	}
	.budget-exceeded > p strong,
	.budget-exceeded .budget-remaining strong {
		color: #a72121;
		font-weight: 800;
	}
</style>

<script lang="ts">
	import {
		categories,
		parseAmount,
		type Budget,
		type Context,
	} from '#lib/demo/model.ts';
	let {
		budgets,
		context,
		month,
		onsave,
	}: {
		budgets: Budget[];
		context: Context;
		month: string;
		onsave: (category: string, amount: number | null) => void;
	} = $props();
	let dialog: HTMLDialogElement;
	let category = $state(categories[0]);
	let amount = $state('');
	let error = $state('');
	function load() {
		const value = budgets.find(
			(b) =>
				b.context === context && b.month === month && b.category === category,
		)?.amount;
		amount =
			value === undefined
				? ''
				: `${Math.trunc(value / 100)},${String(value % 100).padStart(2, '0')}`;
		error = '';
	}
	function save(event: SubmitEvent) {
		event.preventDefault();
		const cents = amount.trim() === '' ? null : parseAmount(amount);
		if (amount.trim() !== '' && cents === null) {
			error =
				'Introduce un importe positivo con hasta dos decimales, o deja vacío para quitar el límite.';
			return;
		}
		onsave(category, cents);
		dialog.close();
	}
</script>

<button
	class="secondary"
	onclick={() => {
		load();
		dialog.showModal();
	}}
	>Editar presupuestos {context === 'father' ? 'del padre' : 'propios'}</button
>
<dialog
	bind:this={dialog}
	class="entry-dialog"
	aria-label={`Presupuestos ${context === 'father' ? 'del padre' : 'propios'}`}
>
	<div class="dialog-heading">
		<div>
			<p class="eyebrow">
				{context === 'father' ? 'CONTEXTO DEL PADRE' : 'MIS FINANZAS'} · {month}
			</p>
			<h2>Editar presupuesto</h2>
		</div>
		<button class="secondary" onclick={() => dialog.close()}>Cerrar</button>
	</div>
	<p class="dialog-intro">
		Solo se cambia esta categoría, contexto y mes. Vacío significa sin
		presupuesto, no cero.
	</p>
	<form onsubmit={save}>
		<label
			>Categoría<select
				aria-label="Categoría del presupuesto"
				bind:value={category}
				onchange={load}
				>{#each categories as name}<option>{name}</option>{/each}</select
			></label
		>
		<label
			>Límite mensual (€)<input
				aria-label="Límite mensual (€)"
				bind:value={amount}
				inputmode="decimal"
				placeholder="Sin presupuesto"
			/></label
		>
		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<div class="dialog-actions">
			<button class="secondary" type="button" onclick={() => dialog.close()}
				>Cancelar</button
			><button class="primary" type="submit">Guardar presupuesto</button>
		</div>
	</form>
</dialog>

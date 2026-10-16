<script lang="ts">
	import { money, parseAmount, DEMO_MONTH, type Movement } from '#lib/demo/model.ts';
	import { latestValuation, type Portfolio, type Valuation } from '#lib/demo/investments.ts';
	let { movements, portfolios, valuations, oncreate, oncontribute, onvalue }: {
		movements: Movement[]; portfolios: Portfolio[]; valuations: Valuation[];
		oncreate: (name: string) => void;
		oncontribute: (portfolioId: string, date: string, amount: number, account: string) => void;
		onvalue: (value: Valuation) => void;
	} = $props();
	let selected = $state('all');
	let action = $state<'portfolio' | 'contribution' | 'valuation'>('contribution');
	let dialog: HTMLDialogElement;
	let portfolioId = $state('');
	let name = $state('');
	let date = $state('2026-10-13');
	let amount = $state('');
	let account = $state('Cuenta principal');
	let error = $state('');
	let notice = $state('');
	let cards = $derived(portfolios.filter((p) => selected === 'all' || p.id === selected));
	let latest = $derived(cards.map((p) => latestValuation(valuations, p.id)));
	let hasAllValues = $derived(latest.length > 0 && latest.every((v) => v !== null));
	let total = $derived(latest.reduce((sum, value) => sum + (value?.amount ?? 0), 0));
	let contributions = $derived(movements.filter((m) => m.context === 'own' && m.kind === 'investment' && (selected === 'all' || m.portfolioId === selected)));
	let recentContributions = $derived(contributions.filter((m) => m.date.startsWith(DEMO_MONTH)).reduce((sum, m) => sum + m.amount, 0));
	let entries = $derived([
		...contributions.map((m) => ({ id: m.id, portfolioId: m.portfolioId, date: m.date, type: 'Aportación', amount: m.amount })),
		...valuations.filter((v) => selected === 'all' || v.portfolioId === selected).map((v) => ({ id: `v-${v.portfolioId}-${v.date}`, ...v, type: 'Valoración' })),
	].toSorted((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)));
	let replacing = $derived(action === 'valuation' && valuations.some((v) => v.portfolioId === portfolioId && v.date === date));
	const dateLabel = (value: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
	function open(next: typeof action, id?: string) {
		action = next;
		portfolioId = id ?? (selected === 'all' ? portfolios[0]?.id ?? '' : selected);
		date = '2026-10-13'; amount = ''; name = ''; account = 'Cuenta principal'; error = '';
		dialog.showModal();
	}
	function edit(value: Valuation) {
		open('valuation', value.portfolioId); date = value.date;
		amount = `${Math.trunc(value.amount / 100)},${String(value.amount % 100).padStart(2, '0')}`;
	}
	function save(event: SubmitEvent) {
		event.preventDefault(); error = '';
		try {
			if (action === 'portfolio') oncreate(name);
			else {
				const cents = action === 'valuation' && /^0(?:[,.]0{1,2})?$/.test(amount.trim()) ? 0 : parseAmount(amount);
				if (cents === null) throw new Error('Introduce un importe válido con un máximo de dos decimales.');
				if (action === 'contribution') oncontribute(portfolioId, date, cents, account);
				else onvalue({ portfolioId, date, amount: cents });
			}
			notice = action === 'portfolio' ? 'Cartera creada.' : action === 'contribution' ? 'Aportación registrada sin modificar el ahorro ordinario.' : 'Valoración guardada para la fecha indicada.';
			dialog.close();
		} catch (caught) { error = caught instanceof Error ? caught.message : 'No se ha podido guardar.'; }
	}
</script>

<div class="investment-actions">
	<button class="primary" onclick={() => open('contribution')} disabled={portfolios.length === 0}>Añadir aportación</button>
	<button class="secondary" onclick={() => open('valuation')} disabled={portfolios.length === 0}>Actualizar saldo</button>
	<button class="secondary" onclick={() => open('portfolio')}>Nueva cartera / plataforma</button>
</div>
{#if notice}<p class="context-notice" role="status">{notice} Los cambios duran hasta recargar.</p>{/if}
<div class="investment-filter">
	<label for="portfolio-filter">Ver cartera / plataforma</label>
	<select id="portfolio-filter" bind:value={selected}>
		<option value="all">Todas las carteras</option>
		{#each portfolios as portfolio}<option value={portfolio.id}>{portfolio.name}</option>{/each}
	</select>
</div>
<div class="metrics">
	<article class="metric savings">
		<span>Suma de últimas valoraciones</span><strong>{hasAllValues ? money(total) : latest.some((v) => v !== null) ? `${money(total)} · parcial` : 'Sin valoración'}</strong>
		<small>Valores declarados; pueden tener fechas distintas.</small>
	</article>
	<article class="metric"><span>Aportaciones · octubre 2026</span><strong>{money(recentContributions)}</strong><small>Entradas de capital; no son gastos.</small></article>
	<article class="metric"><span>Rentabilidad Modified Dietz</span><strong class="unavailable">No disponible</strong><small>Cálculo pendiente en esta maqueta.</small></article>
</div>
<div class="investment-portfolios">
	{#each cards as portfolio}
		{@const value = latestValuation(valuations, portfolio.id)}
		{@const later = contributions.filter((m) => m.portfolioId === portfolio.id && (!value || m.date > value.date)).reduce((sum, m) => sum + m.amount, 0)}
		<section class="panel investment-card">
			<h2>{portfolio.name}</h2>
			<p>Último saldo declarado</p>
			<strong class="portfolio-value">{value ? money(value.amount) : 'Sin valoración'}</strong>
			<p>{value ? `Valoración del ${dateLabel(value.date)}` : 'Añade una valoración para conocer su saldo.'}</p>
			{#if later > 0}<p class="pending-value">{money(later)} de aportaciones sin valoración posterior. No están añadidas al saldo mostrado.</p>{/if}
			<div class="investment-card-actions">
				<button class="secondary" onclick={() => open('contribution', portfolio.id)}>Aportar</button>
				<button class="secondary" onclick={() => open('valuation', portfolio.id)}>Actualizar saldo</button>
				<button class="text-button" onclick={() => (selected = portfolio.id)}>Ver historial</button>
			</div>
		</section>
	{/each}
</div>
<section class="panel investment-history">
	<div class="panel-title"><div><h2>Aportaciones y valoraciones</h2><p>Fecha real de cada operación · datos ficticios</p></div></div>
	{#each entries as entry (entry.id)}
		<div class="investment-entry">
			<div><strong>{entry.type} · {portfolios.find((p) => p.id === entry.portfolioId)?.name ?? 'Sin cartera asignada'}</strong><small>{dateLabel(entry.date)}</small></div>
			<strong>{entry.type === 'Aportación' ? '+' : ''}{money(entry.amount)}</strong>
			{#if entry.type === 'Valoración'}<button class="text-button" aria-label={`Editar valoración de ${portfolios.find((p) => p.id === entry.portfolioId)?.name} del ${entry.date}`} onclick={() => edit({ portfolioId: entry.portfolioId!, date: entry.date, amount: entry.amount })}>Editar</button>{/if}
		</div>
	{:else}<p class="investment-empty">Sin operaciones registradas para esta cartera.</p>{/each}
	<div class="panel-footer">Una aportación mueve capital. Una valoración indica cuánto vale la cartera en una fecha y no mueve dinero. No se calculan todavía ganancias ni rentabilidades.</div>
</section>

<dialog bind:this={dialog} class="entry-dialog" aria-label={action === 'portfolio' ? 'Nueva cartera' : action === 'contribution' ? 'Añadir aportación' : 'Actualizar saldo'}>
	<div class="dialog-heading"><h2>{action === 'portfolio' ? 'Nueva cartera / plataforma' : action === 'contribution' ? 'Añadir aportación' : 'Actualizar saldo'}</h2><button class="secondary" onclick={() => dialog.close()}>Cerrar</button></div>
	<form onsubmit={save}>
		{#if action === 'portfolio'}
			<label>Nombre de la cartera / plataforma<input bind:value={name} required maxlength="60" placeholder="Ej.: Plataforma de fondos" /></label>
		{:else}
			<p class="form-hint">{action === 'contribution' ? 'Registra el capital cuando entra en la cartera. No cuenta como gasto.' : 'Introduce el valor total que muestra la plataforma en esta fecha. No se suma a los saldos anteriores.'}</p>
			<label>Cartera / plataforma<select bind:value={portfolioId} required>{#each portfolios as portfolio}<option value={portfolio.id}>{portfolio.name}</option>{/each}</select></label>
			<div class="form-columns"><label>Fecha real<input type="date" bind:value={date} required /></label><label>{action === 'contribution' ? 'Aportación (€)' : 'Saldo total (€)'}<input bind:value={amount} inputmode="decimal" placeholder="0,00" required /></label></div>
			{#if action === 'contribution'}<label>Cuenta de origen<select bind:value={account}><option>Cuenta principal</option><option>Fondo de emergencia</option></select></label>{/if}
			{#if replacing}<p class="form-hint" role="status">Ya hay una valoración para esta cartera y fecha. Se sustituirá por el importe que guardes.</p>{/if}
		{/if}
		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<div class="dialog-actions"><button class="secondary" type="button" onclick={() => dialog.close()}>Cancelar</button><button class="primary" type="submit">{replacing ? 'Sustituir valoración' : 'Guardar'}</button></div>
	</form>
</dialog>

<style>
	.investment-actions, .investment-card-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
	.investment-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 24px; }
	.investment-filter select { padding: 12px; border: 1px solid #cbd9c0; border-radius: 6px; background: white; color: inherit; font: inherit; max-width: 100%; }
	.investment-portfolios { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px; }
	.investment-card { padding: 24px; }
	.investment-card h2 { font-size: 18px; overflow-wrap: anywhere; }
	.investment-card p { margin: 14px 0; font-size: 12px; line-height: 1.7; }
	.portfolio-value { display: block; font-size: 28px; font-variant-numeric: tabular-nums; }
	.investment-card-actions { margin: 20px 0 0; }
	.pending-value { padding: 12px; background: #fbf0d9; color: #795116; border-radius: 6px; }
	.investment-entry { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 18px 24px; border-top: 1px solid #e8ebe5; }
	.investment-entry > div { flex: 1; min-width: 160px; }
	.investment-entry strong { font-size: 13px; }
	.investment-entry small { display: block; margin-top: 8px; }
	.investment-empty { padding: 24px; }
	@media (max-width: 680px) { .investment-portfolios { grid-template-columns: 1fr; } .investment-actions > button { flex: 1 1 145px; } .investment-card, .investment-entry { padding: 18px; } }
</style>

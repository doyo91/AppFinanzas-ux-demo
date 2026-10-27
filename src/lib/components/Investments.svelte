<script lang="ts">
	import { money, parseAmount, DEMO_MONTH, currentHistoryPeriod, historyPeriods, type Movement } from '#lib/demo/model.ts';
	import { monthlyValuation, periodPerformance, investmentSeries, type Portfolio, type Platform, type Valuation } from '#lib/demo/investments.ts';
	import InvestmentChart from './InvestmentChart.svelte';
	let { movements, portfolios, platforms, valuations, onportfolio, onplatform, oncontribute, oneditcontribution, editContributionId, oneditopened, onvalue }: {
		movements: Movement[]; portfolios: Portfolio[]; platforms: Platform[]; valuations: Valuation[];
		onportfolio: (value: Portfolio) => void; onplatform: (value: Platform) => void;
		oncontribute: (platformId: string, date: string, amount: number, account: string) => void;
		onvalue: (value: Valuation) => void;
		oneditcontribution: (id: string, platformId: string, date: string, amount: number, account: string) => void;
		editContributionId: string | null; oneditopened: () => void;
	} = $props();
	const current = currentHistoryPeriod();
	let tab = $state('Resumen');
	let portfolioId = $state('long-term');
	let platformFilter = $state('all');
	let year = $state(Number(current.slice(0, 4)));
	let monthNumber = $state(current.slice(5));
	let period = $derived(`${year}-${monthNumber}`);
	let years = $derived([...new Set([Number(current.slice(0, 4)), Number(current.slice(0, 4)) + 1, ...valuations.map((v) => Number(v.month.slice(0, 4)))])].toSorted((a, b) => b - a));
	let members = $derived(platforms.filter((p) => p.portfolioId === portfolioId));
	let scoped = $derived(members.filter((p) => platformFilter === 'all' || p.id === platformFilter));
	let ids = $derived(scoped.map((p) => p.id));
	let performance = $derived(periodPerformance(ids, valuations, movements, period));
	let series = $derived(investmentSeries(ids, valuations, movements, year));
	let recordedMonths = $derived(historyPeriods(year).filter((item) =>
		valuations.some((v) => ids.includes(v.platformId) && v.month === item.month) ||
		movements.some((m) => m.context === 'own' && m.kind === 'investment' && ids.includes(m.platformId ?? '') && m.date.startsWith(item.month))
	));
	let chartSeries = $derived(series.filter((item) => recordedMonths.some((period) => period.month === item.month)));
	let chartPositions = $derived(chartSeries.map((item) => Number(item.month.slice(5))));
	let chartLabels = $derived(chartSeries.map((item) => historyPeriods(year).find((period) => period.month === item.month)!.label.slice(0, 3)));
	let accumulated = $derived(series.find((p) => p.month === period)?.index ?? null);
	let baseDate = $derived(series.find((p) => p.index !== null)?.date ?? null);
	let incoming = $derived(movements.filter((m) => m.context === 'own' && m.kind === 'investment' && ids.includes(m.platformId ?? '') && m.date.startsWith(period)).reduce((sum, m) => sum + m.amount, 0));
	let operations = $derived([
		...movements.filter((m) => m.context === 'own' && m.kind === 'investment' && ids.includes(m.platformId ?? '') && m.date.startsWith(`${year}-`)).map((m) => ({ id: m.id, platformId: m.platformId!, date: m.date, month: m.date.slice(0, 7), amount: m.amount, type: 'Aportación' })),
		...valuations.filter((v) => ids.includes(v.platformId) && v.month.startsWith(`${year}-`)).map((v) => ({ ...v, id: `v-${v.platformId}-${v.date}`, type: 'Valoración' })),
	].toSorted((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)));
	let action = $state<'portfolio' | 'platform' | 'contribution' | 'valuation'>('contribution');
	let dialog: HTMLDialogElement;
	let editingId = $state(''); let platformId = $state(''); let name = $state('');
	let date = $state('2026-10-13'); let referenceMonth = $state(DEMO_MONTH);
	let amount = $state(''); let account = $state('Cuenta principal'); let error = $state(''); let notice = $state('');
	let replacing = $derived(action === 'valuation' && valuations.some((v) => v.platformId === platformId && v.date === date));
	const percent = (value: number | null | undefined) => value === null || value === undefined ? 'No disponible' : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value * 100)} %`;
	const dateLabel = (value: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
	function selectPortfolio() { platformFilter = 'all'; }
	function open(next: typeof action, id = '') {
		action = next; editingId = ''; name = ''; error = ''; amount = ''; account = 'Cuenta principal';
		platformId = id || (platformFilter === 'all' ? members[0]?.id ?? '' : platformFilter);
		referenceMonth = period;
		date = period === DEMO_MONTH ? '2026-10-13' : new Date(Date.UTC(year, Number(monthNumber), 0)).toISOString().slice(0, 10);
		if (next === 'portfolio' && id) { editingId = id; name = portfolios.find((p) => p.id === id)!.name; }
		if (next === 'platform' && id) { editingId = id; name = platforms.find((p) => p.id === id)!.name; }
		dialog.showModal();
	}
	function editValue(value: Valuation) {
		open('valuation', value.platformId); date = value.date; referenceMonth = value.month;
		amount = `${Math.trunc(value.amount / 100)},${String(value.amount % 100).padStart(2, '0')}`;
	}
	function editContribution(id: string) {
		const movement = movements.find(m => m.id === id && m.context === 'own' && m.kind === 'investment');
		if (!movement || !movement.platformId || !platforms.some(p => p.id === movement.platformId)) return;
		const platform = platforms.find(p => p.id === movement.platformId)!;
		portfolioId = platform.portfolioId;
		open('contribution', platform.id);
		editingId = movement.id; date = movement.date; account = movement.account;
		amount = `${Math.trunc(movement.amount / 100)},${String(movement.amount % 100).padStart(2, '0')}`;
	}
	$effect(() => {
		if (editContributionId && dialog) {
			editContribution(editContributionId);
			oneditopened();
		}
	});
	function save(event: SubmitEvent) {
		event.preventDefault(); error = '';
		try {
			if (action === 'portfolio') {
				const id = editingId || crypto.randomUUID(); onportfolio({ id, name }); portfolioId = id; platformFilter = 'all';
			} else if (action === 'platform') onplatform({ id: editingId || crypto.randomUUID(), portfolioId, name });
			else {
				const cents = action === 'valuation' && /^0(?:[,.]0{1,2})?$/.test(amount.trim()) ? 0 : parseAmount(amount);
				if (cents === null) throw new Error('Introduce un importe válido con hasta dos decimales.');
				if (action === 'contribution' && editingId) oneditcontribution(editingId, platformId, date, cents, account);
				else if (action === 'contribution') oncontribute(platformId, date, cents, account);
				else onvalue({ platformId, date, month: referenceMonth, amount: cents });
			}
			notice = 'Guardado.'; dialog.close();
		} catch (caught) { error = caught instanceof Error ? caught.message : 'No se ha podido guardar.'; }
	}
</script>

<div class="investment-toolbar">
	<label>Cartera<select aria-label="Cartera de inversión" bind:value={portfolioId} onchange={selectPortfolio}>{#each portfolios as portfolio}<option value={portfolio.id}>{portfolio.name}</option>{/each}</select></label>
	<label>Año<select aria-label="Año de inversiones" bind:value={year}>{#each years as value}<option value={value}>{value}</option>{/each}</select></label>
	<label>Mes<select aria-label="Mes de inversiones" bind:value={monthNumber}>{#each historyPeriods(year) as item}<option value={item.month.slice(5)}>{item.label}</option>{/each}</select></label>
</div>
<div class="tabs investment-tabs" role="group" aria-label="Vistas de inversiones">{#each ['Resumen', 'Carteras', 'Plataformas', 'Histórico'] as view}<button class:active={tab === view} aria-pressed={tab === view} onclick={() => (tab = view)}>{view}</button>{/each}</div>
<div class="investment-actions">
	<button class="primary" disabled={members.length === 0} onclick={() => open('contribution')}>Añadir aportación</button>
	<button class="secondary" disabled={members.length === 0} onclick={() => open('valuation')}>Registrar saldo mensual</button>
</div>
{#if notice}<p class="context-notice" role="status">{notice}</p>{/if}
{#if tab !== 'Carteras'}<label class="platform-filter">Ver plataforma<select aria-label="Plataforma de inversión" bind:value={platformFilter}><option value="all">Conjunto de la cartera</option>{#each members as platform}<option value={platform.id}>{platform.name}</option>{/each}</select></label>{/if}

{#if tab === 'Resumen'}
	<div class="metrics investment-metrics">
		<article class="metric savings"><span>Valor declarado · {period}</span><strong>{performance.complete ? money(performance.total) : performance.total > 0 ? `${money(performance.total)} · parcial` : 'Sin valorar'}</strong><small>{performance.complete ? `${scoped.length} plataforma(s) con valoración mensual` : 'Faltan saldos de plataformas; no equivalen a cero.'}</small></article>
		<article class="metric"><span>Aportado en el mes</span><strong>{money(incoming)}</strong><small>No reduce el ahorro ordinario.</small></article>
		<article class="metric"><span>Rentabilidad del periodo</span><strong class:expense-amount={(performance.result?.rate ?? 0) < 0}>{percent(performance.result?.rate)}</strong><small>Modified Dietz · flujos fechados</small></article>
		<article class="metric"><span>Rentabilidad acumulada observada</span><strong class:expense-amount={(accumulated ?? 100) < 100}>{percent(accumulated === null ? null : accumulated / 100 - 1)}</strong><small>{baseDate ? `Desde ${dateLabel(baseDate)} hasta el cierre seleccionado.` : 'Falta una valoración inicial.'}</small></article>
	</div>
	<section class="panel period-explanation">
		{#if performance.result}<strong>Resultado entre valoraciones: <span class:expense-amount={performance.result.gain < 0}>{money(performance.result.gain)}</span></strong><p>{dateLabel(performance.result.start)} → {dateLabel(performance.result.end)} · Valor final menos valor inicial y aportaciones del intervalo.</p>{:else}<strong>Rentabilidad no disponible</strong><p>{performance.reason}</p>{/if}
		{#if period === DEMO_MONTH}<p>Octubre está en curso. La última valoración es del 12 de octubre.</p>{/if}
	</section>
	<div class="investment-graphs">
		<InvestmentChart title="Cómo evoluciona el valor" labels={chartLabels} positions={chartPositions} series={[{ name: 'Valor declarado', color: '#426c56', values: chartSeries.map((p) => p.total) }]} />
		<InvestmentChart title="Rentabilidad frente a tus referencias" base labels={chartLabels} positions={chartPositions} series={[{ name: 'Tu evolución', color: '#426c56', values: chartSeries.map((p) => p.index) }, { name: 'Teórico 5 % anual', color: '#a77d37', values: chartSeries.map((p) => p.five) }, { name: 'Teórico 9 % anual', color: '#687eab', values: chartSeries.map((p) => p.nine) }]} />
	</div>
	<p class="investment-hint">El total se calcula con todas las plataformas. Su rentabilidad se calcula con sus valores y aportaciones conjuntas, sin promediar porcentajes. Si sus fechas de cierre no coinciden, se muestran por separado y no se calcula rentabilidad conjunta.</p>
{:else if tab === 'Carteras'}
	<div class="investment-section-title"><h2>Tus carteras</h2><button class="secondary" onclick={() => open('portfolio')}>Nueva cartera</button></div>
	<div class="investment-grid">{#each portfolios as portfolio}
		{@const group = platforms.filter((p) => p.portfolioId === portfolio.id)}
		{@const result = periodPerformance(group.map((p) => p.id), valuations, movements, period)}
		<section class="panel investment-card"><h2>{portfolio.name}</h2><p>{group.length} plataformas · {period}</p><strong class="portfolio-value">{result.complete ? money(result.total) : 'Valoración incompleta'}</strong><p>Rentabilidad del periodo: {percent(result.result?.rate)}</p><p>{group.map((p) => p.name).join(' · ') || 'Añade su primera plataforma.'}</p><div class="investment-actions"><button class="secondary" onclick={() => { portfolioId = portfolio.id; platformFilter = 'all'; tab = 'Resumen'; }}>Ver resumen</button><button class="text-button" onclick={() => open('portfolio', portfolio.id)}>Editar cartera</button></div></section>
	{/each}</div>
{:else if tab === 'Plataformas'}
	<div class="investment-section-title"><h2>Plataformas de la cartera</h2><button class="secondary" onclick={() => open('platform')}>Añadir plataforma</button></div>
	<div class="investment-grid">{#each scoped as platform}
		{@const value = monthlyValuation(valuations, platform.id, period)}
		{@const result = periodPerformance([platform.id], valuations, movements, period)}
		{@const later = movements.filter((m) => m.kind === 'investment' && m.platformId === platform.id && (!value || m.date > value.date) && m.date.startsWith(period)).reduce((sum, m) => sum + m.amount, 0)}
		<section class="panel investment-card"><h2>{platform.name}</h2><p>{portfolios.find((p) => p.id === platform.portfolioId)?.name}</p><strong class="portfolio-value">{value ? money(value.amount) : 'Sin valoración mensual'}</strong><p>{value ? `Fecha real: ${dateLabel(value.date)} · referencia ${value.month}` : `Pendiente de introducir el saldo de ${period}.`}</p><p>Rentabilidad del periodo: <strong class:expense-amount={(result.result?.rate ?? 0) < 0}>{percent(result.result?.rate)}</strong></p>{#if result.result}<p>{dateLabel(result.result.start)} → {dateLabel(result.result.end)}</p>{/if}
			{#if later > 0}<p class="pending-value">{money(later)} aportados sin valoración posterior; no se suman automáticamente al saldo.</p>{/if}
			<div class="investment-actions"><button class="secondary" onclick={() => open('contribution', platform.id)}>Aportar</button><button class="secondary" onclick={() => open('valuation', platform.id)}>Registrar saldo</button><button class="text-button" onclick={() => open('platform', platform.id)}>Editar plataforma</button><button class="text-button" onclick={() => { platformFilter = platform.id; tab = 'Resumen'; }}>Ver gráficos</button></div>
		</section>
	{:else}<section class="panel investment-card"><p>No hay plataformas. Añade la primera para registrar aportaciones y saldos.</p></section>{/each}</div>
{:else}
	<section class="panel monthly-records"><div class="panel-title"><div><h2>Histórico mensual · {year}</h2><p>Una valoración efectiva por plataforma y mes: la de fecha más reciente.</p></div></div>
		<div class="table-scroll"><table><thead><tr><th>Mes</th><th>Valor declarado</th><th>Rentabilidad del intervalo</th></tr></thead><tbody>{#each recordedMonths as item}{@const result = periodPerformance(ids, valuations, movements, item.month)}<tr><td>{item.label}</td><td>{result.complete ? money(result.total) : 'Incompleto / sin valorar'}</td><td class:expense-amount={(result.result?.rate ?? 0) < 0}>{percent(result.result?.rate)}</td></tr>{:else}<tr><td colspan="3">Sin datos registrados en este año.</td></tr>{/each}</tbody></table></div>
	</section>
	<section class="panel investment-history"><div class="panel-title"><div><h2>Aportaciones y valoraciones · {year}</h2><p>Fecha real y mes de referencia separados</p></div></div>
		{#each operations as entry (entry.id)}<div class="investment-entry"><div><strong>{entry.type} · {platforms.find((p) => p.id === entry.platformId)?.name}</strong><small>{dateLabel(entry.date)}{entry.type === 'Valoración' ? ` · referencia ${entry.month}` : ''}</small></div><strong>{entry.type === 'Aportación' ? '+' : ''}{money(entry.amount)}</strong>{#if entry.type === 'Valoración'}<button class="text-button" aria-label={`Editar valoración de ${platforms.find((p) => p.id === entry.platformId)?.name} del ${entry.date}`} onclick={() => editValue(entry)}>Editar</button>{:else}<button class="text-button" aria-label={`Editar aportación de ${platforms.find((p) => p.id === entry.platformId)?.name} del ${entry.date}`} onclick={() => editContribution(entry.id)}>Editar</button>{/if}</div>{:else}<p class="investment-hint">Sin operaciones para esta selección.</p>{/each}
	</section>
{/if}
<p class="investment-hint">Retiradas y traspasos todavía pendientes en esta interfaz. Las comparaciones del 5 % y 9 % son referencias, no cotizaciones ni previsiones.</p>

<dialog bind:this={dialog} class="entry-dialog" aria-label={action === 'portfolio' ? 'Cartera' : action === 'platform' ? 'Plataforma' : action === 'contribution' ? (editingId ? 'Editar aportación' : 'Añadir aportación') : 'Registrar saldo mensual'}>
	<div class="dialog-heading"><h2>{action === 'portfolio' ? (editingId ? 'Editar cartera' : 'Nueva cartera') : action === 'platform' ? (editingId ? 'Editar plataforma' : 'Nueva plataforma') : action === 'contribution' ? (editingId ? 'Editar aportación' : 'Añadir aportación') : 'Registrar saldo mensual'}</h2><button class="secondary" onclick={() => dialog.close()}>Cerrar</button></div>
	<form onsubmit={save}>
		{#if action === 'portfolio' || action === 'platform'}<label>Nombre<input bind:value={name} required maxlength="60" /></label>{#if action === 'platform'}<p class="form-hint">Pertenece a {portfolios.find((p) => p.id === portfolioId)?.name}. Sus saldos se agregarán a esta cartera.</p>{/if}
		{:else}<p class="form-hint">{action === 'contribution' ? 'Registra cuándo entra el capital en la plataforma. No cuenta como gasto.' : 'Introduce el saldo total que muestra esta plataforma en la fecha real. Una valoración no mueve dinero.'}</p><label>Plataforma<select aria-label="Plataforma del registro" bind:value={platformId} required>{#each action === 'contribution' && editingId ? platforms : members as platform}<option value={platform.id}>{platform.name}{action === 'contribution' && editingId ? ` · ${portfolios.find(p => p.id === platform.portfolioId)?.name ?? ''}` : ''}</option>{/each}</select></label>
			<div class="form-columns"><label>Fecha real<input type="date" bind:value={date} required /></label><label>{action === 'contribution' ? 'Aportación (€)' : 'Saldo total (€)'}<input bind:value={amount} inputmode="decimal" placeholder="0,00" required /></label></div>
			{#if action === 'valuation'}<label>Mes de referencia<input type="month" bind:value={referenceMonth} required /></label>{:else}<label>Cuenta de origen<select bind:value={account}><option>Cuenta principal</option><option>Fondo de emergencia</option></select></label>{/if}
			{#if replacing}<p class="form-hint" role="status">Ya existe una valoración para esta plataforma y fecha. Se sustituirá; no se duplicará.</p>{/if}
		{/if}
		{#if error}<p class="form-error" role="alert">{error}</p>{/if}<div class="dialog-actions"><button class="secondary" type="button" onclick={() => dialog.close()}>Cancelar</button><button class="primary" type="submit">{replacing ? 'Sustituir valoración' : 'Guardar'}</button></div>
	</form>
</dialog>

<style>
	.investment-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.investment-toolbar, .investment-actions, .investment-section-title { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 24px; }
	.investment-toolbar label, .platform-filter { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; }
	.investment-toolbar select, .platform-filter select { padding: 11px; border: 1px solid #cbd9c0; border-radius: 6px; background: white; color: inherit; font: inherit; max-width: 100%; }
	.platform-filter { margin-bottom: 24px; }
	.investment-tabs { overflow-x: auto; white-space: nowrap; }
	.investment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px; }
	.investment-card, .period-explanation { padding: 24px; }
	.investment-card h2, .investment-section-title h2 { font-size: 18px; overflow-wrap: anywhere; }
	.investment-card p, .period-explanation p { margin: 12px 0; font-size: 12px; line-height: 1.7; }
	.investment-card .investment-actions { margin: 20px 0 0; }
	.portfolio-value { display: block; font-size: 28px; font-variant-numeric: tabular-nums; }
	.pending-value { padding: 12px; background: #fbf0d9; color: #795116; border-radius: 6px; }
	.investment-graphs { display: grid; gap: 24px; margin-top: 24px; }
	.investment-hint { font-size: 12px; line-height: 1.8; margin: 20px 0; }
	.investment-entry { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; padding: 18px 24px; border-top: 1px solid #e8ebe5; }
	.investment-entry > div { flex: 1; min-width: 160px; }
	.investment-entry strong { font-size: 13px; }
	.investment-entry small { display: block; margin-top: 8px; }
	.monthly-records { margin-bottom: 24px; }
	.table-scroll { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
	th, td { padding: 14px 24px; border-top: 1px solid #e8ebe5; white-space: nowrap; }
	.investment-section-title { justify-content: space-between; }
	@media (max-width: 680px) { .investment-grid { grid-template-columns: 1fr; } .investment-actions > button { flex: 1 1 145px; } .investment-card, .investment-entry, .period-explanation { padding: 18px; } .investment-toolbar > label:first-child { width: 100%; } .investment-toolbar > label:first-child select { flex: 1; min-width: 0; } }
</style>

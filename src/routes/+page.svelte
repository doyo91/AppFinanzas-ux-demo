<script lang="ts">
	import Records from '#lib/components/Records.svelte';
	import { netMovements, addRefund, updateShared, type LoanEvent, type Shared } from '#lib/demo/shared.ts';
	import Investments from '#lib/components/Investments.svelte';
	import { initialPortfolios, initialPlatforms, initialValuations, createPortfolio, savePlatform, addContribution, saveValuation } from '#lib/demo/investments.ts';
	import Icon from '#lib/components/Icon.svelte';
	import FatherBudgets from '#lib/components/FatherBudgets.svelte';
	import FatherHistory from '#lib/components/FatherHistory.svelte';
	import BudgetEditor from '#lib/components/BudgetEditor.svelte';
	import {
		initialMovements,
		money,
		parseAmount,
		summarize,
		categorySpend,
		budgetStatus,
		emergencyBalance,
		categories,
		accounts,
		initialBudgets,
		setBudget,
		saveFatherExpense,
		type Context,
		DEMO_MONTH,
		DEMO_PERIODS,
		type Movement,
		type Kind,
	} from '#lib/demo/model.ts';
	import './prototype.css';

	type Page =
		'home' | 'movements' | 'investments' | 'father' | 'history' | 'emergency';
	let page = $state<Page>('home');
	let role = $state<'admin' | 'father'>('admin');
	let adminPage = $state<Page>('home');
	const fatherNavigation = [
		{ name: 'Inicio', mobile: 'Inicio', icon: 'home' },
		{ name: 'Gastos / Presupuestos', mobile: 'Gastos', icon: 'wallet' },
		{ name: 'Histórico', mobile: 'Histórico', icon: 'calendar' },
		{ name: 'Deudas', mobile: 'Deudas', icon: 'person' },
	];
	let movements = $state(initialMovements());
	let loans = $state<LoanEvent[]>([]);
	let shared = $state<Shared[]>([]);
	let net = $derived(netMovements(movements, shared));
	let loanOut = $derived(loans.filter(e => e.type === 'loan' && e.date.startsWith(month)).reduce((n,e) => n + e.amount, 0));
	let loanIn = $derived(loans.filter(e => e.type === 'repayment' && e.date.startsWith(month)).reduce((n,e) => n + e.amount, 0));
	let refundIn = $derived(shared.flatMap(s => s.payments).filter(e => e.date.startsWith(month)).reduce((n,e) => n + e.amount, 0));
	let portfolios = $state(initialPortfolios());
	let valuations = $state(initialValuations());
	let platforms = $state(initialPlatforms());
	let budgets = $state(initialBudgets());
	let entryContext = $state<Context>('own');
	let editingId = $state<string | null>(null);
	let month = $state(DEMO_MONTH);
	let query = $state('');
	let filter = $state('all');
	let fatherTab = $state('Inicio');
	let fatherAllExpenses = $state(false);
	let isShared = $state(false);
	let ownShare = $state('');
	let refundOpen = $state(false);
	let refundAmount = $state('');
	let refundDate = $state('2026-10-13');
	let refundError = $state('');
	let selectedShared = $derived(shared.find(s => s.expenseId === selected?.id));
	let toast = $state('');
	let moreOpen = $state(false);
	let formDialog: HTMLDialogElement;
	let detailDialog: HTMLDialogElement;
	let selected = $state<Movement | null>(null);
	let kind = $state<'expense' | 'income' | 'transfer'>('expense');
	let concept = $state('');
	let amount = $state('');
	let formTotal = $derived(parseAmount(amount));
	let ownShareCents = $derived(parseShare(ownShare));
	let date = $state('2026-10-13');
	let category = $state(categories[0]);
	let account = $state(accounts[0]);
	let destination = $state(accounts[1]);
	let fixed = $state(false);
	let error = $state('');
	const labels: Record<Kind, string> = {
		expense: 'Gasto',
		income: 'Ingreso',
		transfer: 'Transferencia',
		investment: 'Aportación',
	};
	let monthLabels: Record<string, string> = $derived(Object.fromEntries(
		[...new Set([...DEMO_PERIODS.map((p) => p.month), ...movements.filter((m) => m.context === 'own').map((m) => m.date.slice(0, 7)), ...loans.map(e => e.date.slice(0, 7)), ...shared.flatMap(s => s.payments.map(e => e.date.slice(0, 7)))])]
			.toSorted((a, b) => b.localeCompare(a)).map((period) => {
				const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T12:00:00Z`));
				return [period, label.replace(/^./, (letter) => letter.toUpperCase())];
			}),
	));
	const titles: Record<Page, string> = {
		home: 'Tu dinero, con perspectiva.',
		movements: 'Cada movimiento cuenta.',
		investments: 'Un vistazo a tus inversiones.',
		father: 'Finanzas del padre',
		history: 'Mira el camino recorrido.',
		emergency: 'Tu colchón para imprevistos.',
	};
	const subtitles: Record<Page, string> = {
		home: 'Lo importante de este mes, en un solo lugar.',
		movements:
			'Consulta y prueba el registro de ingresos, gastos y transferencias.',
		investments: 'Una vista de tus carteras y aportaciones.',
		father:
			'Un contexto separado: el administrador gestiona y el padre consulta.',
		history: 'Compara los meses a partir de sus movimientos.',
		emergency: 'Una reserva de liquidez, separada del gasto diario.',
	};
	let totals = $derived(summarize(net, 'own', month));
	let fatherTotals = $derived(summarize(movements, 'father', DEMO_MONTH));
	let emergency = $derived(emergencyBalance(movements));
	let current = $derived(
		movements
			.filter((m) => m.context === 'own' && m.date.startsWith(month))
			.toSorted(
				(a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
			),
	);
	let filtered = $derived(
		current.filter(
			(m) =>
				(filter === 'all' || m.kind === filter) &&
				`${m.concept} ${m.category} ${m.account}`
					.toLocaleLowerCase('es')
					.includes(query.toLocaleLowerCase('es')),
		),
	);
	let fatherMovements = $derived(
		movements
			.filter((m) => m.context === 'father')
			.toSorted((a, b) => b.date.localeCompare(a.date)),
	);
	let spending = $derived(
		categories
			.map((name) => ({
				name,
				amount: categorySpend(net, 'own', month, name),
			}))
			.filter((c) => c.amount > 0)
			.toSorted((a, b) => b.amount - a.amount),
	);
	function parseShare(value: string): number | null {
		if (/^0(?:[,.]0{1,2})?$/.test(value.trim())) return 0;
		return parseAmount(value);
	}
	const inputMoney = (cents: number) => `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
	const dateLabel = (value: string) =>
		new Intl.DateTimeFormat('es-ES', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		}).format(new Date(`${value}T12:00:00Z`));
	function navigate(next: Page) {
		if (role === 'father' && next !== 'father') return;
		page = next;
		moreOpen = false;
		toast = '';
	}
	function switchPerspective(next: 'admin' | 'father') {
		if (role === 'admin') adminPage = page;
		role = next;
		page = next === 'father' ? 'father' : adminPage;
		if (next === 'father') fatherTab = 'Inicio';
		moreOpen = false;
		selected = null;
		toast = '';
	}
	function reset() {
		movements = initialMovements();
		loans = [];
		shared = [];
		portfolios = initialPortfolios();
		valuations = initialValuations();
		platforms = initialPlatforms();
		budgets = initialBudgets();
		query = '';
		filter = 'all';
		month = DEMO_MONTH;
		toast = 'Datos de prueba restablecidos.';
	}
	function openForm() {
		if (role !== 'admin') return;
		entryContext = page === 'father' ? 'father' : 'own';
		editingId = null;
		kind = 'expense';
		concept = '';
		amount = '';
		date = '2026-10-13';
		category = categories[0];
		account = accounts[0];
		destination = accounts[1];
		fixed = false;
		isShared = false;
		ownShare = '';
		error = '';
		formDialog.showModal();
	}
	function editExpense(movement: Movement) {
		if (role !== 'admin' || movement.kind !== 'expense') return;
		detailDialog.close();
		openForm();
		entryContext = movement.context;
		editingId = movement.id;
		concept = movement.concept;
		amount = inputMoney(movement.amount);
		date = movement.date;
		category = movement.category;
		account = movement.account;
		fixed = movement.fixed;
		const record = shared.find(s => s.expenseId === movement.id);
		isShared = !!record;
		ownShare = record ? inputMoney(movement.amount - record.expected) : '';
	}
	function saveRefund(event: SubmitEvent) {
		event.preventDefault();
		if (!selected || role !== 'admin') return;
		const cents = parseAmount(refundAmount);
		if (cents === null) { refundError = 'Introduce un importe positivo válido.'; return; }
		try {
			shared = addRefund(shared, movements, selected.id, {id: crypto.randomUUID(), date: refundDate, amount: cents});
			refundOpen = false;
			toast = 'Reembolso registrado.';
		} catch (e) { refundError = e instanceof Error ? e.message : 'No se ha podido guardar.'; }
	}
	function updateBudget(
		context: Context,
		period: string,
		category: string,
		value: number | null,
	) {
		if (role !== 'admin') return;
		budgets = setBudget(budgets, context, period, category, value, role);
		toast = `Presupuesto actualizado únicamente en ${context === 'father' ? 'el contexto del padre' : 'mis finanzas'} · ${period}.`;
	}
	function selectKind(value: typeof kind) {
		if (entryContext === 'father' && value !== 'expense') return;
		kind = value;
		category = value === 'income' ? 'Trabajo' : categories[0];
		account = accounts[0];
		error = '';
	}
	function save(event: SubmitEvent) {
		event.preventDefault();
		if (role !== 'admin') return;
		const cents = parseAmount(amount);
		if (cents === null) {
			error =
				'Introduce un importe positivo de hasta 1.000.000 €, con un máximo de dos decimales.';
			return;
		}
		if (!concept.trim() || concept.trim().length > 80) {
			error = 'Escribe un concepto de entre 1 y 80 caracteres.';
			return;
		}
		if (
			!DEMO_PERIODS.some((period) => date.startsWith(`${period.month}-`)) ||
			Number.isNaN(Date.parse(date)) ||
			new Date(date).toISOString().slice(0, 10) !== date
		) {
			error = 'Elige una fecha válida de mayo a octubre de 2026.';
			return;
		}
		if (
			kind === 'transfer' &&
			(account === destination || account === 'Tarjeta')
		) {
			error =
				'La transferencia debe tener dos cuentas distintas y no puede salir de una tarjeta.';
			return;
		}
		if (!editingId && movements.length >= 1000) {
			error =
				'Has llegado al límite de registros. Restablece los datos de prueba para continuar.';
			return;
		}
		const movement: Movement = {
			id: editingId ?? crypto.randomUUID(),
			context: entryContext,
			date,
			concept: concept.trim(),
			amount: cents,
			kind,
			category: kind === 'transfer' ? 'Transferencia' : category,
			account,
			...(kind === 'transfer' ? { destination } : {}),
			fixed: kind === 'expense' && fixed,
		};
		try {
			if (entryContext === 'own' && kind === 'expense') {
				if (isShared && (ownShareCents === null || ownShareCents >= cents)) {
					error = 'Introduce tu parte: debe ser menor que el importe total.';
					return;
				}
				const nextShared = updateShared(shared, movement, isShared ? cents - ownShareCents! : null);
				movements = editingId ? movements.map(m => m.id === editingId ? movement : m) : [movement, ...movements];
				shared = nextShared;
			} else movements =
				entryContext === 'father'
					? saveFatherExpense(movements, movement, role)
					: [movement, ...movements];
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'No se puede guardar este gasto.';
			return;
		}
		if (entryContext === 'own') month = date.slice(0, 7);
		query = '';
		filter = 'all';
		page = entryContext === 'father' ? 'father' : 'movements';
		if (entryContext === 'father') fatherTab = 'Gastos / Presupuestos';
		toast = `${editingId ? 'Gasto editado' : 'Movimiento añadido'} únicamente en ${entryContext === 'father' ? 'el contexto del padre' : 'mis finanzas'}.`;
		formDialog.close();
	}
	function showDetail(movement: Movement) {
		selected = movement;
		refundOpen = false;
		refundAmount = '';
		refundError = '';
		detailDialog.showModal();
	}
</script>

<svelte:head
	><title>AppFinanzas</title><meta
		name="description"
		content="Gestión y seguimiento de tus finanzas"
	/></svelte:head
>

{#snippet movementList(items: Movement[])}
	<div class="movement-list">
		{#each items as movement (movement.id)}
			<button
				class="movement-row"
				onclick={() => showDetail(movement)}
				aria-label={`Ver ${movement.concept}, ${money(movement.amount)}`}
			>
				<span
					class="movement-icon"
					class:expense={movement.kind === 'expense'}
					class:positive={movement.kind === 'income'}
					class:neutral={movement.kind === 'transfer' ||
						movement.kind === 'investment'}
					><Icon
						name={movement.kind === 'income'
							? 'down'
							: movement.kind === 'expense'
								? 'up'
								: 'movement'}
						size={18}
					/></span
				>
				<span class="movement-text"
					><strong>{movement.concept}</strong><small
						>{movement.kind === 'expense' ? 'Gasto · ' : ''}{movement.category} <span>·</span> {movement.account}</small
					></span
				>
				<span class="movement-value" class:expense={movement.kind === 'expense'} class:positive={movement.kind === 'income'}
					><strong
						>{movement.kind === 'income'
							? '+'
							: movement.kind === 'expense'
								? '−'
								: ''}{money(movement.amount)}</strong
					><small>{dateLabel(movement.date)}</small></span
				>
			</button>
		{:else}<div class="empty-state">
				<Icon name="search" size={28} />
				<h3>No hay movimientos aquí</h3>
				<p>Prueba otra búsqueda o registra un movimiento.</p>
				{#if query || filter !== 'all'}<button
						class="text-button"
						onclick={() => {
							query = '';
							filter = 'all';
						}}>Limpiar filtros</button
					>{/if}
			</div>{/each}
	</div>
{/snippet}

<div class="app-shell">
	<aside class="sidebar">
		<button
			class="brand"
			onclick={() =>
				role === 'father' ? (fatherTab = 'Inicio') : navigate('home')}
			aria-label="AppFinanzas, inicio"
			><span class="brand-mark"><Icon name="chart" size={22} /></span><span
				>App<span class="brand-light">Finanzas</span></span
			></button
		>
		<div class="workspace">
			<span class="avatar">{role === 'admin' ? 'A' : 'P'}</span>
			<div>
				<strong>{role === 'admin' ? 'Mi espacio' : 'Mi resumen'}</strong><small
					>{role === 'admin' ? 'Administrador' : 'Padre · solo lectura'}</small
				>
			</div>
			<span class="workspace-dot"></span>
		</div>
		<p class="nav-caption">TU DÍA A DÍA</p>
		{#if role === 'father'}
			<nav aria-label="Navegación del padre">
				{#each fatherNavigation as item}
					<button
						class:active={fatherTab === item.name}
						aria-current={fatherTab === item.name ? 'page' : undefined}
						onclick={() => (fatherTab = item.name)}
						><Icon name={item.icon} /><span>{item.name}</span></button
					>
				{/each}
			</nav>
		{:else}
			<nav aria-label="Navegación principal">
				{#each [{ id: 'home', name: 'Inicio', icon: 'home' }, { id: 'movements', name: 'Movimientos', icon: 'movement' }, { id: 'investments', name: 'Inversiones', icon: 'chart' }] as item}
					<button
						class:active={page === item.id}
						onclick={() => navigate(item.id as Page)}
						aria-current={page === item.id ? 'page' : undefined}
						><Icon name={item.icon} /><span>{item.name}</span
						>{#if page === item.id}<span class="active-dot"></span>{/if}</button
					>
				{/each}
			</nav>
			<p class="nav-caption second-caption">MÁS EN TU ESPACIO</p>
			<nav aria-label="Otras áreas">
				<button
					class:active={page === 'history'}
					onclick={() => navigate('history')}
					><Icon name="calendar" /><span>Histórico</span></button
				>
				<button
					class:active={page === 'emergency'}
					onclick={() => navigate('emergency')}
					><Icon name="shield" /><span>Fondo de emergencia</span></button
				>
				<button
					class:active={page === 'father'}
					onclick={() => navigate('father')}
					><Icon name="person" /><span>Finanzas del padre</span></button
				>
			</nav>
		{/if}
		<div class="sidebar-bottom">
			
			{#if role === 'admin'}<button class="reset-button" onclick={reset}
					><Icon name="reset" size={16} />Restablecer datos de prueba</button
				>{/if}
		</div>
	</aside>

	<div class="main-shell">
		<header class="topbar">
			<span class="breadcrumb"
				>{role === 'admin' ? 'Mi espacio' : 'Mi resumen'} <span>/</span>
				{role === 'father'
					? fatherTab
					: page === 'father'
						? 'Finanzas del padre'
						: page === 'home'
							? 'Resumen'
							: page === 'movements'
								? 'Movimientos'
								: page === 'investments'
									? 'Inversiones'
									: page === 'history'
										? 'Histórico'
										: 'Fondo de emergencia'}</span
			>
			<div class="topbar-right">
				{#if role === 'father'}<button class="text-button" onclick={() => switchPerspective('admin')}>Volver al administrador</button>{/if}
				<span
					class="profile-circle">{role === 'admin' ? 'A' : 'P'}</span
				>
			</div>
		</header>
		<main id="content">
			<div class="intro">
				<div>
					<p class="eyebrow">
						{page === 'father'
							? role === 'father'
								? 'USUARIO PADRE · SOLO LECTURA'
								: 'ADMINISTRADOR · CONTEXTO DEL PADRE'
							: 'UN POCO DE CLARIDAD, CADA DÍA'}
					</p>
					<h1>
						{role === 'father'
							? 'Tu resumen, sin complicaciones.'
							: titles[page]}
					</h1>
					<p class="subtitle">{subtitles[page]}</p>
				</div>
				<div class="intro-actions">
					{#if page === 'home' || page === 'movements'}<label
							class="month-picker"
							><Icon name="calendar" size={17} /><span class="sr-only"
								>Mes seleccionado</span
							><select bind:value={month}
								>{#each Object.entries(monthLabels) as [value, label]}<option
										{value}>{label}</option
									>{/each}</select
							></label
						><button class="primary" onclick={openForm}
							><Icon name="plus" size={17} /><span>Nuevo movimiento</span
							></button
						>{:else if page === 'father'}<span class="readonly-badge"
							><Icon name="shield" size={16} />{role === 'father'
								? 'Vista del padre'
								: 'Contexto del padre'}</span
						>{/if}
				</div>
			</div>
			{#if toast}<div class="toast" role="status">
					<Icon name="check" size={17} />{toast}<button
						aria-label="Cerrar aviso"
						onclick={() => (toast = '')}><Icon name="close" size={15} /></button
					>
				</div>{/if}

			{#if page === 'home'}
				<div class="metrics">
					<article class="metric">
						<span>Ingresos del mes <Icon name="down" /></span><strong
							>{money(totals.income)}</strong
						><small>Ingresos ordinarios registrados</small>
					</article>
					<article class="metric expense-metric">
						<span>Gastos del mes <Icon name="up" /></span><strong
							>{money(totals.expenses)}</strong
						><small
							>Fijos {money(totals.fixed)} · Variables {money(
								totals.variable,
							)}</small
						>
					</article>
					<article class="metric savings">
						<span>Ahorro del mes <Icon name="wallet" /></span><strong
							>{money(totals.savings)}</strong
						><small>Ingresos menos gastos · Inversión excluida</small>
					</article>
				</div>
				<div class="dashboard-grid">
					<section class="panel spending-panel">
						<div class="panel-title">
							<div>
								<h2>¿Dónde va tu dinero?</h2>
								<p>Gastos por categoría · {monthLabels[month]}</p>
							</div>
							<span class="soft-tag">Este mes</span>
						</div>
						<div class="spending-layout">
							<div class="spending-total">
								<span>Total gastado</span><strong
									>{money(totals.expenses)}</strong
								>
								<div class="mini-bars" aria-hidden="true">
									{#each spending as item, index}<i
											style={`height:${Math.max(16, (item.amount / Math.max(...spending.map((s) => s.amount))) * 100)}%;--bar-color:${['#385f50', '#658c76', '#a6bba8', '#c3a780', '#9aa6b6', '#d4d6c7', '#9982a1'][index]}`}
										></i>{/each}
								</div>
							</div>
							<div class="category-breakdown">
								{#each spending as item, index}<div>
										<span
											><i
												style={`background:${['#385f50', '#658c76', '#a6bba8', '#c3a780', '#9aa6b6', '#d4d6c7', '#9982a1'][index]}`}
											></i>{item.name}</span
										><strong>{money(item.amount)}</strong>
									</div>{/each}
							</div>
						</div>
						<div class="panel-footer">
							<span
								>Una visión de tus gastos, sin transferencias ni aportaciones.</span
							>
						</div>
					</section>
					<section class="panel saving-goal">
						<div class="panel-title">
							<div>
								<h2>Tu margen de ahorro</h2>
								<p>Un pequeño paso hacia tus objetivos</p>
							</div>
							<Icon name="chart" />
						</div>
						<div class="big-percent">
							{totals.rate ?? '—'}<span>{totals.rate !== null ? '%' : ''}</span>
						</div>
						<div class="goal-track">
							<span
								style={`width:${Math.max(0, Math.min(100, totals.rate ?? 0))}%`}
							></span><i style="left:20%"></i>
						</div>
						<div class="goal-labels">
							<span>Margen actual</span><span>Objetivo: 20 %</span>
						</div>
						<p class="goal-message">
							{totals.rate !== null && totals.rate >= 20
								? 'Este mes vas por encima de tu objetivo.'
								: 'Cada mes es una nueva oportunidad para ajustar.'}
						</p>
						<div class="contribution">
							<Icon name="chart" size={19} /><span
								>Aportado a inversión<strong>{money(totals.investment)}</strong
								></span
							>
						</div>
					</section>
				</div>
				<div class="lower-grid">
					<section class="panel">
						<div class="panel-title">
							<div>
								<h2>Últimos movimientos</h2>
								<p>Las pequeñas cosas también cuentan</p>
							</div>
							<button class="text-button" onclick={() => navigate('movements')}
								>Ver todos <Icon name="arrow" size={16} /></button
							>
						</div>
						{@render movementList(current.slice(0, 5))}
					</section>
					<div class="right-stack">
						<section class="panel emergency-mini">
							<div class="icon-heading">
								<span class="icon-tile"><Icon name="shield" /></span>
								<h2>Fondo de emergencia</h2>
							</div>
							<div class="balance-line">
								<strong>{money(emergency)}</strong><span>de 6.000,00 €</span>
							</div>
							<progress
								value={Math.max(0, emergency)}
								max="600000"
								aria-label="Objetivo del fondo de emergencia"
							></progress>
							<p>Saldo al 13 oct</p>
							<button class="text-button" onclick={() => navigate('emergency')}
								>Ver mi fondo <Icon name="arrow" size={16} /></button
							>
						</section>
						<section class="panel father-mini">
							<div class="icon-heading">
								<span class="icon-tile"><Icon name="person" /></span>
								<h2>Finanzas del padre</h2>
							</div>
							<p>
								Datos revisados hasta el <strong
									>12 de octubre</strong
								>.
							</p>
							<span class="soft-tag">Lectura tranquila, contexto separado</span
							><button class="text-button" onclick={() => navigate('father')}
								>Abrir su espacio <Icon name="arrow" size={16} /></button
							>
						</section>
					</div>
				</div>
				<section class="panel budget-panel">
					<div class="panel-title">
						<div>
							<h2>Presupuestos a tu ritmo</h2>
							<p>Límites para las categorías que quieres cuidar</p>
						</div>
						<span class="soft-tag">{monthLabels[month]}</span>
					</div>
					<div class="budget-grid">
						{#each budgets.filter((b) => b.context === 'own' && b.month === month) as budget}{@const spent =
								categorySpend(
									net,
									'own',
									month,
									budget.category,
								)}{@const status = budgetStatus(spent, budget.amount)}
							<article>
								<div>
									<strong>{budget.category}</strong><span
										class:warning={status === 'warning'}
										class:exceeded={status === 'exceeded'}
										>{status === 'exceeded'
											? 'Límite alcanzado'
											: status === 'warning'
												? 'Cerca del límite'
												: 'En buen camino'}</span
									>
								</div>
								<p>
									<strong>{money(spent)}</strong>
									<span>/ {money(budget.amount)}</span>
								</p>
								<progress
									value={spent}
									max={budget.amount}
									style={`--progress-color:${status === 'exceeded' ? '#b55547' : status === 'warning' ? '#b78955' : budget.color}`}
									aria-label={`Presupuesto de ${budget.category}`}
								></progress><small
									>{spent <= budget.amount
										? `${money(budget.amount - spent)} disponibles`
										: `${money(spent - budget.amount)} por encima`}</small
								>
							</article>{/each}
					</div>
					<BudgetEditor
						{budgets}
						context="own"
						{month}
						onsave={(category, value) =>
							updateBudget('own', month, category, value)}
					/>
				</section>
			{:else if page === 'movements'}
				{#if loanOut || loanIn || refundIn}<section class="panel" style="padding: 24px; margin-bottom: 20px">
					<h2>Dinero prestado y recuperado · {monthLabels[month]}</h2>
					<p>Prestado: {money(loanOut)} · Devuelto por tu padre: {money(loanIn)} · Reembolsos recibidos: {money(refundIn)}</p>
					<small>Estos movimientos no son ingresos ni gastos ordinarios.</small>
				</section>{/if}
				<section class="panel">
					<div class="filter-bar">
						<label class="search-input"
							><Icon name="search" size={18} /><span class="sr-only"
								>Buscar movimientos</span
							><input
								bind:value={query}
								placeholder="Buscar concepto, categoría o cuenta…"
							/></label
						><label
							><span class="sr-only">Tipo de movimiento</span><select
								class="type-filter"
								bind:value={filter}
								><option value="all">Todos los tipos</option><option
									value="expense">Gastos</option
								><option value="income">Ingresos</option><option
									value="transfer">Transferencias</option
								><option value="investment">Aportaciones</option></select
							></label
						><span class="results-count">{filtered.length} movimientos</span>
					</div>
					{@render movementList(filtered)}
					<div class="panel-footer">
						<span
							>Selecciona un movimiento para ver su detalle.</span
						>
					</div>
				</section>
			{:else if page === 'father'}
				<div class="context-notice">
					<Icon name="shield" size={19} />
					<p>
						{role === 'father'
							? 'Esta es la perspectiva del usuario padre: solo tus datos y paneles de consulta.'
							: 'Estás consultando el contexto de tu padre desde tu perspectiva de administrador.'}
						<strong
							>{role === 'father'
								? ' Solo lectura.'
								: ' Los cambios aquí afectan solo a tu padre, nunca a tus finanzas.'}</strong
						>
					</p>
				</div>
				{#if role === 'admin'}<div class="father-admin-actions">
						<button class="primary" onclick={openForm}
							>Añadir gasto del padre</button
						><button class="secondary" onclick={() => switchPerspective('father')}>Ver vista del padre</button
						><BudgetEditor
							{budgets}
							context="father"
							month={DEMO_MONTH}
							onsave={(category, value) =>
								updateBudget('father', DEMO_MONTH, category, value)}
						/>
					</div>{/if}
				<div class="tabs" role="group" aria-label="Paneles del padre">
					{#each ['Inicio', 'Gastos / Presupuestos', 'Histórico', 'Deudas'] as tab}<button
							class:active={fatherTab === tab}
							aria-pressed={fatherTab === tab}
							onclick={() => (fatherTab = tab)}>{tab}</button
						>{/each}
				</div>
				{#if fatherTab === 'Inicio'}<div class="father-grid">
						<section class="father-hero">
							<span class="soft-tag">Ciclo · 1–31 octubre</span>
							<h2 class="prudent-label">Disponible prudente</h2>
							<strong>365,50 €</strong>
							<div class="father-inline-metrics">
								<span
									>Ingresos registrados<strong
										>{money(fatherTotals.income)}</strong
									></span
								><span class="father-expense-total"
									>Gastos registrados<strong
										>{money(fatherTotals.expenses)}</strong
									></span
								>
							</div>
							<div>
								<span>Próximo cobro previsto<strong>1 noviembre</strong></span
								><span>Revisado hasta<strong>12 octubre</strong></span>
							</div>
						</section>
						<section class="panel">
							<div class="panel-title">
								<h2>Lo que viene</h2>
								<Icon name="calendar" />
							</div>
							{#each [{ name: 'Seguro del hogar', when: '20 octubre · planificado', value: '85,00 €' }, { name: 'Teléfono', when: '23 octubre · planificado', value: '25,00 €' }, { name: 'Reserva para gastos futuros', when: 'Provisión informativa', value: '50,00 €' }] as plan}<div
									class="planned-row"
								>
									<span
										><strong>{plan.name}</strong><small>{plan.when}</small
										></span
									><strong>{plan.value}</strong>
								</div>{/each}
							<div class="panel-footer">
								<span>Planificar no crea un gasto ni aparta dinero.</span>
							</div>
						</section>
					</div>
				{:else if fatherTab === 'Gastos / Presupuestos'}
					{#if !fatherAllExpenses}<FatherBudgets {movements} {budgets} />{/if}
					<section class="panel father-expense-list">
						<div class="panel-title">
							<div><h2>{fatherAllExpenses ? 'Histórico de gastos' : 'Últimos gastos'}</h2>
								<p>{fatherAllExpenses ? 'Todos los gastos registrados' : 'Los 5 gastos más recientes'}</p></div>
							<button class="text-button" onclick={() => fatherAllExpenses = !fatherAllExpenses}>{fatherAllExpenses ? 'Volver' : 'Ver histórico de gastos'}</button>
						</div>
						{@render movementList(fatherMovements.filter(m => m.kind === 'expense').slice(0, fatherAllExpenses ? undefined : 5))}
					</section>
				{:else if fatherTab === 'Histórico'}<FatherHistory {movements} />
				{:else}<Records mode="father" {role} {movements} {loans} {shared} onloans={(v) => loans = v} onshared={(v) => shared = v} />{/if}
			{:else if page === 'investments'}
				<Investments {movements} {portfolios} {platforms} {valuations}
					onportfolio={(value) => { portfolios = createPortfolio(portfolios, value, role); }}
					onplatform={(value) => { platforms = savePlatform(platforms, portfolios, value, role); }}
					oncontribute={(platformId, date, amount, account) => {
						movements = addContribution(movements, platforms, { id: crypto.randomUUID(), platformId, date, amount, account }, role);
					}}
					onvalue={(value) => { valuations = saveValuation(valuations, platforms, value, role); }} />
			{:else if page === 'history'}
				<FatherHistory movements={net} context="own" onview={(period) => {
					month = period;
					navigate('movements');
				}} />
			{:else if page === 'emergency'}
				<section class="panel emergency-detail">
					<span class="icon-tile"><Icon name="shield" size={28} /></span>
					<h2>Un poco más de tranquilidad</h2>
					<p>Saldo al 13 de octubre de 2026</p>
					<strong class="debt-number">{money(emergency)}</strong><progress
						value={Math.max(0, emergency)}
						max="600000"
						aria-label="Progreso hacia el objetivo de emergencia"
					></progress>
					<p>Objetivo: <strong>6.000,00 €</strong></p>
					<small
						>Saldo inicial: 4.200,00 € al 1 de octubre, más
						movimientos registrados.</small
					><button
						class="primary"
						onclick={() => {
							openForm();
							selectKind('transfer');
						}}
						><Icon name="movement" size={17} />Añadir transferencia</button
					>
					<p class="muted">
						Transferir dinero al fondo no crea un gasto ni un ahorro nuevo.
					</p>
				</section>
			{/if}
			
		</main>
	</div>

	<nav class="mobile-nav" aria-label="Navegación móvil">
		{#if role === 'father'}
			{#each fatherNavigation as item}
				<button
					class:active={fatherTab === item.name}
					aria-current={fatherTab === item.name ? 'page' : undefined}
					onclick={() => (fatherTab = item.name)}
					><Icon name={item.icon} size={21} /><span>{item.mobile}</span></button
				>
			{/each}
		{:else}
			{#each [{ id: 'home', name: 'Inicio', icon: 'home' }, { id: 'movements', name: 'Movimientos', icon: 'movement' }, { id: 'investments', name: 'Inversiones', icon: 'chart' }] as item}<button
					class:active={page === item.id}
					aria-current={page === item.id ? 'page' : undefined}
					onclick={() => navigate(item.id as Page)}
					><Icon name={item.icon} size={21} /><span>{item.name}</span></button
				>{/each}<button
				class:active={moreOpen ||
					['father', 'history', 'emergency'].includes(page)}
				aria-expanded={moreOpen}
				onclick={() => (moreOpen = !moreOpen)}
				><Icon name="more" size={21} /><span>Más</span></button
			>
		{/if}
	</nav>
	{#if role === 'admin' && moreOpen}<div class="mobile-more">
			<p>Más en tu espacio</p>
			<button onclick={() => navigate('history')}
				><Icon name="calendar" />Histórico</button
			><button onclick={() => navigate('emergency')}
				><Icon name="shield" />Fondo de emergencia</button
			><button onclick={() => navigate('father')}
				><Icon name="person" />Finanzas del padre
				<small>Contexto separado</small></button
			><button onclick={reset}><Icon name="reset" />Restablecer datos de prueba</button>
		</div>{/if}
</div>

<dialog
	bind:this={formDialog}
	class="entry-dialog"
	aria-labelledby="entry-title"
>
	<div class="dialog-heading">
		<div>
			<p class="eyebrow">
				{entryContext === 'father' ? 'CONTEXTO DEL PADRE' : 'MIS FINANZAS'}
			</p>
			<h2 id="entry-title">
				{editingId
					? (entryContext === 'father' ? 'Editar gasto del padre' : 'Editar gasto')
					: entryContext === 'father'
						? 'Nuevo gasto del padre'
						: 'Nuevo movimiento'}
			</h2>
		</div>
		<button
			class="icon-button"
			aria-label="Cerrar formulario"
			onclick={() => formDialog.close()}><Icon name="close" /></button
		>
	</div>
	
	<form onsubmit={save}>
		<div
			class="kind-picker"
			role="group"
			aria-label="Significado de la operación"
		>
			{#each entryContext === 'father' || editingId ? [{ value: 'expense', label: entryContext === 'father' ? 'Gasto del padre' : 'Gasto' }] : [{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }, { value: 'transfer', label: 'Transferencia' }] as option}<button
					type="button"
					class:active={kind === option.value}
					aria-pressed={kind === option.value}
					onclick={() => selectKind(option.value as typeof kind)}
					>{option.label}</button
				>{/each}
		</div>
		<label for="concept"
			>Concepto<input
				id="concept"
				bind:value={concept}
				required
				maxlength="80"
				placeholder={kind === 'expense'
					? 'Ej. Compra semanal'
					: kind === 'income'
						? 'Ej. Nómina'
						: 'Ej. Aportación al fondo'}
			/></label
		>
		<div class="form-columns">
			<label for="amount"
				>Importe (€)<input
					id="amount"
					bind:value={amount}
					type="text"
					inputmode="decimal"
					required
					placeholder="0,00"
					autocomplete="off"
				/></label
			><label for="date"
				>Fecha<input
					id="date"
					bind:value={date}
					type="date"
					min="2026-05-01"
					max="2026-10-31"
					required
				/></label
			>
		</div>
		{#if kind !== 'transfer'}<label for="category"
				>Categoría<select id="category" bind:value={category}
					>{#each kind === 'income' ? ['Trabajo', 'Otros ingresos'] : categories as value}<option
							>{value}</option
						>{/each}</select
				></label
			>{/if}<label for="account"
			>{kind === 'transfer'
				? 'Cuenta de origen'
				: kind === 'income'
					? 'Cuenta de destino'
					: 'Medio de pago'}<select id="account" bind:value={account}
				>{#each entryContext === 'father' ? ['Cuenta principal'] : kind === 'expense' ? accounts : accounts.filter((a) => a !== 'Tarjeta') as value}<option
						>{value}</option
					>{/each}</select
			></label
		>{#if kind === 'transfer'}<label for="destination"
				>Cuenta de destino<select id="destination" bind:value={destination}
					>{#each accounts.filter((a) => a !== 'Tarjeta') as value}<option
							>{value}</option
						>{/each}</select
				></label
			>
			<p class="form-hint">
				Una transferencia mueve dinero entre cuentas propias y no cambia
				ingresos, gastos ni ahorro.
			</p>{:else if kind === 'expense'}<label class="checkbox-label"
				><input type="checkbox" bind:checked={fixed} />Es un gasto fijo</label
			>{/if}
		{#if kind === 'expense' && entryContext === 'own'}
			<label class="checkbox-label"><input type="checkbox" bind:checked={isShared} />Es un gasto compartido</label>
			{#if isShared}
				<label>Mi parte (€)<input type="text" inputmode="decimal" bind:value={ownShare} required placeholder="0,00" /></label>
				<p class="form-hint">Total pagado: {formTotal === null ? '—' : money(formTotal)} · Te deben en total: {formTotal !== null && ownShareCents !== null && ownShareCents <= formTotal ? money(formTotal - ownShareCents) : '—'}</p>
				{#if editingId && shared.find(s => s.expenseId === editingId)}
					{@const received = shared.find(s => s.expenseId === editingId)!.payments.reduce((sum, payment) => sum + payment.amount, 0)}
					<p class="form-hint">Recibido: {money(received)} · Pendiente: {formTotal !== null && ownShareCents !== null && formTotal - ownShareCents >= received ? money(formTotal - ownShareCents - received) : '—'}</p>
				{:else}<p class="form-hint">Lo pendiente disminuye al registrar cada reembolso.</p>{/if}
			{/if}
		{/if}{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<div class="dialog-actions">
			<button class="secondary" type="button" onclick={() => formDialog.close()}
				>Cancelar</button
			><button class="primary" type="submit"
				>{editingId ? 'Guardar cambios' : 'Añadir movimiento'}
				<Icon name="arrow" size={16} /></button
			>
		</div>
	</form>
</dialog>

<dialog
	bind:this={detailDialog}
	class="entry-dialog detail-dialog"
	aria-labelledby="detail-title"
>
	{#if selected}<div class="dialog-heading">
			<div>
				<p class="eyebrow">
					{selected.context === 'own' ? 'MIS FINANZAS' : 'CONTEXTO DEL PADRE'}
				</p>
				<h2 id="detail-title">{selected.concept}</h2>
			</div>
			<button
				class="icon-button"
				aria-label="Cerrar detalle"
				onclick={() => detailDialog.close()}><Icon name="close" /></button
			>
		</div>
		<strong class="detail-amount" class:expense-amount={selected.kind === 'expense'}>{selected.kind === 'expense' ? '−' : ''}{money(selected.amount)}</strong>
		<dl>
			<div>
				<dt>Tipo</dt>
				<dd>{labels[selected.kind]}</dd>
			</div>
			<div>
				<dt>Fecha</dt>
				<dd>{dateLabel(selected.date)} 2026</dd>
			</div>
			<div>
				<dt>Categoría</dt>
				<dd>{selected.category}</dd>
			</div>
			<div>
				<dt>Cuenta / medio</dt>
				<dd>{selected.account}</dd>
			</div>
			{#if selected.destination}<div>
					<dt>Destino</dt>
					<dd>{selected.destination}</dd>
				</div>{/if}{#if selected.kind === 'expense'}<div>
					<dt>Clasificación</dt>
					<dd>{selected.fixed ? 'Fijo' : 'Variable'}</dd>
				</div>{/if}
		</dl>
		<p class="form-hint">
			{selected.kind === 'transfer'
				? 'Movimiento interno: no afecta al ahorro.'
				: selected.kind === 'investment'
					? 'Aportación a inversión: no se contabiliza como gasto.'
					: selected.account === 'Tarjeta'
						? 'Compra contabilizada una sola vez. La liquidación todavía no está disponible.'
						: ''}
		</p>
		{#if selectedShared}
			{@const received = selectedShared.payments.reduce((sum, payment) => sum + payment.amount, 0)}
			<section aria-label="Gasto compartido">
				<h3>Gasto compartido</h3>
				<p>Tu parte: {money(selected.amount - selectedShared.expected)} · Recibido: {money(received)} · Pendiente: {money(selectedShared.expected - received)}</p>
				<p class="form-hint">Gasto neto actual: {money(selected.amount - received)}. Se actualiza al recibir reembolsos.</p>
				{#each selectedShared.payments as payment (payment.id)}<p>Reembolso · {payment.date} · {money(payment.amount)}</p>{/each}
				{#if selectedShared.expected > received && !refundOpen}<button class="secondary" onclick={() => { refundOpen = true; refundDate = selected!.date; }}>Registrar reembolso</button>{/if}
				{#if refundOpen}<form onsubmit={saveRefund}>
					<label>Importe recibido (€)<input bind:value={refundAmount} inputmode="decimal" required /></label>
					<label>Fecha de recepción<input type="date" bind:value={refundDate} required /></label>
					<p class="form-hint">Cuenta principal · Se imputa al gasto original.</p>
					{#if refundError}<p class="form-error" role="alert">{refundError}</p>{/if}
					<div class="dialog-actions"><button class="secondary" type="button" onclick={() => refundOpen = false}>Cancelar</button><button class="primary" type="submit">Guardar reembolso</button></div>
				</form>{/if}
			</section>
		{/if}
		{#if role === 'admin' && selected.kind === 'expense'}<button
				class="primary full-width"
				onclick={() => selected && editExpense(selected)}
				>Editar gasto</button
			>{/if}
		<button class="secondary full-width" onclick={() => detailDialog.close()}
			>Volver</button
		>{/if}
</dialog>

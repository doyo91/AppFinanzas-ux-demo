<script lang="ts">
 import { money, parseAmount, type Movement } from '#lib/demo/model.ts';
 import { addLoanEvent, addShared, addRefund, loanBalance, type LoanEvent, type Shared } from '#lib/demo/shared.ts';
 let { mode, role, movements, loans, shared, onloans, onshared }: {
  mode: 'father' | 'own'; role: 'admin' | 'father'; movements: Movement[]; loans: LoanEvent[]; shared: Shared[];
  onloans: (v: LoanEvent[]) => void; onshared: (v: Shared[]) => void;
 } = $props();
 let action = $state<'loan' | 'repayment' | 'shared' | 'refund' | null>(null);
 let amount = $state(''); let date = $state('2026-10-13'); let expenseId = $state(''); let error = $state('');
 let available = $derived(movements.filter(m => m.context === 'own' && m.kind === 'expense' && !shared.some(s => s.expenseId === m.id)));
 let balance = $derived(loanBalance(loans));
 function open(next: typeof action, id = '') { action = next; amount = ''; date = '2026-10-13'; expenseId = id || available[0]?.id || ''; error = ''; }
 function save(e: SubmitEvent) {
  e.preventDefault(); if (role !== 'admin' || !action) return;
  const value = parseAmount(amount);
  if (value === null) { error = 'Introduce un importe positivo válido.'; return; }
  try {
   if (action === 'loan' || action === 'repayment') onloans(addLoanEvent(loans, {id: crypto.randomUUID(), type: action, date, amount: value}));
   else if (action === 'shared') onshared(addShared(shared, movements, expenseId, value));
   else onshared(addRefund(shared, movements, expenseId, {id: crypto.randomUUID(), date, amount: value}));
   action = null; error = '';
  } catch (e) { error = e instanceof Error ? e.message : 'No se ha podido guardar.'; }
 }
 const fmt = (date: string) => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
</script>
{#if mode === 'father'}
 <section class="panel records-panel">
  <div class="panel-title"><div><h2>Deuda contigo</h2><p>Préstamos y devoluciones</p></div></div>
  <p>Saldo pendiente</p><strong class="debt-number">{money(balance)}</strong>
  {#if role === 'admin'}<div class="investment-actions"><button class="primary" onclick={() => open('loan')}>Prestar dinero</button><button class="secondary" disabled={balance <= 0} onclick={() => open('repayment')}>Registrar devolución</button></div>{/if}
  <p class="form-hint">Cuenta principal · No son gastos ni ingresos ordinarios.</p>
  {#each loans.toSorted((a,b) => b.date.localeCompare(a.date)) as item (item.id)}
   <div class="record-row"><span>{item.type === 'loan' ? 'Préstamo' : 'Devolución'} <small>· {fmt(item.date)}</small></span><strong>{item.type === 'loan' ? '+' : '−'}{money(item.amount)}</strong></div>
  {:else}<p>No hay préstamos registrados.</p>{/each}
  <p class="form-hint">Crédito revolving: saldo desconocido.</p>
 </section>
{:else}
 <section class="panel records-panel">
  <div class="panel-title"><div><h2>Gastos compartidos</h2><p>Controla lo que has adelantado y lo que te falta por recibir.</p></div></div>
  <button class="secondary" disabled={available.length === 0} onclick={() => open('shared')}>Añadir gasto compartido</button>
  {#each shared as item (item.expenseId)}
   {@const expense = movements.find(m => m.id === item.expenseId)}
   {@const received = item.payments.reduce((n,p) => n + p.amount, 0)}
   {#if expense}<article class="shared-item">
    <h3>{expense.concept} · {fmt(expense.date)}</h3>
    <p>Pagado {money(expense.amount)} · Recibido {money(received)} · Pendiente {money(item.expected - received)}</p>
    <p>Gasto neto actual: <strong>{money(expense.amount - received)}</strong></p>
    {#each item.payments.toSorted((a,b) => b.date.localeCompare(a.date)) as payment (payment.id)}<div class="record-row"><span>Reembolso · {fmt(payment.date)}</span><strong>+{money(payment.amount)}</strong></div>{/each}
    {#if received < item.expected}<button class="text-button" onclick={() => open('refund', item.expenseId)}>Registrar reembolso</button>{/if}
   </article>{/if}
  {:else}<p>Todavía no hay gastos compartidos.</p>{/each}
 </section>
{/if}
{#if action}
 <section class="panel records-panel" aria-label="Registrar operación">
  <h2>{action === 'loan' ? 'Prestar dinero a tu padre' : action === 'repayment' ? 'Registrar devolución de tu padre' : action === 'shared' ? 'Añadir gasto compartido' : 'Registrar reembolso'}</h2>
  <form onsubmit={save}>
   {#if action === 'shared'}<label>Gasto pagado<select bind:value={expenseId} required>{#each available as expense}<option value={expense.id}>{expense.concept} · {fmt(expense.date)} · {money(expense.amount)}</option>{/each}</select></label>{/if}
   <div class="form-columns"><label>{action === 'shared' ? 'Total que esperas recuperar (€)' : 'Importe (€)'}<input bind:value={amount} inputmode="decimal" required placeholder="0,00" /></label>
   {#if action !== 'shared'}<label>Fecha<input type="date" bind:value={date} required /></label>{/if}</div>
   {#if action !== 'shared'}<p class="form-hint">Cuenta principal{action === 'refund' ? ' · El gasto se actualiza en su mes original.' : ' · No afecta al gasto ni al ahorro.'}</p>{/if}
   {#if error}<p class="form-error" role="alert">{error}</p>{/if}
   <div class="dialog-actions"><button class="secondary" type="button" onclick={() => action = null}>Cancelar</button><button class="primary" type="submit">Guardar</button></div>
  </form>
 </section>
{/if}
<style>
 .records-panel { padding: 24px; margin-top: 20px; }
 .records-panel form { display: grid; gap: 16px; margin-top: 18px; }
 .records-panel label { display: grid; gap: 8px; }
 .records-panel input, .records-panel select { width: 100%; padding: 12px; border: 1px solid #cbd9c0; border-radius: 8px; font: inherit; }
 .record-row { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid #edf0e9; }
 .shared-item { padding:16px 0; border-bottom:1px solid #edf0e9; }
 .shared-item p { margin:8px 0; }
</style>

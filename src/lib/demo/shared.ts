import type { Movement } from './model.ts';
export type Payment = { id: string; date: string; amount: number };
export type LoanEvent = Payment & { type: 'loan' | 'repayment' };
export type Shared = { expenseId: string; expected: number; payments: Payment[] };
function valid(amount: number) { return Number.isSafeInteger(amount) && amount > 0 && amount <= 100000000; }
function validDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
export function loanBalance(events: LoanEvent[]) { return events.reduce((sum, e) => sum + (e.type === 'loan' ? e.amount : -e.amount), 0); }
export function addLoanEvent(events: LoanEvent[], event: LoanEvent): LoanEvent[] {
 if (!valid(event.amount) || !validDate(event.date) || events.some(e => e.id === event.id) || !['loan','repayment'].includes(event.type)) throw new Error('Datos de préstamo no válidos.');
 const next = [...events, event];
 let balance = 0;
 for (const e of next.toSorted((a,b) => a.date.localeCompare(b.date) || (a.type === b.type ? 0 : a.type === 'loan' ? -1 : 1))) {
  balance += e.type === 'loan' ? e.amount : -e.amount;
  if (balance < 0) throw new Error('La devolución supera lo prestado hasta esa fecha.');
 }
 return next;
}
export function addShared(items: Shared[], movements: Movement[], expenseId: string, expected: number): Shared[] {
 const expense = movements.find(m => m.id === expenseId && m.context === 'own' && m.kind === 'expense');
 if (!expense || !valid(expected) || expected > expense.amount || items.some(s => s.expenseId === expenseId)) throw new Error('El importe esperado debe ser positivo y no superar el gasto.');
 return [...items, {expenseId, expected, payments: []}];
}
export function addRefund(items: Shared[], movements: Movement[], expenseId: string, payment: Payment): Shared[] {
 const shared = items.find(s => s.expenseId === expenseId);
 const expense = movements.find(m => m.id === expenseId && m.context === 'own' && m.kind === 'expense');
 if (!shared || !expense || !valid(payment.amount) || !validDate(payment.date) || payment.date < expense.date || shared.payments.some(p => p.id === payment.id)) throw new Error('Comprueba el importe y la fecha del reembolso.');
 if (shared.payments.reduce((n,p) => n + p.amount, 0) + payment.amount > shared.expected) throw new Error('El reembolso supera el importe pendiente.');
 return items.map(s => s.expenseId === expenseId ? {...s, payments: [...s.payments, payment]} : s);
}
export function netMovements(movements: Movement[], shared: Shared[]): Movement[] {
 return movements.map(m => { const s = shared.find(x => x.expenseId === m.id); return s ? {...m, amount: m.amount - s.payments.reduce((n,p) => n + p.amount, 0)} : m; });
}

export function updateShared(items: Shared[], expense: Movement, expected: number | null): Shared[] {
 const existing = items.find(s => s.expenseId === expense.id);
 const payments = existing?.payments ?? [];
 const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
 if (expense.context !== 'own' || expense.kind !== 'expense') throw new Error('El gasto compartido no es válido.');
 if (payments.some(payment => payment.date < expense.date)) throw new Error('La fecha del gasto no puede ser posterior a un reembolso registrado.');
 if (expected === null) {
  if (received > 0) throw new Error('No se puede quitar el gasto compartido mientras tenga reembolsos.');
  return items.filter(s => s.expenseId !== expense.id);
 }
 if (!valid(expected) || expected > expense.amount || expected < received) throw new Error('Lo que esperas recuperar debe ser mayor que cero, no superar el gasto ni ser inferior a lo ya recibido.');
 const next = { expenseId: expense.id, expected, payments };
 return existing ? items.map(s => s.expenseId === expense.id ? next : s) : [...items, next];
}

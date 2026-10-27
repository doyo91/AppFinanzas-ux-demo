import test from 'node:test';
import assert from 'node:assert/strict';
import { addLoanEvent, loanBalance, addShared, addRefund, netMovements } from '../src/lib/demo/shared.ts';
import { summarize } from '../src/lib/demo/model.ts';
const expense = { id:'x', context:'own', date:'2026-01-10', amount:12000, kind:'expense', category:'Ocio', concept:'Comida', account:'Tarjeta', fixed:false };
test('préstamo y devolución no alteran gastos y no permiten deuda negativa', () => {
 let events = addLoanEvent([], {id:'a',type:'loan',date:'2026-01-05',amount:20000});
 events = addLoanEvent(events, {id:'b',type:'repayment',date:'2026-02-01',amount:5000});
 assert.equal(loanBalance(events),15000);
 assert.throws(() => addLoanEvent(events,{id:'c',type:'repayment',date:'2026-01-01',amount:1}));
 assert.throws(() => addLoanEvent(events,{id:'c',type:'repayment',date:'2026-02-01',amount:15001}));
});
test('reembolsos de otro mes reducen el gasto original sin generar ingresos', () => {
 let s=addShared([], [expense], 'x', 9000);
 s=addRefund(s,[expense],'x',{id:'r1',date:'2026-01-15',amount:3000});
 s=addRefund(s,[expense],'x',{id:'r2',date:'2026-02-15',amount:6000});
 const net=netMovements([expense],s);
 assert.equal(summarize(net,'own','2026-01').expenses,3000);
 assert.equal(summarize(net,'own','2026-02').income,0);
 assert.throws(()=>addRefund(s,[expense],'x',{id:'r3',date:'2026-02-16',amount:1}));
 assert.throws(()=>addRefund(addShared([], [expense], 'x', 9000),[expense],'x',{id:'r',date:'2026-01-01',amount:1}));
});

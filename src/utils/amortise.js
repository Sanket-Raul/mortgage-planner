/**
 * Core amortisation engine.
 * Supports variable rate schedules, payment overrides, extra repayments,
 * and a growing offset account (offsetMonthlyAdd).
 */
export function amortise(
  principal,
  annualRate,
  basePayment,
  initialOffset = 0,
  {
    paymentSchedule = [],   // [{month, payment}] payment overrides
    rateSchedule    = [],   // [{month, rate}]    rate changes
    extraMonthly    = 0,    // fixed extra repayment each month
    offsetMonthlyAdd= 0,    // monthly contribution to offset account
    maxMonths       = 720,
  } = {}
) {
  let balance       = principal;
  let rate          = annualRate;
  let payment       = basePayment;
  let totalInterest = 0;
  const months      = [];

  for (let m = 1; m <= maxMonths; m++) {
    // Apply any scheduled rate changes
    const rChange = rateSchedule.find(r => r.month === m);
    if (rChange) rate = rChange.rate;

    // Apply any scheduled payment overrides
    const pChange = paymentSchedule.find(p => p.month === m);
    if (pChange) payment = pChange.payment;

    // Offset grows each month
    const offset = Math.min(initialOffset + offsetMonthlyAdd * m, balance);

    const mr        = rate / 100 / 12;
    const effective = Math.max(0, balance - offset);
    const interest  = effective * mr;
    const totalPay  = payment + extraMonthly;

    if (interest >= totalPay) break; // negative amortisation guard

    const principalPaid = totalPay - interest;
    totalInterest += interest;
    balance       -= principalPaid;

    months.push({
      month: m,
      balance:       Math.max(0, balance),
      totalInterest,
      offset,
      interest,
      principalPaid,
    });

    if (balance <= 0) break;
  }

  return { months, totalInterest, termMonths: months.length };
}

// ── Formatting helpers ──────────────────────────────────────────────────────
export const fmt$ = n => `$${Math.abs(Math.round(n)).toLocaleString()}`;
export const fmtK = n => `$${(Math.abs(n) / 1000).toFixed(1)}k`;
export const fmtDur = m => {
  const y = Math.floor(m / 12), mo = m % 12;
  return mo === 0 ? `${y}y` : `${y}y ${mo}m`;
};

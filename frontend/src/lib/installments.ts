export function installmentAmounts(
  total: number,
  count: number,
  depositPercent: number,
): number[] {
  if (!Number.isSafeInteger(total) || total <= 0)
    throw new Error("Total must be a positive whole naira amount");
  if (!Number.isInteger(count) || count < 2 || count > 12)
    throw new Error("Select 2–12 installments");
  if (
    !Number.isFinite(depositPercent) ||
    depositPercent < 0 ||
    depositPercent > 100
  )
    throw new Error("Deposit percent must be 0–100");
  const deposit = Math.round((total * depositPercent) / 100);
  const balance = total - deposit;
  const remainingParts = count - 1;
  const each = Math.floor(balance / remainingParts);
  const amounts = [deposit, ...Array(remainingParts).fill(each)];
  amounts[amounts.length - 1] += balance - each * remainingParts;
  return amounts;
}

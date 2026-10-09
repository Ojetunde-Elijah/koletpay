import { Wallet, LedgerEntry, Withdrawal } from '../models.js';
import { badRequest, isDuplicateKey, paymentRef, randomDigits } from '../utils.js';
import { config } from '../config.js';

export async function createWallet(business) {
  for (let i = 0; i < 8; i++) {
    try {
      return await Wallet.create({
        businessId: business._id,
        accountNumber: `9${randomDigits(9)}`,
        accountName: `KOLETPAY/${business.name}`.toUpperCase().slice(0, 60),
        provider: config.paymentsMode === 'simulated' ? 'simulated' : 'live',
      });
    } catch (e) {
      if (!isDuplicateKey(e) || !String(e.message).includes('accountNumber')) throw e;
    }
  }
  throw new Error('Could not allocate a virtual account number');
}

/** Credit a wallet. Idempotent per `reference`: replaying the same reference never credits twice. */
export async function credit(wallet, amount, { reference, description, invoiceNumber = '', customerName = '' }) {
  try {
    const entry = await LedgerEntry.create({
      businessId: wallet.businessId, walletId: wallet._id, type: 'CREDIT', amount, reference, description, invoiceNumber, customerName,
    });
    const updated = await Wallet.findOneAndUpdate({ _id: wallet._id }, { $inc: { balance: amount, totalIn: amount } }, { new: true });
    entry.balanceAfter = updated.balance;
    await entry.save();
    return { wallet: updated, entry, duplicate: false };
  } catch (e) {
    if (isDuplicateKey(e)) return { wallet, entry: await LedgerEntry.findOne({ reference }), duplicate: true };
    throw e;
  }
}

/** Debit only if the balance covers it, in a single atomic update. */
export async function debit(wallet, amount, { reference, description }) {
  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, balance: { $gte: amount } },
    { $inc: { balance: -amount, totalOut: amount } },
    { new: true },
  );
  if (!updated) throw badRequest('Insufficient balance in your KoletPay wallet', 'INSUFFICIENT_FUNDS');
  const entry = await LedgerEntry.create({
    businessId: wallet.businessId, walletId: wallet._id, type: 'DEBIT', amount, reference, description, balanceAfter: updated.balance,
  });
  return { wallet: updated, entry };
}

export async function withdraw(wallet, { amount, bankName, accountNumber, accountName }) {
  const reference = paymentRef('WD');
  const { wallet: updated } = await debit(wallet, amount, {
    reference, description: `Withdrawal to ${bankName} ${accountNumber.slice(-4).padStart(accountNumber.length, '•')}`,
  });
  try {
    const w = await Withdrawal.create({
      businessId: wallet.businessId, amount, bankName, accountNumber, accountName, reference,
      // Simulated mode completes instantly; with a real payout provider this stays PENDING until its webhook.
      status: config.paymentsMode === 'simulated' ? 'COMPLETED' : 'PENDING',
    });
    return { wallet: updated, withdrawal: w };
  } catch (e) {
    await credit(updated, amount, { reference: `${reference}-REVERSAL`, description: 'Withdrawal reversed' });
    throw e;
  }
}

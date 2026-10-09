import { Business, Customer, Invoice, PayLink, SettlementClaim, Wallet } from '../models.js';
import { config } from '../config.js';
import { conflict, lagosDate, paymentRef, notFound, isDuplicateKey } from '../utils.js';
import { credit } from './wallet.js';
import { createInvoice } from './invoices.js';

/**
 * GATEWAY STEP: in PAYMENTS_MODE=simulated the payment "succeeds" instantly and no real money moves.
 * To go live, replace this with a real provider flow (initialise a checkout, then settle from the
 * provider's signed webhook). Everything after this step stays the same.
 */
async function confirmWithGateway({ reference }) {
  if (config.paymentsMode === 'simulated') return { ok: true, reference };
  throw conflict('Live payments are not connected yet', 'GATEWAY_NOT_CONFIGURED');
}

export async function settleLink(link, payer) {
  // 1. Claim the link. The unique index on SettlementClaim means only one request can ever win.
  try { await SettlementClaim.create({ linkId: link._id }); } catch (e) {
    if (isDuplicateKey(e)) throw conflict('This payment link is no longer available', 'LINK_UNAVAILABLE');
    throw e;
  }
  const releaseClaim = () => SettlementClaim.deleteOne({ linkId: link._id }).catch(() => {});
  const claimed = await PayLink.findOneAndUpdate(
    { _id: link._id, status: 'ACTIVE', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $set: { status: 'PROCESSING' } }, { new: true },
  );
  if (!claimed) { await releaseClaim(); throw conflict('This payment link is no longer available', 'LINK_UNAVAILABLE'); }

  let createdInvoice = null;
  let recorded = false;
  try {
    const business = await Business.findById(claimed.businessId);
    const wallet = await Wallet.findOne({ businessId: claimed.businessId });
    if (!business || !wallet) throw notFound('This business is not available');

    const details = {
      name: payer.name, phone: payer.phone, whatsapp: payer.whatsapp || payer.phone,
      email: payer.email, address: payer.address, location: payer.address,
    };

    // 2. Store what the customer filled in.
    let invoice = null;
    let customer;
    if (claimed.invoiceNumber) {
      invoice = await Invoice.findOne({ businessId: claimed.businessId, number: claimed.invoiceNumber });
      if (!invoice) throw notFound('Invoice not found');
      // Keep the name the business typed; refresh the contact details the customer just gave us.
      const { name: _ignored, ...contact } = details;
      customer = await Customer.findOneAndUpdate({ _id: invoice.customerId, businessId: claimed.businessId }, { $set: contact }, { new: true });
    } else {
      customer = await Customer.findOneAndUpdate(
        { businessId: claimed.businessId, phone: payer.phone },
        { $set: details, $setOnInsert: { source: 'payment_link', contact: 'WhatsApp', joinedAt: lagosDate(), project: claimed.title } },
        { upsert: true, new: true },
      );
    }

    // 3. Standalone link: create the invoice the customer is paying.
    if (!invoice) {
      const items = claimed.items.length
        ? claimed.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
        : [{ description: claimed.title, quantity: 1, unitPrice: claimed.amount }];
      invoice = createdInvoice = await createInvoice(claimed.businessId, {
        customerId: customer._id, dueAt: lagosDate(), items, notes: claimed.description, source: 'payment_link',
      });
    }

    const amount = claimed.amount;
    if (amount > invoice.total - invoice.paidTotal) throw conflict('This amount is more than the balance on the invoice', 'OVERPAYMENT');

    // 4. Gateway confirmation.
    const reference = paymentRef('KP');
    await confirmWithGateway({ reference });

    // 5. Record on the invoice (the paidTotal guard prevents overpayment even under races).
    const updated = await Invoice.findOneAndUpdate(
      { _id: invoice._id, paidTotal: { $lte: invoice.total - amount } },
      { $push: { payments: { id: reference, amount, date: lagosDate(), method: `KoletPay – ${payer.method}`, reference, channel: 'koletpay', payerName: payer.name } }, $inc: { paidTotal: amount } },
      { new: true },
    );
    if (!updated) throw conflict('This invoice has already been paid', 'OVERPAYMENT');
    recorded = true;

    // 6. Credit the business's KoletPay virtual account (idempotent per reference).
    let credited = false;
    for (let i = 0; i < 3 && !credited; i++) {
      try {
        await credit(wallet, amount, { reference: `CR-${reference}`, description: `${claimed.title} — ${customer.name}`, invoiceNumber: updated.number, customerName: customer.name });
        credited = true;
      } catch (e) { console.error(`Wallet credit attempt ${i + 1} failed for ${reference}:`, e.message); }
    }
    if (!credited) console.error(`RECONCILE: payment ${reference} recorded but wallet credit failed`);

    // 7. Close the link.
    await PayLink.updateOne({ _id: claimed._id }, { $set: {
      status: 'PAID', paidAt: new Date(), reference, invoiceNumber: updated.number, customerId: String(customer._id), customerName: customer.name,
    } });

    return {
      reference, amount, method: payer.method, invoiceNumber: updated.number, businessName: business.name,
      customerName: customer.name, paidAt: new Date().toISOString(), title: claimed.title,
    };
  } catch (err) {
    if (!recorded) {
      if (createdInvoice) await Invoice.deleteOne({ _id: createdInvoice._id }).catch(() => {});
      await PayLink.updateOne({ _id: claimed._id, status: 'PROCESSING' }, { $set: { status: 'ACTIVE' } }).catch(() => {});
      await releaseClaim();
    }
    throw err;
  }
}

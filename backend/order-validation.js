'use strict';

const content = require('./content.json');

function validateOrder(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Submission data has an invalid format.' };
  }

  const customer = {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    address: String(input.address || '').trim()
  };
  const quantity = typeof input.quantity === 'number' ||
    (typeof input.quantity === 'string' && /^\d+$/.test(input.quantity))
    ? Number(input.quantity) : NaN;

  if (!customer.name || !customer.phone || !customer.email || !customer.address) {
    return { error: 'Please provide your name, phone, email, and shipping address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return { error: 'Please enter a valid contact email.' };
  }
  if (!/^1[3-9]\d{9}$/.test(customer.phone)) {
    return { error: 'Please enter a valid phone number.' };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: 'Purchase quantity must be between 1 and 99.' };
  }
  if (Object.values(customer).some(value => value.length > 120)) {
    return { error: 'Submission is too long. Please shorten it and try again.' };
  }

  const product = content.products.find(candidate => candidate.id === input.productId);
  if (!product || product.salesMode !== 'preorder' || !product.presale?.enabled) {
    return { error: 'This product is not available for deposit orders.' };
  }
  const unitAmountCents = product.presale.depositCents;
  if (!Number.isSafeInteger(unitAmountCents) || unitAmountCents <= 0 ||
      !Number.isSafeInteger(unitAmountCents * quantity)) {
    return { error: 'Product pricing is unavailable. Please contact support.' };
  }

  return {
    customer,
    quantity,
    product: {
      id: product.id,
      name: `${product.name} reservation deposit`,
      price: `RMB ${(unitAmountCents / 100).toFixed(2)}`,
      deposit: `Reference price: ${product.presale.price}`,
      unitAmountCents,
      currency: 'CNY'
    }
  };
}

module.exports = { validateOrder };

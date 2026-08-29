'use strict';

const PRODUCT_SLUGS = ['x1-skin', 'x1-vest', 'x1-studio'];
const SALES_MODES = ['preorder', 'inquiry', 'waitlist'];

let products = [];
let activeIndex = 0;
let currentOrderId = '';

const byId = id => document.getElementById(id);
const selector = byId('productSelector');
const preorderForm = byId('preorderForm');
const inquiryForm = byId('inquiryForm');

function setHidden(element, hidden) {
  element?.classList.toggle('hidden', hidden);
}

function formatMoney(value) {
  return `RMB ${Math.round(value).toLocaleString('en-US')}`;
}

function moneyValue(label) {
  const match = String(label || '').replace(/,/g, '').match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function requestedProductIndex() {
  const value = new URLSearchParams(location.search).get('product');
  if (!value) return 0;
  const slugIndex = PRODUCT_SLUGS.indexOf(value.toLowerCase());
  if (slugIndex >= 0) return slugIndex;
  const numericIndex = Number(value);
  return Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < PRODUCT_SLUGS.length ? numericIndex : 0;
}

function renderSelector() {
  const labels = ['Pay reservation deposit', 'Request a demo', 'Apply for a trial'];
  selector.innerHTML = products.map((product, index) => `
    <button class="product-choice" type="button" role="tab" aria-selected="${index === activeIndex}" data-product-index="${index}">
      <span class="choice-copy">
        <small>0${index + 1} / ${product.stage}</small>
        <strong>${product.name}</strong>
        <span class="choice-subtitle">${product.eyebrow}</span>
      </span>
      <span class="choice-status">${labels[index]}</span>
    </button>
  `).join('');
}

function renderProduct(index, updateUrl = true) {
  const product = products[index];
  if (!product) return;
  activeIndex = index;

  selector.querySelectorAll('[data-product-index]').forEach((button, buttonIndex) => {
    button.setAttribute('aria-selected', String(buttonIndex === index));
  });

  byId('productImage').src = product.image;
  byId('productImage').alt = product.alt;
  byId('productStage').textContent = product.stage;
  byId('productIndex').textContent = `PRODUCT 0${index + 1}`;
  byId('productEyebrow').textContent = product.eyebrow;
  byId('productName').textContent = product.name;
  byId('productDescription').textContent = product.description;
  byId('productSpecs').innerHTML = product.specs.map(([label, value]) => `
    <div><dt>${label}</dt><dd>${value}</dd></div>
  `).join('');
  byId('deliveryTitle').textContent = product.presale?.note || (index === 2 ? 'Trial timing to be confirmed' : 'Delivery schedule to be confirmed');

  resetPanels();
  if (SALES_MODES[index] === 'preorder') renderPreorder(product);
  else renderInquiry(product, SALES_MODES[index]);

  if (updateUrl) {
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('product', PRODUCT_SLUGS[index]);
    history.replaceState(null, '', nextUrl);
  }
  window.lucide?.createIcons();
}

function resetPanels() {
  setHidden(byId('panelLoading'), true);
  setHidden(byId('panelError'), true);
  setHidden(byId('preorderPanel'), true);
  setHidden(byId('inquiryPanel'), true);
  setHidden(byId('preorderFormView'), false);
  setHidden(byId('paymentView'), true);
  setHidden(inquiryForm, false);
  setHidden(byId('inquirySuccess'), true);
  byId('preorderError').textContent = '';
  byId('inquiryError').textContent = '';
}

function renderPreorder(product) {
  setHidden(byId('preorderPanel'), false);
  byId('panelProductName').textContent = product.name;
  byId('panelPrice').textContent = product.presale.price;
  byId('depositAmount').textContent = `${product.presale.deposit} / unit`;
  preorderForm.reset();
  byId('preorderQuantity').value = '1';
  updateTotals();
}

function renderInquiry(product, mode) {
  setHidden(byId('inquiryPanel'), false);
  const isWaitlist = mode === 'waitlist';
  byId('inquiryKicker').textContent = isWaitlist ? 'DEVELOPER TRIAL' : 'ENTERPRISE PURCHASING';
  byId('inquiryTitle').textContent = isWaitlist ? 'Join the trial waitlist' : 'Request a demo and quote';
  byId('inquiryProductName').textContent = product.name;
  byId('inquiryPrice').textContent = isWaitlist ? 'Not yet available' : product.presale?.price || 'Project-based pricing';
  byId('inquiryPriceLabel').textContent = isWaitlist ? 'Product status' : 'Reference price';
  byId('inquiryLead').textContent = isWaitlist
    ? 'Tell us about your development direction and plan. We will contact you when trial capacity becomes available.'
    : 'Final pricing for professional equipment depends on quantity, SDK integration, and delivery support. Our team will confirm the demonstration and purchasing plan after submission.';
  byId('quantityLabel').textContent = isWaitlist ? 'Estimated trial-device quantity' : 'Estimated quantity';
  inquiryForm.querySelector('[data-submit-text]').textContent = isWaitlist ? 'Submit trial application' : 'Submit purchasing request';
  inquiryForm.reset();
  inquiryForm.elements.quantity.value = '1';
}

function updateTotals() {
  const product = products[activeIndex];
  if (!product) return;
  const quantity = Math.max(1, Math.min(99, Number(byId('preorderQuantity').value) || 1));
  byId('preorderQuantity').value = String(quantity);
  byId('orderTotal').textContent = formatMoney(moneyValue(product.presale.price) * quantity);
  byId('payableTotal').textContent = formatMoney(moneyValue(product.presale.deposit) * quantity);
}

function setSubmitting(form, submitting) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = submitting;
  setHidden(button.querySelector('svg'), submitting);
  setHidden(button.querySelector('.button-loader'), !submitting);
}

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.message || 'Submission failed. Please try again later.');
  return result;
}

async function submitPreorder(event) {
  event.preventDefault();
  const product = products[activeIndex];
  const error = byId('preorderError');
  error.textContent = '';

  if (!preorderForm.reportValidity()) return;
  const form = new FormData(preorderForm);
  const quantity = Number(form.get('quantity'));
  const depositTotal = moneyValue(product.presale.deposit) * quantity;

  const payload = {
    name: form.get('name'),
    phone: form.get('phone'),
    email: form.get('email'),
    address: form.get('address'),
    quantity,
    website: form.get('website'),
    productName: `${product.name} reservation deposit`,
    productPrice: product.presale.deposit,
    productDeposit: `Reference price: ${product.presale.price}`,
    paymentUrl: product.presale.paymentUrl
  };

  setSubmitting(preorderForm, true);
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await parseResponse(response);
    currentOrderId = result.id || '';
    byId('paymentAmount').textContent = formatMoney(depositTotal);
    byId('paymentOrderId').textContent = currentOrderId || 'Generating order ID';
    setHidden(byId('preorderFormView'), true);
    setHidden(byId('paymentView'), false);
    byId('paymentView').focus?.();
  } catch (submitError) {
    error.textContent = submitError.message;
  } finally {
    setSubmitting(preorderForm, false);
  }
}

async function submitInquiry(event) {
  event.preventDefault();
  const product = products[activeIndex];
  const mode = SALES_MODES[activeIndex];
  const error = byId('inquiryError');
  error.textContent = '';

  if (!inquiryForm.reportValidity()) return;
  const form = new FormData(inquiryForm);
  const topic = mode === 'waitlist' ? `${product.name} trial application` : `${product.name} enterprise purchasing`;
  const details = [
    `Product: ${product.name}`,
    `Estimated quantity: ${form.get('quantity') || 1}`,
    form.get('phone') ? `Phone: ${form.get('phone')}` : '',
    '',
    String(form.get('message') || '').trim()
  ].filter((line, index) => line || index === 3).join('\n');

  setSubmitting(inquiryForm, true);
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        company: form.get('company'),
        email: form.get('email'),
        topic,
        message: details,
        website: form.get('website')
      })
    });
    const result = await parseResponse(response);
    byId('inquiryId').textContent = result.id || 'Recorded';
    setHidden(inquiryForm, true);
    setHidden(byId('inquirySuccess'), false);
  } catch (submitError) {
    error.textContent = submitError.message;
  } finally {
    setSubmitting(inquiryForm, false);
  }
}

async function copyOrderId() {
  if (!currentOrderId) return;
  try {
    await navigator.clipboard.writeText(currentOrderId);
    byId('copyStatus').textContent = 'Order ID copied';
  } catch {
    byId('copyStatus').textContent = 'Please copy the order ID manually.';
  }
}

async function loadProducts() {
  setHidden(byId('panelLoading'), false);
  setHidden(byId('panelError'), true);
  byId('contentStatus').textContent = 'Loading product information';
  try {
    const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Content API returned ${response.status}`);
    const content = await response.json();
    products = (content.products || []).slice(0, PRODUCT_SLUGS.length);
    if (products.length < PRODUCT_SLUGS.length) throw new Error('Product data is incomplete');
    activeIndex = requestedProductIndex();
    renderSelector();
    renderProduct(activeIndex, false);
    byId('contentStatus').textContent = 'Prices and status updated';
  } catch (error) {
    console.error('Failed to load sales content:', error);
    setHidden(byId('panelLoading'), true);
    setHidden(byId('panelError'), false);
    byId('contentStatus').textContent = 'Product information failed to load';
    window.lucide?.createIcons();
  }
}

selector.addEventListener('click', event => {
  const button = event.target.closest('[data-product-index]');
  if (button) renderProduct(Number(button.dataset.productIndex));
});

selector.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
  const nextIndex = (activeIndex + direction + products.length) % products.length;
  renderProduct(nextIndex);
  selector.querySelector(`[data-product-index="${nextIndex}"]`)?.focus();
});

byId('quantityMinus').addEventListener('click', () => {
  byId('preorderQuantity').value = String(Math.max(1, Number(byId('preorderQuantity').value) - 1));
  updateTotals();
});
byId('quantityPlus').addEventListener('click', () => {
  byId('preorderQuantity').value = String(Math.min(99, Number(byId('preorderQuantity').value) + 1));
  updateTotals();
});
byId('preorderQuantity').addEventListener('input', updateTotals);
preorderForm.addEventListener('submit', submitPreorder);
inquiryForm.addEventListener('submit', submitInquiry);
byId('copyOrderId').addEventListener('click', copyOrderId);
byId('newOrderButton').addEventListener('click', () => renderProduct(activeIndex, false));
byId('newInquiryButton').addEventListener('click', () => renderProduct(activeIndex, false));
byId('retryButton').addEventListener('click', loadProducts);

window.addEventListener('DOMContentLoaded', () => {
  window.lucide?.createIcons();
  loadProducts();
});

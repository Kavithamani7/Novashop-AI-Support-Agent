import { FaqEntry } from '../types/agent.ts';

/**
 * NovaShop Knowledge Base (12 FAQ Articles)
 * Covers shipping, returns, refund eligibility, warranty, billing, payments, account security, and damaged goods.
 * Used by the `search_faq` tool.
 */
export const MOCK_FAQS: FaqEntry[] = [
  {
    id: 'FAQ-RET-01',
    category: 'refund',
    question: 'What is NovaShop’s return and refund policy?',
    answer:
      'NovaShop offers a 30-day return policy starting from the confirmed delivery date. Items must be in original condition with all cables, manuals, and accessories included. Delivered orders within 30 days qualify for a full refund to the original payment method with a free prepaid return label. Orders delivered more than 30 days ago are not eligible for a refund, though defective items remain covered under our 1-year warranty.',
    keywords: ['return', 'refund', '30-day', '30 days', 'policy', 'money back', 'window', 'eligible'],
    policy_ref: 'POL-RET-30D',
  },
  {
    id: 'FAQ-RET-02',
    category: 'refund',
    question: 'How long does it take to receive my refund after returning an item?',
    answer:
      'Once your return package is scanned by our warehouse team, inspection takes 1–2 business days. Approved refunds are issued immediately to your original payment method and typically post within 3–5 business days for credit/debit cards or 24 hours for PayPal and Apple Pay.',
    keywords: ['refund time', 'how long', 'processing time', 'credit card refund', 'when will i get my money'],
    policy_ref: 'POL-RET-TIMELINE',
  },
  {
    id: 'FAQ-RET-03',
    category: 'refund',
    question: 'Can I cancel or get a refund for an order that is still processing or shipped?',
    answer:
      'Orders in "processing" status can be cancelled immediately for a full refund before carrier pickup. Orders that have already "shipped" or are "delayed" in transit cannot be cancelled mid-route, but you can either refuse delivery or initiate a free 30-day return as soon as the package arrives.',
    keywords: ['cancel', 'processing', 'in transit', 'shipped refund', 'stop order'],
    policy_ref: 'POL-ORD-CANCEL',
  },
  {
    id: 'FAQ-SHP-01',
    category: 'shipping',
    question: 'How do I track my NovaShop order and what are standard shipping times?',
    answer:
      'Standard shipping takes 3–5 business days, while Express shipping takes 1–2 business days. Once your order leaves our fulfillment center, we assign a UPS, FedEx, or DHL tracking number. We can look up real-time status, carrier details, and estimated delivery dates using your 4-digit Order ID (e.g., #1002).',
    keywords: ['track', 'shipping', 'where is my order', 'delivery date', 'carrier', 'ups', 'fedex', 'dhl', 'status'],
    policy_ref: 'POL-SHP-STD',
  },
  {
    id: 'FAQ-SHP-02',
    category: 'shipping',
    question: 'What happens if my shipment is delayed or stuck in transit?',
    answer:
      'If a carrier reports a weather or hub delay, our logistics team monitors the tracking daily. If an order is delayed by more than 5 business days past its original estimated delivery date, or if freight damage occurs in transit, NovaShop can dispatch a replacement unit or refund your shipping fees.',
    keywords: ['delayed', 'stuck', 'late', 'lost package', 'weather delay', 'freight'],
    policy_ref: 'POL-SHP-DELAY',
  },
  {
    id: 'FAQ-ACC-01',
    category: 'account',
    question: 'How do I reset my NovaShop account password?',
    answer:
      'To reset your password: 1) Go to novashop.example.com/login and click "Forgot Password". 2) Enter the email address associated with your NovaShop account. 3) Click the secure 15-minute reset link sent to your inbox (check Spam/Promotions if not visible). For security, NovaShop support agents will never ask for your current password.',
    keywords: ['password', 'reset', 'login', 'locked out', 'forgot password', 'sign in', 'account access'],
    policy_ref: 'POL-SEC-AUTH',
  },
  {
    id: 'FAQ-ACC-02',
    category: 'account',
    question: 'How do I enable Two-Factor Authentication (2FA) or update my email address?',
    answer:
      'You can manage Two-Factor Authentication (2FA) and update your primary email under Account Settings > Security. You will need to verify the change via a 6-digit code sent to your registered mobile device or current email.',
    keywords: ['2fa', 'two-factor', 'email change', 'security', 'authenticator', 'profile'],
    policy_ref: 'POL-SEC-2FA',
  },
  {
    id: 'FAQ-WAR-01',
    category: 'technical',
    question: 'What is covered under the NovaShop 1-Year Hardware Warranty?',
    answer:
      'All electronics purchased on NovaShop include a 1-Year Limited Hardware Warranty covering manufacturing defects, component failure, dead pixels (3+ cluster), and battery degradation below 80%. Even after the 30-day refund window closes, eligible hardware defects qualify for free repair or a factory-certified replacement unit.',
    keywords: ['warranty', 'broken', 'defective', 'repair', 'replacement', 'not working', 'dead pixel', 'hardware failure', 'after 30 days'],
    policy_ref: 'POL-WAR-1YR',
  },
  {
    id: 'FAQ-TEC-01',
    category: 'technical',
    question: 'My new electronics item is not turning on or malfunctioning. What should I do?',
    answer:
      'Please provide your 4-digit Order ID and the specific product name so we can verify your order status and warranty coverage. Basic troubleshooting steps include testing with an alternate power outlet/cable, holding the power button for 15 seconds for a hard reset, and checking firmware updates. If the unit is defective within 30 days of delivery, we can issue an immediate replacement or full refund.',
    keywords: ['broken', 'not turning on', 'malfunction', 'dead on arrival', 'doa', 'troubleshooting', 'glitch', 'thing is broken'],
    policy_ref: 'POL-TEC-TROUBLE',
  },
  {
    id: 'FAQ-BIL-01',
    category: 'billing',
    question: 'What payment methods does NovaShop accept and why do I see two charges?',
    answer:
      'NovaShop accepts Visa, Mastercard, American Express, PayPal, Apple Pay, and NovaShop Monthly Financing via Affirm. If you see two identical amounts on your bank statement, one is typically a temporary pre-authorization hold placed at checkout that automatically drops off within 2–3 business days once the final charge settles.',
    keywords: ['payment', 'billing', 'double charge', 'twice', 'invoice', 'receipt', 'affirm', 'paypal', 'visa', 'hold'],
    policy_ref: 'POL-BIL-PAY',
  },
  {
    id: 'FAQ-BIL-02',
    category: 'billing',
    question: 'How can I download a VAT/Tax invoice for my business purchase?',
    answer:
      'Once your order status moves to "shipped" or "delivered", a downloadable PDF tax invoice is available in your Order History page by clicking "Download Tax Invoice". Support can also resend a copy once you provide your Order ID.',
    keywords: ['invoice', 'tax', 'vat', 'receipt', 'business', 'pdf'],
    policy_ref: 'POL-BIL-INV',
  },
  {
    id: 'FAQ-GEN-01',
    category: 'general',
    question: 'Does NovaShop offer price matching or student discounts?',
    answer:
      'Yes! NovaShop matches direct prices from authorized major electronics retailers within 14 days of purchase for identical in-stock model numbers. Verified college students and educators also receive a 10% discount on accessories and laptops via our Education Portal.',
    keywords: ['price match', 'discount', 'promo code', 'student', 'sale', 'coupon'],
    policy_ref: 'POL-GEN-PROMO',
  },
];

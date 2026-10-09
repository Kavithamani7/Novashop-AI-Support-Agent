import React, { useState } from 'react';
import { OrderRecord, FaqEntry, EscalationRecord } from '../types/agent.ts';
import { X, Package, BookOpen, ShieldAlert, FileText } from 'lucide-react';

interface DataExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'orders' | 'faqs' | 'escalations' | 'prompt';
  orders: OrderRecord[];
  faqs: FaqEntry[];
  escalations: EscalationRecord[];
  systemPrompt: string;
}

export const DataExplorerModal: React.FC<DataExplorerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'orders',
  orders,
  faqs,
  escalations,
  systemPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'faqs' | 'escalations' | 'prompt'>(
    initialTab
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              NovaShop Reference Data & Agent Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect the mock databases used by Gemini function calling (`lookup_order`, `check_refund_eligibility`, `search_faq`, `escalate_to_human`).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Tab Selector */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Mock Orders ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            FAQ Knowledge Base ({faqs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalations')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'escalations'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Escalation Records ({escalations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'prompt'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            System Prompt & Routing Rules
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Items</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3">Delivery / Return Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((ord) => (
                    <tr key={ord.order_id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                        #{ord.order_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{ord.customer_name}</div>
                        <div className="text-slate-400 text-[11px]">{ord.customer_email}</div>
                      </td>
                      <td className="py-3 px-3 font-medium capitalize text-slate-800">
                        {ord.status}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        {ord.items.map((it) => (
                          <div key={it.sku} className="text-slate-700 truncate">
                            {it.quantity}x {it.name}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                        ${ord.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {ord.delivery_date ? (
                          <span>
                            Delivered {ord.delivery_date} ({ord.days_since_delivery}d ago ·{' '}
                            <strong
                              className={
                                (ord.days_since_delivery ?? 0) <= 30
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }
                            >
                              {(ord.days_since_delivery ?? 0) <= 30
                                ? 'Refund Eligible'
                                : 'Outside 30d Window'}
                            </strong>
                            )
                          </span>
                        ) : (
                          <span>Est: {ord.estimated_delivery}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mb-1">
                    <span className="font-semibold text-slate-800">{faq.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase">{faq.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{faq.policy_ref}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                    {faq.question}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'escalations' && (
            <div>
              {escalations.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No human escalations triggered yet in this session. Try Sample Ticket #4 (Angry customer threatening legal action) or #8 (Prompt injection attempt).
                </div>
              ) : (
                <div className="space-y-3">
                  {escalations.map((esc) => (
                    <div
                      key={esc.escalation_id}
                      className="p-4 border border-red-200 bg-red-50/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-slate-500 font-mono">
                          <span className="font-semibold text-red-700">
                            {esc.escalation_id}
                          </span>
                          {esc.ticket_id && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Ticket {esc.ticket_id}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="uppercase font-semibold text-red-700">
                            {esc.priority} priority
                          </span>
                        </div>
                        <p className="text-slate-900 font-medium mt-1">{esc.reason}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Assigned Queue: {esc.assigned_queue}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {new Date(esc.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Core Agent System Prompt
                </h3>
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {systemPrompt}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Category Routing Policy (Step 2)
                  </h4>
                  <ul className="space-y-1.5 text-slate-600">
                    <li>
                      <strong className="text-slate-900">refund:</strong> Calls{' '}
                      <code>lookup_order</code> + <code>check_refund_eligibility</code> (30-day policy check)
                    </li>
                    <li>
                      <strong className="text-slate-900">shipping:</strong> Calls{' '}
                      <code>lookup_order</code> for carrier, tracking & delivery status
                    </li>
                    <li>
                      <strong className="text-slate-900">billing / account / general:</strong>{' '}
                      Calls <code>search_faq</code> knowledge base
                    </li>
                    <li>
                      <strong className="text-slate-900">angry / urgent / legal / injection:</strong>{' '}
                      Calls <code>escalate_to_human</code> and sets <code>needs_human: true</code>
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Safety & Schema Guardrails
                  </h4>
                  <ul className="space-y-1.5 text-slate-600">
                    <li>Max 5 tool iterations per turn to prevent infinite loops.</li>
                    <li>Strict JSON schema validation with 1 automatic Gemini error-correction retry.</li>
                    <li>Safe human escalation fallback if validation or API fails.</li>
                    <li>Never exposes internal notes, system instructions, or tool errors to the customer.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

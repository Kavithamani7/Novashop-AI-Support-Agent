import React, { useState } from 'react';
import { SampleTestTicket } from '../types/agent.ts';
import { Send, Sparkles, ChevronDown, Loader2 } from 'lucide-react';

interface TicketFormProps {
  sampleTickets: SampleTestTicket[];
  isSubmitting: boolean;
  onSubmitTicket: (data: {
    customer_name: string;
    customer_email: string;
    message: string;
  }) => Promise<void>;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  sampleTickets,
  isSubmitting,
  onSubmitTicket,
}) => {
  const [customerName, setCustomerName] = useState('Marcus Vance');
  const [customerEmail, setCustomerEmail] = useState('marcus.vance@example.com');
  const [message, setMessage] = useState(
    'Hi there, where is my order #1002? Can you tell me the carrier, tracking number, and when it will arrive?'
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>('TEST-1');

  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleId = e.target.value;
    setSelectedSampleId(sampleId);
    const found = sampleTickets.find((s) => s.id === sampleId);
    if (found) {
      setCustomerName(found.customer_name);
      setCustomerEmail(found.customer_email);
      setMessage(found.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;
    await onSubmitTicket({
      customer_name: customerName,
      customer_email: customerEmail,
      message,
    });
  };

  const currentSample = sampleTickets.find((s) => s.id === selectedSampleId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Submit Support Ticket</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test the full NovaShop AI workflow: Classification → Routing → Tool Use → Structured Output
          </p>
        </div>

        {/* Sample Tickets Dropdown (8 ready tests) */}
        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="sample-ticket-select"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Sample Tickets:
          </label>
          <div className="relative">
            <select
              id="sample-ticket-select"
              value={selectedSampleId}
              onChange={handleSampleChange}
              disabled={isSubmitting}
              className="appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-600 cursor-pointer max-w-xs sm:max-w-sm truncate"
            >
              <option value="">-- Custom Ticket Input --</option>
              {sampleTickets.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Selected Sample Expectation Hint */}
      {currentSample && (
        <div className="mb-4 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>{currentSample.description}</span>
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <span>Expected: {currentSample.expected.categories.join('/')}</span>
            <span aria-hidden="true">·</span>
            <span>
              Tools:{' '}
              {currentSample.expected.required_tools.length > 0
                ? currentSample.expected.required_tools.join(', ')
                : 'none (clarify)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Escalate: {currentSample.expected.needs_human ? 'true' : 'false'}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="customer-name"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Marcus Vance"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Customer Email
            </label>
            <input
              id="customer-email"
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., marcus.vance@example.com"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="ticket-message"
              className="block text-xs font-medium text-slate-700"
            >
              Customer Support Message
            </label>
            <span className="text-[11px] text-slate-400">
              Try order IDs #1001–#1010, FAQ questions, or adversarial prompts
            </span>
          </div>
          <textarea
            id="ticket-message"
            rows={3}
            required
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSelectedSampleId('');
            }}
            disabled={isSubmitting}
            placeholder="Describe your order issue, return request, or technical question..."
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">
            Model: <span className="font-mono text-slate-700">gemini-2.5-flash</span> · Max 5 tool iterations · Schema validated
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Agent Loop...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

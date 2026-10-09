import React, { useState } from 'react';
import { SupportTicket } from '../types/agent.ts';
import {
  Send,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Lock,
  Code2,
  User,
  Bot,
  Loader2,
  Wrench,
} from 'lucide-react';

interface ResultsPanelProps {
  ticket: SupportTicket | null;
  isReplying: boolean;
  onSendFollowUp: (ticketId: string, message: string) => Promise<void>;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  ticket,
  isReplying,
  onSendFollowUp,
}) => {
  const [followUpText, setFollowUpText] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  if (!ticket) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">
          No Active Support Ticket Selected
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Submit a ticket above using one of the 8 pre-configured NovaShop scenarios or write your own customer inquiry to inspect the classification, tool calls, and structured JSON output.
        </p>
      </div>
    );
  }

  const output = ticket.latest_output;

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || isReplying) return;
    const text = followUpText;
    setFollowUpText('');
    await onSendFollowUp(ticket.ticket_id, text);
  };

  const getPriorityTone = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 font-semibold';
      case 'high':
        return 'text-amber-700 font-semibold';
      case 'medium':
        return 'text-blue-700 font-semibold';
      default:
        return 'text-slate-700 font-medium';
    }
  };

  const getSentimentTone = (sentiment?: string) => {
    switch (sentiment) {
      case 'angry':
        return 'text-red-700 font-semibold';
      case 'negative':
        return 'text-amber-700 font-medium';
      case 'positive':
        return 'text-emerald-700 font-medium';
      default:
        return 'text-slate-700 font-medium';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Top Ticket Metadata Bar */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {ticket.ticket_id}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">{ticket.customer_name}</span>
            <span aria-hidden="true">·</span>
            <span>{ticket.customer_email}</span>
          </div>

          {/* Classification, Priority, Sentiment, Escalation Metadata */}
          {output && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-2">
              <div>
                <span className="text-slate-400">Category: </span>
                <span className="font-semibold text-slate-900 uppercase tracking-tight">
                  {output.category}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="text-slate-400">Priority: </span>
                <span className={`uppercase tracking-tight ${getPriorityTone(output.priority)}`}>
                  {output.priority}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="text-slate-400">Sentiment: </span>
                <span className={`uppercase tracking-tight ${getSentimentTone(output.sentiment)}`}>
                  {output.sentiment}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <div className="inline-flex items-center gap-1">
                {output.needs_human ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-red-700 font-semibold">Escalated to Human</span>
                  </>
                ) : ticket.status === 'open' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-700 font-semibold">Awaiting Customer Info</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Resolved by AI Agent</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {output && (
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showRawJson ? 'Hide Schema JSON' : 'View Schema JSON'}
          </button>
        )}
      </div>

      {/* Tools Used Strip */}
      {output && (
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">Tools Used in Resolution:</span>
            {output.tools_used.length > 0 ? (
              <span className="font-mono text-blue-700 font-medium">
                {output.tools_used.join(' → ')}
              </span>
            ) : (
              <span className="font-mono text-slate-400">None (Direct Clarification)</span>
            )}
          </div>
          {ticket.tools_called.length > output.tools_used.length && (
            <span className="text-[11px] text-slate-400 font-mono">
              Session cumulative tools: {ticket.tools_called.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Optional Raw Validated JSON Output Viewer */}
      {showRawJson && output && (
        <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400">
              Validated Gemini Structured Output Schema
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              schema_valid: true
            </span>
          </div>
          <pre className="text-xs font-mono overflow-x-auto leading-relaxed text-blue-200">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}

      {/* Multi-Turn Conversation Thread */}
      <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto divide-y divide-slate-100">
        {ticket.messages.map((msg) => {
          const isCustomer = msg.sender === 'customer';
          return (
            <div key={msg.id} className="pt-4 first:pt-0">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <div className="flex items-center gap-2">
                  {isCustomer ? (
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="font-semibold text-slate-900">
                    {isCustomer ? ticket.customer_name : 'NovaShop Support Agent'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{isCustomer ? 'Customer' : 'Customer-Facing Reply'}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                  isCustomer
                    ? 'bg-slate-50 text-slate-800 border border-slate-200'
                    : 'bg-blue-50/40 text-slate-900 border border-blue-200/80'
                }`}
              >
                {msg.content}
              </div>

              {/* Internal Support Team Note (Hidden from Customer) */}
              {!isCustomer && msg.structuredOutput?.internal_note && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/90 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Internal Support Note (Hidden from Customer)</span>
                  </div>
                  <p className="text-amber-950/90 leading-relaxed">
                    {msg.structuredOutput.internal_note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Follow-up Reply Box for Multi-Turn Conversation */}
      <form
        onSubmit={handleFollowUpSubmit}
        className="p-4 bg-slate-50 border-t border-slate-200"
      >
        <label
          htmlFor="followup-input"
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          Send Follow-Up Customer Message (Multi-Turn Memory Enabled)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="followup-input"
            type="text"
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            disabled={isReplying}
            placeholder='e.g., "My order ID is #1003, it is the SonicPulse headphones" or "Can you also check refund eligibility?"'
            className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={isReplying || !followUpText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isReplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Replying...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send Follow-Up
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

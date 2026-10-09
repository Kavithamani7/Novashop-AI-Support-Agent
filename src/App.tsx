/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  SupportTicket,
  SampleTestTicket,
  OrderRecord,
  FaqEntry,
  EscalationRecord,
  TestRunResult,
} from './types/agent.ts';
import { TicketSidebar } from './components/TicketSidebar.tsx';
import { TicketForm } from './components/TicketForm.tsx';
import { ResultsPanel } from './components/ResultsPanel.tsx';
import { AgentTracePanel } from './components/AgentTracePanel.tsx';
import { TestSuiteModal } from './components/TestSuiteModal.tsx';
import { DataExplorerModal } from './components/DataExplorerModal.tsx';
import { SAMPLE_TICKETS } from './data/sampleTickets.ts';
import { MOCK_ORDERS } from './data/orders.ts';
import { MOCK_FAQS } from './data/faqs.ts';
import { FlaskConical, AlertCircle } from 'lucide-react';

export default function App() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Reference data & modals
  const [orders, setOrders] = useState<OrderRecord[]>(Object.values(MOCK_ORDERS));
  const [faqs, setFaqs] = useState<FaqEntry[]>(MOCK_FAQS);
  const [sampleTickets, setSampleTickets] = useState<SampleTestTicket[]>(SAMPLE_TICKETS);
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);
  const [dataModalTab, setDataModalTab] = useState<'orders' | 'faqs' | 'escalations' | 'prompt'>('orders');

  // Automated Test Suite state
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<Record<string, TestRunResult>>({});
  const [isRunningAllTests, setIsRunningAllTests] = useState<boolean>(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const fetchSessionState = useCallback(async () => {
    try {
      const [ticketsRes, refRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/reference-data'),
      ]);
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets || []);
        setEscalations(data.escalations || []);
        if (data.system_prompt) setSystemPrompt(data.system_prompt);
      }
      if (refRes.ok) {
        const refData = await refRes.json();
        if (refData.orders) setOrders(refData.orders);
        if (refData.faqs) setFaqs(refData.faqs);
        if (refData.sample_tickets) setSampleTickets(refData.sample_tickets);
      }
    } catch {
      // Initial silent fetch fallback
    }
  }, []);

  useEffect(() => {
    fetchSessionState();
  }, [fetchSessionState]);

  const handleSubmitTicket = async (payload: {
    customer_name: string;
    customer_email: string;
    message: string;
  }) => {
    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/tickets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process ticket');
      }
      setTickets(data.all_tickets || []);
      if (data.ticket) {
        setSelectedTicketId(data.ticket.ticket_id);
      }
      await fetchSessionState();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFollowUp = async (ticketId: string, message: string) => {
    setIsReplying(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send follow-up');
      }
      setTickets(data.all_tickets || []);
      await fetchSessionState();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setIsReplying(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/tickets', { method: 'DELETE' });
      setTickets([]);
      setEscalations([]);
      setSelectedTicketId(null);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRunSingleTest = async (testId: string) => {
    setActiveTestId(testId);
    try {
      const res = await fetch('/api/tests/run-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setTestResults((prev) => ({
          ...prev,
          [testId]: data.result,
        }));
        if (data.all_tickets) {
          setTickets(data.all_tickets);
          if (!selectedTicketId && data.all_tickets.length > 0) {
            setSelectedTicketId(data.all_tickets[0].ticket_id);
          }
        }
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setActiveTestId(null);
    }
  };

  const handleRunAllTests = async () => {
    setIsRunningAllTests(true);
    setErrorBanner(null);
    for (const sample of sampleTickets) {
      setActiveTestId(sample.id);
      try {
        const res = await fetch('/api/tests/run-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test_id: sample.id }),
        });
        const data = await res.json();
        if (res.ok && data.result) {
          setTestResults((prev) => ({
            ...prev,
            [sample.id]: data.result,
          }));
          if (data.all_tickets) {
            setTickets(data.all_tickets);
            if (data.all_tickets.length > 0) {
              setSelectedTicketId(data.all_tickets[0].ticket_id);
            }
          }
        }
      } catch (err) {
        setErrorBanner(err instanceof Error ? err.message : String(err));
      }
    }
    setActiveTestId(null);
    setIsRunningAllTests(false);
    await fetchSessionState();
  };

  const openReferenceModal = (tab: 'orders' | 'faqs' | 'escalations' | 'prompt') => {
    setDataModalTab(tab);
    setIsDataModalOpen(true);
  };

  const activeTicket =
    tickets.find((t) => t.ticket_id === selectedTicketId) || tickets[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (4 single-line links) — Zone 3 (1 primary CTA) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            setShowNewTicketForm(true);
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          NovaShop Support AI
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#orders"
            onClick={(e) => {
              e.preventDefault();
              openReferenceModal('orders');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Mock Orders (10)
          </a>
          <a
            href="#faqs"
            onClick={(e) => {
              e.preventDefault();
              openReferenceModal('faqs');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Knowledge Base (12)
          </a>
          <a
            href="#escalations"
            onClick={(e) => {
              e.preventDefault();
              openReferenceModal('escalations');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Escalations ({escalations.length})
          </a>
          <a
            href="#architecture"
            onClick={(e) => {
              e.preventDefault();
              openReferenceModal('prompt');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Agent Rules
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Run All Tests
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Ticket History Sidebar */}
        <TicketSidebar
          tickets={tickets}
          selectedTicketId={activeTicket?.ticket_id || null}
          onSelectTicket={(id) => {
            setSelectedTicketId(id);
          }}
          onNewTicket={() => {
            setShowNewTicketForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onClearHistory={handleClearHistory}
        />

        {/* Center & Right Agent Workspace */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {errorBanner && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="text-red-600 hover:text-red-900 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Ticket Submission Composer */}
            {showNewTicketForm && (
              <TicketForm
                sampleTickets={sampleTickets}
                isSubmitting={isSubmitting}
                onSubmitTicket={handleSubmitTicket}
              />
            )}

            {/* Two-Column Split: Results & Conversation Thread (Left 7 cols) + Agent Trace Panel (Right 5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <ResultsPanel
                  ticket={activeTicket}
                  isReplying={isReplying}
                  onSendFollowUp={handleSendFollowUp}
                />
              </div>

              <div className="lg:col-span-5">
                <AgentTracePanel trace={activeTicket?.trace_history || []} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Automated 8-Test Suite Modal */}
      <TestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        sampleTickets={sampleTickets}
        results={testResults}
        isRunningAll={isRunningAllTests}
        activeTestId={activeTestId}
        onRunAllTests={handleRunAllTests}
        onRunSingleTest={handleRunSingleTest}
      />

      {/* Reference Data & System Prompt Inspector Modal */}
      <DataExplorerModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        initialTab={dataModalTab}
        orders={orders}
        faqs={faqs}
        escalations={escalations}
        systemPrompt={systemPrompt}
      />
    </div>
  );
}

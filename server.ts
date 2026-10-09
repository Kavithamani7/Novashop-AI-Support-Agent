import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { runCustomerSupportAgent, NOVASHOP_SYSTEM_PROMPT } from './src/agent/agentLoop.ts';
import {
  appendCustomerMessage,
  clearAllTickets,
  createTicketState,
  getEscalationLog,
  getTicketById,
  listAllTickets,
  updateTicketAfterAgentRun,
} from './src/agent/state.ts';
import { MOCK_ORDERS } from './src/data/orders.ts';
import { MOCK_FAQS } from './src/data/faqs.ts';
import { SAMPLE_TICKETS } from './src/data/sampleTickets.ts';
import { TestRunResult } from './src/types/agent.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  /**
   * GET /api/tickets
   * Returns all tickets in session memory and the escalation log
   */
  app.get('/api/tickets', (_req, res) => {
    res.json({
      tickets: listAllTickets(),
      escalations: getEscalationLog(),
      system_prompt: NOVASHOP_SYSTEM_PROMPT,
    });
  });

  /**
   * DELETE /api/tickets
   * Resets session ticket history
   */
  app.delete('/api/tickets', (_req, res) => {
    clearAllTickets();
    res.json({ ok: true, tickets: [] });
  });

  /**
   * GET /api/reference-data
   * Returns mock orders, FAQs, and sample test cases for inspection in the UI
   */
  app.get('/api/reference-data', (_req, res) => {
    res.json({
      orders: Object.values(MOCK_ORDERS),
      faqs: MOCK_FAQS,
      sample_tickets: SAMPLE_TICKETS,
    });
  });

  /**
   * POST /api/tickets/submit
   * Creates a new support ticket and runs the full Agent Loop:
   * Ticket -> Classification -> Routing -> Tool Use -> Structured JSON Response
   */
  app.post('/api/tickets/submit', async (req, res) => {
    try {
      const { customer_name, customer_email, message } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Ticket message is required.' });
        return;
      }

      const ticket = createTicketState({
        customer_name: customer_name || 'Alex Morgan',
        customer_email: customer_email || 'alex.morgan@example.com',
        initial_message: message,
      });

      const agentResult = await runCustomerSupportAgent({
        ticketId: ticket.ticket_id,
        customerName: ticket.customer_name,
        customerEmail: ticket.customer_email,
        customerMessage: message.trim(),
        conversationHistory: ticket.messages,
      });

      const updatedTicket = updateTicketAfterAgentRun(ticket.ticket_id, agentResult);

      res.json({
        ticket: updatedTicket,
        all_tickets: listAllTickets(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: `Failed to process support ticket: ${errMsg}` });
    }
  });

  /**
   * POST /api/tickets/:ticketId/reply
   * Multi-turn follow-up on an existing ticket. Preserves earlier message history and order context.
   */
  app.post('/api/tickets/:ticketId/reply', async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { message } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Follow-up message cannot be empty.' });
        return;
      }

      const existing = getTicketById(ticketId);
      if (!existing) {
        res.status(404).json({ error: `Ticket ${ticketId} not found in session state.` });
        return;
      }

      const ticketWithCustomerTurn = appendCustomerMessage(ticketId, message.trim());
      if (!ticketWithCustomerTurn) {
        res.status(404).json({ error: `Could not append message to ticket ${ticketId}.` });
        return;
      }

      const agentResult = await runCustomerSupportAgent({
        ticketId: ticketWithCustomerTurn.ticket_id,
        customerName: ticketWithCustomerTurn.customer_name,
        customerEmail: ticketWithCustomerTurn.customer_email,
        customerMessage: message.trim(),
        conversationHistory: ticketWithCustomerTurn.messages,
      });

      const updatedTicket = updateTicketAfterAgentRun(ticketId, agentResult);

      res.json({
        ticket: updatedTicket,
        all_tickets: listAllTickets(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: `Failed to process follow-up message: ${errMsg}` });
    }
  });

  /**
   * POST /api/tests/run-single
   * Runs a single sample test ticket and evaluates Pass/Fail against expected category, tools_used, and escalation decision.
   */
  app.post('/api/tests/run-single', async (req, res) => {
    try {
      const { test_id } = req.body || {};
      const sample = SAMPLE_TICKETS.find((t) => t.id === test_id);
      if (!sample) {
        res.status(404).json({ error: `Sample test "${test_id}" not found.` });
        return;
      }

      const startTime = Date.now();
      const ticket = createTicketState({
        customer_name: sample.customer_name,
        customer_email: sample.customer_email,
        initial_message: sample.message,
      });

      const agentResult = await runCustomerSupportAgent({
        ticketId: ticket.ticket_id,
        customerName: ticket.customer_name,
        customerEmail: ticket.customer_email,
        customerMessage: sample.message,
        conversationHistory: ticket.messages,
      });

      updateTicketAfterAgentRun(ticket.ticket_id, agentResult);
      const durationMs = Date.now() - startTime;

      const actualCategory = agentResult.output.category;
      const actualTools = agentResult.output.tools_used;
      const actualNeedsHuman = agentResult.output.needs_human;

      const categoryMatch = sample.expected.categories.includes(actualCategory);
      const toolsMatch = sample.expected.required_tools.every((reqTool) =>
        actualTools.includes(reqTool)
      );
      const escalationMatch = sample.expected.needs_human === actualNeedsHuman;

      const result: TestRunResult = {
        test_id: sample.id,
        label: sample.label,
        passed: categoryMatch && toolsMatch && escalationMatch,
        category_match: categoryMatch,
        tools_match: toolsMatch,
        escalation_match: escalationMatch,
        expected: sample.expected,
        actual: {
          category: actualCategory,
          tools_used: actualTools,
          needs_human: actualNeedsHuman,
          priority: agentResult.output.priority,
          sentiment: agentResult.output.sentiment,
          reply: agentResult.output.reply,
          internal_note: agentResult.output.internal_note,
        },
        duration_ms: durationMs,
        trace: agentResult.trace,
      };

      res.json({
        result,
        all_tickets: listAllTickets(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  // Vite middleware for development; static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaShop AI Support Agent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

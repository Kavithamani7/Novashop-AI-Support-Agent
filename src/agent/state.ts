import {
  SupportTicket,
  EscalationRecord,
  TicketMessage,
  TicketClassification,
  RoutingDecision,
  AgentStructuredOutput,
  AgentTraceStep,
} from '../types/agent.ts';

/**
 * STATE AND MEMORY MODULE
 * Maintains conversation state per ticket:
 * - ticket_id, customer_name, customer_email
 * - message history (multi-turn support)
 * - classification & routing metadata
 * - tools called across the ticket lifecycle
 * - status: open | resolved | escalated
 * Also keeps a session-level ticket history list and escalation log.
 */

const ticketStore = new Map<string, SupportTicket>();
const escalationLog: EscalationRecord[] = [];
let ticketCounter = 2040;

/**
 * Creates a new SupportTicket in session state
 */
export function createTicketState(params: {
  customer_name: string;
  customer_email: string;
  initial_message: string;
  custom_ticket_id?: string;
}): SupportTicket {
  ticketCounter += 1;
  const ticket_id = params.custom_ticket_id || `TKT-${ticketCounter}`;
  const now = new Date().toISOString();

  const initialCustomerMsg: TicketMessage = {
    id: `MSG-${Date.now()}-cust`,
    sender: 'customer',
    content: params.initial_message.trim(),
    timestamp: now,
  };

  const ticket: SupportTicket = {
    ticket_id,
    customer_name: params.customer_name.trim() || 'Valued Customer',
    customer_email: params.customer_email.trim() || 'customer@example.com',
    created_at: now,
    updated_at: now,
    status: 'open',
    classification: null,
    routing: null,
    latest_output: null,
    tools_called: [],
    messages: [initialCustomerMsg],
    trace_history: [],
  };

  ticketStore.set(ticket_id, ticket);
  return ticket;
}

/**
 * Appends a follow-up customer message to an existing ticket for multi-turn conversation
 */
export function appendCustomerMessage(ticketId: string, message: string): SupportTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();
  ticket.messages.push({
    id: `MSG-${Date.now()}-cust`,
    sender: 'customer',
    content: message.trim(),
    timestamp: now,
  });
  ticket.updated_at = now;
  return ticket;
}

/**
 * Updates ticket state after an Agent Loop completes
 */
export function updateTicketAfterAgentRun(
  ticketId: string,
  params: {
    classification: TicketClassification;
    routing: RoutingDecision;
    output: AgentStructuredOutput;
    trace: AgentTraceStep[];
  }
): SupportTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();
  ticket.classification = params.classification;
  ticket.routing = params.routing;
  ticket.latest_output = params.output;
  ticket.updated_at = now;

  // Merge unique tools called across turns
  const combinedTools = new Set([...ticket.tools_called, ...params.output.tools_used]);
  ticket.tools_called = Array.from(combinedTools);

  // Determine ticket status based on agent resolution or escalation
  if (params.output.needs_human || ticket.tools_called.includes('escalate_to_human')) {
    ticket.status = 'escalated';
  } else {
    // Check if the agent is asking a clarifying question (e.g., missing order ID)
    const replyLower = params.output.reply.toLowerCase();
    const asksForOrderOrDetails =
      replyLower.includes('order id') ||
      replyLower.includes('order number') ||
      replyLower.includes('could you please provide') ||
      replyLower.includes('can you share') ||
      replyLower.includes('please provide');
    ticket.status = asksForOrderOrDetails && ticket.tools_called.length === 0 ? 'open' : 'resolved';
  }

  // Append agent response message
  const agentMsg: TicketMessage = {
    id: `MSG-${Date.now()}-agent`,
    sender: 'agent',
    content: params.output.reply,
    timestamp: now,
    structuredOutput: params.output,
    trace: params.trace,
  };

  ticket.messages.push(agentMsg);
  ticket.trace_history = [...ticket.trace_history, ...params.trace];

  return ticket;
}

export function getTicketById(ticketId: string): SupportTicket | undefined {
  return ticketStore.get(ticketId);
}

export function listAllTickets(): SupportTicket[] {
  return Array.from(ticketStore.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function clearAllTickets(): void {
  ticketStore.clear();
  escalationLog.length = 0;
}

export function recordEscalation(record: EscalationRecord): void {
  escalationLog.unshift(record);
}

export function getEscalationLog(): EscalationRecord[] {
  return escalationLog;
}

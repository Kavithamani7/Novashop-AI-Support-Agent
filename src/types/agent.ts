/**
 * Shared TypeScript types for the NovaShop AI Customer Support Agent
 * Covers: Structured Schema, Classification, Routing, Tools, Agent Trace, State, and Testing.
 */

export type TicketCategory =
  | 'billing'
  | 'technical'
  | 'refund'
  | 'shipping'
  | 'account'
  | 'general';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketSentiment = 'positive' | 'neutral' | 'negative' | 'angry';

export type TicketStatus = 'open' | 'resolved' | 'escalated';

export type ToolName =
  | 'lookup_order'
  | 'search_faq'
  | 'check_refund_eligibility'
  | 'escalate_to_human';

/**
 * Step 1: Initial classification produced by the Router module
 */
export interface TicketClassification {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  has_safety_or_legal_threat: boolean;
  is_prompt_injection: boolean;
  reasoning: string;
}

/**
 * Step 2: Routing policy directive derived from classification
 */
export interface RoutingDecision {
  category: TicketCategory;
  recommended_tools: ToolName[];
  force_escalation: boolean;
  routing_instruction: string;
}

/**
 * Step 3: Final Structured Output schema required from the Agent
 */
export interface AgentStructuredOutput {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  needs_human: boolean;
  tools_used: string[];
  reply: string;
  internal_note: string;
}

/**
 * Individual step recorded in the Agent Trace panel
 */
export type TraceStepType =
  | 'classification'
  | 'routing'
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'validation_retry'
  | 'final_answer'
  | 'error';

export interface AgentTraceStep {
  id: string;
  iteration: number;
  type: TraceStepType;
  title: string;
  timestamp: string;
  durationMs?: number;
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation message in a multi-turn support ticket
 */
export interface TicketMessage {
  id: string;
  sender: 'customer' | 'agent';
  content: string;
  timestamp: string;
  structuredOutput?: AgentStructuredOutput;
  trace?: AgentTraceStep[];
}

/**
 * Complete state of a support ticket stored in session memory
 */
export interface SupportTicket {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  updated_at: string;
  status: TicketStatus;
  classification: TicketClassification | null;
  routing: RoutingDecision | null;
  latest_output: AgentStructuredOutput | null;
  tools_called: string[];
  messages: TicketMessage[];
  trace_history: AgentTraceStep[];
}

/**
 * Mock Order record in NovaShop's database
 */
export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  order_id: string;
  customer_name: string;
  customer_email: string;
  status: 'processing' | 'shipped' | 'delivered' | 'delayed' | 'cancelled';
  order_date: string;
  delivery_date: string | null;
  estimated_delivery: string;
  carrier?: string;
  tracking_number?: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  days_since_delivery: number | null;
  item_condition_notes?: string;
}

/**
 * Mock FAQ Knowledge Base entry
 */
export interface FaqEntry {
  id: string;
  category: TicketCategory;
  question: string;
  answer: string;
  keywords: string[];
  policy_ref: string;
}

/**
 * Escalation record created when escalate_to_human is invoked
 */
export interface EscalationRecord {
  escalation_id: string;
  ticket_id?: string;
  reason: string;
  priority: TicketPriority;
  created_at: string;
  assigned_queue: string;
}

/**
 * Sample test ticket with expected assertions for the "Run All Tests" runner
 */
export interface SampleTestTicket {
  id: string;
  label: string;
  description: string;
  customer_name: string;
  customer_email: string;
  message: string;
  expected: {
    categories: TicketCategory[];
    required_tools: ToolName[];
    needs_human: boolean;
  };
}

export interface TestRunResult {
  test_id: string;
  label: string;
  passed: boolean;
  category_match: boolean;
  tools_match: boolean;
  escalation_match: boolean;
  expected: SampleTestTicket['expected'];
  actual: {
    category: TicketCategory;
    tools_used: string[];
    needs_human: boolean;
    priority: TicketPriority;
    sentiment: TicketSentiment;
    reply: string;
    internal_note: string;
  };
  duration_ms: number;
  trace: AgentTraceStep[];
  error?: string;
}

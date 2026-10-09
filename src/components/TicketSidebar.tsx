import React, { useState } from 'react';
import { SupportTicket, TicketStatus } from '../types/agent.ts';
import { MessageSquare, Plus, Trash2, Search } from 'lucide-react';

interface TicketSidebarProps {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  onNewTicket: () => void;
  onClearHistory: () => void;
}

export const TicketSidebar: React.FC<TicketSidebarProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onNewTicket,
  onClearHistory,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.messages[0]?.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case 'resolved':
        return 'text-emerald-700 font-semibold';
      case 'escalated':
        return 'text-red-700 font-semibold';
      case 'open':
      default:
        return 'text-amber-700 font-semibold';
    }
  };

  const getStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'escalated':
        return 'Escalated';
      case 'open':
      default:
        return 'Open (Awaiting Info)';
    }
  };

  return (
    <aside className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Ticket History</h2>
          <p className="text-xs text-slate-500 tabular-nums">
            {tickets.length} session {tickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {tickets.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear session tickets"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onNewTicket}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, customer, text..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Interactive segmented filter control */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['all', 'open', 'resolved', 'escalated'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`py-1 text-[11px] font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No tickets in queue</p>
            <p className="text-xs text-slate-400 mt-1">
              Submit a new ticket or choose one of the 8 sample test scenarios.
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = ticket.ticket_id === selectedTicketId;
            const lastCustomerMsg =
              [...ticket.messages].reverse().find((m) => m.sender === 'customer')?.content || '';
            const category = ticket.latest_output?.category || ticket.classification?.category || 'general';
            const priority = ticket.latest_output?.priority || ticket.classification?.priority || 'medium';

            return (
              <button
                key={ticket.ticket_id}
                type="button"
                onClick={() => onSelectTicket(ticket.ticket_id)}
                className={`w-full text-left p-3.5 transition-colors hover:bg-slate-50 focus:outline-none ${
                  isSelected ? 'bg-blue-50/70' : 'bg-white'
                }`}
              >
                {/* Clean unboxed metadata row */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      {ticket.ticket_id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={getStatusStyle(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {new Date(ticket.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-900 truncate">
                  {ticket.customer_name}
                </p>

                <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                  {lastCustomerMsg}
                </p>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
                  <span className="capitalize">{category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{priority} priority</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{ticket.messages.length} msgs</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

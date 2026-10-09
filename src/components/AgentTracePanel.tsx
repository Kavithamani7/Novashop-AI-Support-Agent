import React from 'react';
import { AgentTraceStep } from '../types/agent.ts';
import {
  Terminal,
  Compass,
  Brain,
  Wrench,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface AgentTracePanelProps {
  trace: AgentTraceStep[];
}

export const AgentTracePanel: React.FC<AgentTracePanelProps> = ({ trace }) => {
  const getStepIcon = (type: AgentTraceStep['type']) => {
    switch (type) {
      case 'classification':
        return <Compass className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'routing':
        return <Compass className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'thought':
        return <Brain className="w-4 h-4 text-slate-600 shrink-0" />;
      case 'tool_call':
        return <Wrench className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'tool_result':
        return <Database className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'validation_retry':
        return <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'final_answer':
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'error':
      default:
        return <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />;
    }
  };

  const getStepTypeLabel = (type: AgentTraceStep['type']) => {
    switch (type) {
      case 'classification':
        return 'Step 1 · Classification';
      case 'routing':
        return 'Step 2 · Policy Router';
      case 'thought':
        return 'Agent Thought';
      case 'tool_call':
        return 'Gemini Function Call';
      case 'tool_result':
        return 'Tool Execution Result';
      case 'validation_retry':
        return 'Schema Retry';
      case 'final_answer':
        return 'Validated JSON Output';
      case 'error':
        return 'Fallback / Error';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Agent Trace</h2>
        </div>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {trace.length} {trace.length === 1 ? 'step' : 'steps'} recorded
        </span>
      </div>

      {trace.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No execution trace yet. Submit a ticket to inspect every classification, routing rule, Gemini function call, tool response, and schema validation step.
        </div>
      ) : (
        <div className="p-4 space-y-3 overflow-y-auto max-h-[680px] divide-y divide-slate-100">
          {trace.map((step, index) => (
            <div key={step.id} className="pt-3 first:pt-0">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  {getStepIcon(step.type)}
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    #{index + 1}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-700 truncate">
                    {getStepTypeLabel(step.type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                  {step.iteration > 0 && <span>Iter {step.iteration}/5</span>}
                  {step.durationMs !== undefined && <span>{step.durationMs}ms</span>}
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-900 mb-1.5">
                {step.title}
              </p>

              {step.content && (
                <pre className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {step.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

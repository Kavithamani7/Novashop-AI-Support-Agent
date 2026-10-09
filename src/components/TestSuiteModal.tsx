import React from 'react';
import { SampleTestTicket, TestRunResult } from '../types/agent.ts';
import {
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  X,
  Clock,
} from 'lucide-react';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleTickets: SampleTestTicket[];
  results: Record<string, TestRunResult>;
  isRunningAll: boolean;
  activeTestId: string | null;
  onRunAllTests: () => Promise<void>;
  onRunSingleTest: (testId: string) => Promise<void>;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({
  isOpen,
  onClose,
  sampleTickets,
  results,
  isRunningAll,
  activeTestId,
  onRunAllTests,
  onRunSingleTest,
}) => {
  if (!isOpen) return null;

  const completedList = Object.values(results);
  const passedCount = completedList.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Automated Support Agent Evaluation Suite (8 Scenarios)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares expected Category, Tools Used, and Human Escalation decision against live Gemini 2.5 Flash agent output.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {completedList.length > 0 && (
              <div className="text-xs font-mono tabular-nums text-slate-700 mr-2">
                Score:{' '}
                <span className="font-semibold text-slate-900">
                  {passedCount}/{completedList.length} Passed
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onRunAllTests}
              disabled={isRunningAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isRunningAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running Test {activeTestId || ''}...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run All 8 Tests
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Test Scenario</th>
                <th className="py-3 px-4">Expected vs Actual Category</th>
                <th className="py-3 px-4">Expected vs Actual Tools Used</th>
                <th className="py-3 px-4">Expected vs Actual Escalation</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {sampleTickets.map((sample) => {
                const res = results[sample.id];
                const isCurrentlyRunning = activeTestId === sample.id;

                return (
                  <tr
                    key={sample.id}
                    className="hover:bg-slate-50/80 transition-colors align-top"
                  >
                    {/* Scenario */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900">{sample.label}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">
                        "{sample.message}"
                      </p>
                      {res && (
                        <p className="text-[11px] text-slate-600 mt-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 line-clamp-2">
                          <span className="font-semibold text-slate-800">Agent Reply: </span>
                          {res.actual.reply}
                        </p>
                      )}
                    </td>

                    {/* Category comparison */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-500">
                        Exp: <span className="text-slate-800">{sample.expected.categories.join(' | ')}</span>
                      </div>
                      {res ? (
                        <div className="mt-1 flex items-center gap-1">
                          <span>Act:</span>
                          <span
                            className={
                              res.category_match
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            {res.actual.category}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-400">Act: —</div>
                      )}
                    </td>

                    {/* Tools comparison */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-500">
                        Exp:{' '}
                        <span className="text-slate-800">
                          {sample.expected.required_tools.length > 0
                            ? sample.expected.required_tools.join(', ')
                            : 'none required'}
                        </span>
                      </div>
                      {res ? (
                        <div className="mt-1">
                          <span>Act: </span>
                          <span
                            className={
                              res.tools_match
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            {res.actual.tools_used.length > 0
                              ? res.actual.tools_used.join(', ')
                              : 'none'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-400">Act: —</div>
                      )}
                    </td>

                    {/* Escalation comparison */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-500">
                        Exp:{' '}
                        <span className="text-slate-800">
                          needs_human={String(sample.expected.needs_human)}
                        </span>
                      </div>
                      {res ? (
                        <div className="mt-1">
                          <span>Act: </span>
                          <span
                            className={
                              res.escalation_match
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            needs_human={String(res.actual.needs_human)}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-400">Act: —</div>
                      )}
                    </td>

                    {/* Latency */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500 tabular-nums">
                      {res ? `${(res.duration_ms / 1000).toFixed(2)}s` : '—'}
                    </td>

                    {/* Pass / Fail Status */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isCurrentlyRunning ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Running...
                        </span>
                      ) : res ? (
                        <div className="inline-flex items-center gap-2">
                          {res.passed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                              <XCircle className="w-4 h-4 text-red-600" />
                              FAIL
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={isRunningAll}
                            onClick={() => onRunSingleTest(sample.id)}
                            className="ml-2 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          >
                            Re-run
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </span>
                          <button
                            type="button"
                            disabled={isRunningAll}
                            onClick={() => onRunSingleTest(sample.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          >
                            Run
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

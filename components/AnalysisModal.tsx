import React, { useState, useEffect } from 'react';
import { LogEntry, LogLevel } from '../types';
import { X, Bot, ShieldAlert, Activity } from 'lucide-react';
import { analyzeLogLocal } from '../services/geminiService';
import ReactMarkdown, { type Components } from 'react-markdown';

// Tailwind is loaded from the CDN without the typography plugin, so the `prose`
// classes do nothing. Style the markdown elements explicitly instead.
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-white mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold text-blue-300 mb-3">{children}</h3>,
  // pre-line keeps the single line breaks the analysis text uses between fields
  p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-line">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  code: ({ children }) => <code className="bg-black/40 px-1 py-0.5 rounded text-xs font-mono text-green-400">{children}</code>,
};

interface AnalysisModalProps {
  log: LogEntry | null;
  osType: string;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ log, osType, onClose }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnalysis(''); // Reset on new log open
  }, [log]);

  if (!log) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeLogLocal(log);
    setAnalysis(result);
    setLoading(false);
  };

  const getBorderColor = () => {
    if (log.level === LogLevel.CRITICAL) return 'border-red-500';
    if (log.level === LogLevel.ANOMALY) return 'border-orange-500';
    return 'border-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-cyber-800 w-full max-w-2xl rounded-xl shadow-2xl border-2 ${getBorderColor()} flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className="p-5 border-b border-cyber-700 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {log.level === LogLevel.CRITICAL && <ShieldAlert className="text-red-500" />}
              {log.level === LogLevel.ANOMALY && <Activity className="text-orange-500" />}
              {log.level === LogLevel.NORMAL && <ShieldAlert className="text-green-500" />}
              {log.level} Event Detected
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-mono">ID: {log.id} | {log.timestamp}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Raw Data Section */}
          <div className="bg-cyber-900 rounded-lg p-4 border border-cyber-700">
            <h3 className="text-sm font-bold text-slate-300 uppercase mb-2">Log Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div><span className="text-slate-500">Source:</span> <span className="text-white">{log.source}</span></div>
              <div><span className="text-slate-500">Event Code:</span> <span className="text-white">{log.eventCode}</span></div>
            </div>
            <div className="bg-black/40 p-3 rounded text-xs font-mono text-green-400 overflow-x-auto border border-white/5">
              {log.rawDetails || log.message}
            </div>
          </div>

          {/* AI Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
                <Bot size={16} /> AI Analysis
              </h3>
              {!analysis && !loading && (
                <button
                  onClick={handleAnalyze}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                  Analyze Threat
                </button>
              )}
            </div>

            {loading && (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 bg-cyber-900/50 rounded-lg border border-cyber-700 border-dashed animate-pulse">
                <Bot size={32} className="mb-2 text-blue-500 animate-bounce" />
                <p>Analyzing behavioral patterns...</p>
              </div>
            )}

            {analysis && (
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-5 border border-blue-500/30 text-slate-200 text-sm leading-relaxed shadow-inner">
                <ReactMarkdown components={markdownComponents}>{analysis}</ReactMarkdown>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-700 bg-cyber-900/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
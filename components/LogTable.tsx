import React from 'react';
import { LogEntry, LogLevel } from '../types';
import { AlertTriangle, AlertOctagon, CheckCircle, Download } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  onLogClick: (log: LogEntry) => void;
}

const LogTable: React.FC<LogTableProps> = ({ logs, onLogClick }) => {
  const handleExportLogs = () => {
    if (logs.length === 0) return;

    // Get headers from the first log
    const headers = Object.keys(logs[0]).join(',');
    
    // Create CSV rows
    const csvRows = logs.map(log => {
      return Object.values(log).map(val => {
        // Escape quotes and wrap in quotes if contains comma
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      }).join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');
    
    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `siem-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.CRITICAL: return <AlertOctagon size={16} className="text-alert-critical" />;
      case LogLevel.ANOMALY: return <AlertTriangle size={16} className="text-alert-anomaly" />;
      default: return <CheckCircle size={16} className="text-alert-normal" />;
    }
  };

  const getRowClass = (level: LogLevel) => {
    switch (level) {
      case LogLevel.CRITICAL: return 'bg-red-900/10 border-l-2 border-l-red-500 hover:bg-red-900/20';
      case LogLevel.ANOMALY: return 'bg-orange-900/10 border-l-2 border-l-orange-500 hover:bg-orange-900/20';
      default: return 'hover:bg-cyber-700/50 border-l-2 border-l-transparent';
    }
  };

  return (
    <div className="bg-cyber-800 rounded-xl border border-cyber-700 overflow-hidden shadow-lg flex flex-col h-[500px]">
      <div className="p-4 border-b border-cyber-700 flex justify-between items-center bg-cyber-800/80 backdrop-blur">
        <h3 className="font-bold text-white flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Live Log Stream
        </h3>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <button 
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors text-white ${logs.length === 0 ? 'bg-cyber-700/50 cursor-not-allowed opacity-50' : 'bg-cyber-700 hover:bg-cyber-600'}`}
            title="Export logs to CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          <span>{logs.length} logs collected</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {logs.length === 0 && (
          <div className="text-center py-20 text-slate-500">Waiting for system logs...</div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            onClick={() => onLogClick(log)}
            className={`p-3 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-between group ${getRowClass(log.level)} ${log.isNew ? 'animate-in fade-in slide-in-from-right-4 duration-500' : ''}`}
          >
            <div className="flex items-center space-x-4">
              <div className="font-mono text-xs text-slate-500 w-20 shrink-0">
                {(() => {
                  try {
                    if (log.timestamp.includes('T')) return log.timestamp.split('T')[1].split('.')[0];
                    const d = new Date(log.timestamp);
                    return !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour12: false }) : log.timestamp.split(' ')[1] || log.timestamp;
                  } catch { return '00:00:00'; }
                })()}
              </div>
              <div className="flex items-center space-x-2 w-24 shrink-0">
                {getIcon(log.level)}
                <span className={`text-xs font-bold uppercase tracking-wider ${log.level === LogLevel.CRITICAL ? 'text-red-400' :
                  log.level === LogLevel.ANOMALY ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                  {log.level}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-slate-200 font-medium group-hover:text-white">
                  {log.message}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Src: {log.source} | Evt: {log.eventCode}
                </span>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 font-medium transition-opacity">
              Analyze AI &rarr;
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogTable;
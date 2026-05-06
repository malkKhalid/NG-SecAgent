import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { OSType, LogEntry, LogLevel } from './types';
import { generateMockLog } from './services/mockDataService';
import { apiService } from './services/apiService';
import LogTable from './components/LogTable';
import AnalysisModal from './components/AnalysisModal';
import { Server, Settings, Database, Network } from 'lucide-react';

// --- Placeholder Components for Missing Pages ---

const LiveStreamPage = ({ osType }: { osType: OSType }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [logsData, statusData] = await Promise.all([
          apiService.getLogs(),
          apiService.getStatus()
        ]);
        setLogs(logsData);
        setAiStatus(statusData.ai_status);
      } catch (error) {
        console.error("Error fetching live stream:", error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 800); // Fast polling for live feel
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Security Stream</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            AI Model Status: <span className={aiStatus === 'Trained' ? "text-green-400" : "text-yellow-400"}>{aiStatus}</span>
            {aiStatus === 'Training' && " (Learning from your local logs...)"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {logs.length > 0 && logs[0].is_simulated && (
            <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/50 animate-pulse">
              ⚠ SIMULATION MODE
            </span>
          )}
          <span className="text-emerald-500 animate-pulse flex items-center gap-2 text-sm font-bold">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            REALTIME CONNECTION ACTIVE
          </span>
        </div>
      </div>
      <div className="flex-1 bg-cyber-800 rounded-xl border border-cyber-700 overflow-hidden flex flex-col">
        <LogTable logs={logs} onLogClick={setSelectedLog} />
      </div>
      {selectedLog && <AnalysisModal log={selectedLog} osType={osType} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}

const AssetsPage = ({ osType, systemInfo }: { osType: OSType, systemInfo: any }) => (
  <div className="space-y-6 text-slate-300">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
      <Server className="text-purple-500" /> Managed Assets
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-cyber-800 p-6 rounded-xl border border-cyber-700">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-cyber-700 pb-2">Host Machine</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Hostname</span>
            <span className="font-mono text-white">{systemInfo?.hostname || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">OS</span>
            <span className="font-mono text-blue-400">{osType} {systemInfo?.release || ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Architecture</span>
            <span className="font-mono text-white">{systemInfo?.machine || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Processor</span>
            <span className="font-mono text-white text-xs">{systemInfo?.processor || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs uppercase">Online</span>
          </div>
        </div>
      </div>

      <div className="bg-cyber-800 p-6 rounded-xl border border-cyber-700">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-cyber-700 pb-2">Network Interface</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-500">IP Address</span>
            <span className="font-mono text-white">{systemInfo?.ip || '127.0.0.1'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">MAC Address</span>
            <span className="font-mono text-white">{systemInfo?.mac || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bandwidth</span>
            <span className="font-mono text-white">1.0 Gbps</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ConfigPage = () => (
  <div className="max-w-3xl mx-auto text-slate-300">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
      <Settings className="text-slate-400" /> System Configuration
    </h2>

    <div className="bg-cyber-800 rounded-xl border border-cyber-700 overflow-hidden">
      <div className="p-6 border-b border-cyber-700">
        <h3 className="font-bold text-white mb-2">Backend Connection</h3>
        <p className="text-sm text-slate-500 mb-4">Configure the Python log collector endpoint.</p>
        <div className="flex gap-4">
          <input type="text" value="http://localhost:5000/api/stream" className="flex-1 bg-cyber-900 border border-cyber-700 rounded p-2 text-white" readOnly />
          <button className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-500">Test Connection</button>
        </div>
      </div>

      <div className="p-6 border-b border-cyber-700">
        <h3 className="font-bold text-white mb-2">AI Thresholds</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">Anomaly Confidence Score</label>
            <input type="range" className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs"><span>Low Sensitivity</span><span>High Sensitivity</span></div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-cyber-900/50">
        <button className="text-red-400 hover:text-red-300 text-sm font-medium">Reset Factory Settings</button>
      </div>
    </div>
  </div>
);

// --- Main App ---

function App() {
  const [osType, setOsType] = useState<OSType>(OSType.LINUX);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const detectSystem = async () => {
      try {
        const data = await apiService.getStatus();
        if (data.os_info) {
          setOsType(data.os_info.os === 'Windows' ? OSType.WINDOWS : OSType.LINUX);
          setSystemInfo(data.os_info);
        }
      } catch (e) {
        console.error("Failed to connect to backend", e);
      } finally {
        setLoading(false);
      }
    };

    detectSystem();
    // Poll status every 10 seconds to check connection
    const interval = setInterval(detectSystem, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-cyber-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold tracking-widest animate-pulse">SENTINEL AI-SIEM</h2>
        <p className="text-slate-500 text-sm mt-2">Initializing Python Backend Bridge...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard osType={osType} />;
      case 'live': return <LiveStreamPage osType={osType} />;
      case 'assets': return <AssetsPage osType={osType} systemInfo={systemInfo} />;
      case 'config': return <ConfigPage />;
      default: return <Dashboard osType={osType} />;
    }
  };

  return (
    <Layout osType={osType} activePage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
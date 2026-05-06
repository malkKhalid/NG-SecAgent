import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Activity,
  Database,
  Cpu,
  ArrowLeft,
  Filter,
  Upload,
  Pause,
  Play,
  Search
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import StatsCard from '../components/StatsCard';
import LogTable from '../components/LogTable';
import AnalysisModal from '../components/AnalysisModal';
import { generateMockLog } from '../services/mockDataService';
import { apiService } from '../services/apiService';
import { LogEntry, LogLevel, SystemStats, OSType } from '../types';

const COLORS = {
  [LogLevel.NORMAL]: '#10b981',
  [LogLevel.ANOMALY]: '#f97316',
  [LogLevel.CRITICAL]: '#ef4444'
};

interface DashboardProps {
  osType: OSType;
}

const Dashboard: React.FC<DashboardProps> = ({ osType }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [filterLevel, setFilterLevel] = useState<LogLevel | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<LogLevel[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<SystemStats>({
    totalLogs: 0,
    anomalies: 0,
    criticals: 0,
    os: osType,
    status: 'Analyzing',
    cpuLoad: 12
  });

  // Simulation Logic: Add new log every few seconds
  // Polling Logic: Fetch logs from backend
  useEffect(() => {
    if (isPaused) return;

    const fetchLogs = async () => {
      const newLogs = await apiService.getLogs();
      const systemStats = await apiService.getStats();

      if (newLogs.length > 0) {
        setLogs(newLogs);
      }

      setStats(prev => ({
        ...prev,
        ...systemStats,
        cpuLoad: Math.floor(Math.random() * (40 - 5) + 5) // Keep simulated CPU for now or fetch real if added to backend
      }));
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 800);

    return () => clearInterval(interval);
  }, [osType, isPaused]);

  // Remove "isNew" flag after animation
  useEffect(() => {
    if (logs.length > 0 && logs[0].isNew) {
      const timer = setTimeout(() => {
        setLogs(prev => prev.map((l, i) => i === 0 ? { ...l, isNew: false } : l));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  const addLogToState = (newLog: LogEntry) => {
    setLogs(prevLogs => {
      const updated = [newLog, ...prevLogs]; // Keep all logs
      return updated;
    });

    setStats(prev => ({
      ...prev,
      totalLogs: prev.totalLogs + 1,
      anomalies: newLog.level === LogLevel.ANOMALY ? prev.anomalies + 1 : prev.anomalies,
      criticals: newLog.level === LogLevel.CRITICAL ? prev.criticals + 1 : prev.criticals,
      cpuLoad: Math.floor(Math.random() * (40 - 5) + 5)
    }));
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseUploadedLogs(text);
    };
    reader.readAsText(file);

    // Pause simulation so user can see their uploaded logs
    setIsPaused(true);
  };

  const parseUploadedLogs = (text: string) => {
    const lines = text.split('\n');
    let importedCount = 0;

    lines.forEach((line) => {
      if (!line.trim()) return;

      // Simple heuristic parsing
      let level = LogLevel.NORMAL;
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('error') || lowerLine.includes('fail') || lowerLine.includes('critical') || lowerLine.includes('panic')) {
        level = LogLevel.CRITICAL;
      } else if (lowerLine.includes('warn') || lowerLine.includes('denied') || lowerLine.includes('unauthorized')) {
        level = LogLevel.ANOMALY;
      }

      const newLog: LogEntry = {
        id: `imported - ${Math.random().toString(36).substr(2, 9)} `,
        timestamp: new Date().toISOString(),
        level: level,
        source: 'Imported File',
        eventCode: 'FILE_READ',
        message: line.substring(0, 80) + (line.length > 80 ? '...' : ''),
        rawDetails: line,
        isNew: true
      };

      // Add with a slight delay for visual effect or batch add
      addLogToState(newLog);
      importedCount++;
    });

    alert(`Imported ${importedCount} logs from file.Simulation paused.`);
  };

  // --- CHART DATA TRANSFORM ---
  const getChartData = () => {
    const data = [
      { name: LogLevel.NORMAL, value: stats.totalLogs - (stats.anomalies + stats.criticals) },
      { name: LogLevel.ANOMALY, value: stats.anomalies },
      { name: LogLevel.CRITICAL, value: stats.criticals },
    ];
    return data;
  };

  const getTimelineData = () => {
    return logs.slice(0, 30).reverse().map(l => {
      let timeStr = '';
      try {
        if (l.timestamp.includes('T')) {
          timeStr = l.timestamp.split('T')[1].split('.')[0];
        } else {
          // Fallback for non-ISO strings
          const date = new Date(l.timestamp);
          if (!isNaN(date.getTime())) {
            timeStr = date.toLocaleTimeString([], { hour12: false });
          } else {
            timeStr = l.timestamp.split(' ')[1] || l.timestamp;
          }
        }
      } catch (e) {
        timeStr = '00:00:00';
      }

      return {
        time: timeStr,
        severity: l.level === LogLevel.CRITICAL ? 3 : l.level === LogLevel.ANOMALY ? 2 : 1
      };
    });
  };

  // Advanced filtering: search + multi-level filter
  const filteredLogs = logs.filter(log => {
    // Search filter (case-insensitive, searches all fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        log.id.toLowerCase().includes(query) ||
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        log.eventCode.toString().toLowerCase().includes(query) ||
        (log.rawDetails && log.rawDetails.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    // Level filter (single filter for backward compatibility)
    if (filterLevel && log.level !== filterLevel) return false;

    // Multi-level filter (new feature)
    if (selectedFilters.length > 0 && !selectedFilters.includes(log.level)) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center space-x-3 mb-2">
        {/* Left side: Search and Filter */}
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs (ID, message, source...)"
              className="bg-cyber-800 border border-cyber-700 text-sm rounded-md px-3 py-2 pl-9 focus:outline-none focus:border-blue-500 text-slate-300 w-80"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Multi-Select Filter Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-cyber-800 text-slate-300 border border-cyber-700 rounded-md text-sm font-medium hover:border-blue-500 transition-colors"
            >
              <Filter size={16} />
              <span>Filter by Level</span>
              {selectedFilters.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                  {selectedFilters.length}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            <div className="absolute left-0 mt-2 w-56 bg-cyber-800 border border-cyber-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-3 space-y-2">
                <div className="text-xs text-slate-400 uppercase font-bold mb-2">Select Levels</div>

                {[LogLevel.CRITICAL, LogLevel.ANOMALY, LogLevel.NORMAL].map((level) => (
                  <label
                    key={level}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-cyber-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(level)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFilters([...selectedFilters, level]);
                        } else {
                          setSelectedFilters(selectedFilters.filter(f => f !== level));
                        }
                      }}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className={`text - sm font - medium ${level === LogLevel.CRITICAL ? 'text-red-400' :
                      level === LogLevel.ANOMALY ? 'text-orange-400' : 'text-emerald-400'
                      } `}>
                      {level}
                    </span>
                  </label>
                ))}

                {selectedFilters.length > 0 && (
                  <button
                    onClick={() => setSelectedFilters([])}
                    className="w-full mt-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs font-medium hover:bg-red-500/30 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedFilters.length > 0) && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Showing {filteredLogs.length} of {logs.length} logs</span>
              <button
                onClick={() => setShowSearchResults(!showSearchResults)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-all"
              >
                {showSearchResults ? 'Hide Results' : 'Show Results'}
              </button>
            </div>
          )}
        </div>

        {/* Right side: Pause and Import buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold border transition-all shadow-lg ${isPaused
                ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 shadow-green-900/20'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-500 shadow-yellow-900/20'
              }`}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold shadow-lg shadow-blue-900/20 transition-all"
          >
            <Upload size={14} />
            <span>IMPORT LOG FILE</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".txt,.log,.csv"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Events"
          value={stats.totalLogs}
          icon={<Database size={40} />}
          colorClass="text-blue-500"
          trend={isPaused ? "Paused" : "+12/sec"}
          onClick={() => setFilterLevel(null)}
        />
        <StatsCard
          title="Critical Threats"
          value={stats.criticals}
          icon={<ShieldAlert size={40} />}
          colorClass="text-red-500"
          trend={(stats.criticals / Math.max(stats.totalLogs, 1) * 100).toFixed(1) + "% Rate"}
          onClick={() => setFilterLevel(LogLevel.CRITICAL)}
        />
        <StatsCard
          title="Anomalies (AI)"
          value={stats.anomalies}
          icon={<Activity size={40} />}
          colorClass="text-orange-500"
          trend="Behavioral Analysis"
          onClick={() => setFilterLevel(LogLevel.ANOMALY)}
        />
        <StatsCard
          title="System Load"
          value={`${stats.cpuLoad}% `}
          icon={<Cpu size={40} />}
          colorClass="text-emerald-500"
          trend="Optimal"
          onClick={() => setFilterLevel(LogLevel.NORMAL)}
        />
      </div>

      {showSearchResults && (searchQuery || selectedFilters.length > 0) ? (
        /* Search Results Panel */
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 bg-cyber-800 rounded-xl border border-cyber-700 p-6 min-h-[600px]">
          <div className="flex items-center justify-between mb-6 border-b border-cyber-700 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSearchResults(false)}
                className="flex items-center gap-2 px-4 py-2 bg-cyber-900 text-slate-300 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-cyber-700"
              >
                <ArrowLeft size={18} /> Back to Dashboard
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Search className="text-blue-500" />
                  Search Results
                </h2>
                <p className="text-sm text-slate-500">
                  {searchQuery && `Searching for: "${searchQuery}"`}
                  {searchQuery && selectedFilters.length > 0 && ' | '}
                  {selectedFilters.length > 0 && `Filters: ${selectedFilters.join(', ')}`}
                </p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-full text-sm font-bold bg-blue-500/20 text-blue-500 border border-blue-500">
              {filteredLogs.length} Results Found
            </div>
          </div>

          <div className="h-[calc(100vh-350px)]">
            <LogTable logs={filteredLogs} onLogClick={setSelectedLog} />
          </div>
        </div>
      ) : filterLevel ? (
        /* Filtered View Page */
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 bg-cyber-800 rounded-xl border border-cyber-700 p-6 min-h-[600px]">
          <div className="flex items-center justify-between mb-6 border-b border-cyber-700 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilterLevel(null)}
                className="flex items-center gap-2 px-4 py-2 bg-cyber-900 text-slate-300 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-cyber-700"
              >
                <ArrowLeft size={18} /> Back to Dashboard
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Filter className="text-blue-500" />
                  {filterLevel} Events
                </h2>
                <p className="text-sm text-slate-500">Filtering all system logs for {filterLevel} severity</p>
              </div>
            </div>
            <div className={`px - 4 py - 2 rounded - full text - sm font - bold bg - opacity - 20 border ${filterLevel === LogLevel.CRITICAL ? 'bg-red-500 text-red-500 border-red-500' :
              filterLevel === LogLevel.ANOMALY ? 'bg-orange-500 text-orange-500 border-orange-500' :
                'bg-green-500 text-green-500 border-green-500'
              } `}>
              {filteredLogs.length} Records Found
            </div>
          </div>

          <div className="h-[calc(100vh-350px)]">
            <LogTable logs={filteredLogs} onLogClick={setSelectedLog} />
          </div>
        </div>
      ) : (
        /* Standard Dashboard View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">

          {/* Left Column: Visualizations */}
          <div className="lg:col-span-1 space-y-6">

            {/* Distribution Chart - INCREASED HEIGHT HERE */}
            <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 shadow-lg flex flex-col justify-between h-[500px]">
              <div>
                <h3 className="text-white font-bold mb-1 text-sm uppercase tracking-wider">Threat Distribution</h3>
                <p className="text-xs text-slate-500">Click slices to filter logs</p>
              </div>

              <div className="flex-1 w-full flex items-center justify-center py-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      cursor="pointer"
                      onClick={(data) => {
                        if (data && data.name) setFilterLevel(data.name as LogLevel);
                      }}
                    >
                      <Cell fill={COLORS[LogLevel.NORMAL]} stroke="none" />
                      <Cell fill={COLORS[LogLevel.ANOMALY]} stroke="none" />
                      <Cell fill={COLORS[LogLevel.CRITICAL]} stroke="none" />
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-5 shadow-lg hidden md:block">
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Real-time Activity Severity</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getTimelineData()}>
                    <defs>
                      <linearGradient id="colorSev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="severity"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorSev)"
                      isAnimationActive={!isPaused}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column: Data Table */}
          <div className="lg:col-span-2">
            <LogTable logs={logs} onLogClick={setSelectedLog} />
          </div>
        </div>
      )}

      {/* Modal for Details */}
      {selectedLog && (
        <AnalysisModal
          log={selectedLog}
          osType={osType}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
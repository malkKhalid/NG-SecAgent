export enum LogLevel {
  NORMAL = 'Normal',
  ANOMALY = 'Anomaly',
  CRITICAL = 'Critical'
}

export enum OSType {
  WINDOWS = 'Windows',
  LINUX = 'Linux'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string; // e.g., "Security", "Auth", "Kernel"
  eventCode: string | number;
  message: string;
  rawDetails: string;
  isNew?: boolean; // For animation
  is_simulated?: boolean;
}

export interface SystemStats {
  totalLogs: number;
  anomalies: number;
  criticals: number;
  os: OSType;
  status: 'Online' | 'Offline' | 'Analyzing';
  cpuLoad: number;
}
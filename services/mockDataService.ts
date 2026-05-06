import { LogEntry, LogLevel, OSType } from '../types';

/**
 * SIMULATION NOTE:
 * In the real deployment, this data would come from your Python Backend
 * via an API endpoint (e.g., GET /api/logs/stream).
 * 
 * Here, we generate realistic looking logs for Windows and Linux to demonstrate the UI.
 */

const WINDOWS_SOURCES = ['Security', 'System', 'Application', 'Windows Defender'];
const LINUX_SOURCES = ['sshd', 'kernel', 'sudo', 'systemd', 'cron'];

const WINDOWS_MESSAGES = [
  { msg: "Successful logon", code: 4624, level: LogLevel.NORMAL },
  { msg: "Process creation", code: 4688, level: LogLevel.NORMAL },
  { msg: "Account locked out", code: 4740, level: LogLevel.ANOMALY },
  { msg: "Failed logon attempt", code: 4625, level: LogLevel.ANOMALY },
  { msg: "Clearing of event logs", code: 1102, level: LogLevel.CRITICAL },
  { msg: "Suspicious PowerShell execution", code: 4104, level: LogLevel.CRITICAL },
  { msg: "Service installed", code: 7045, level: LogLevel.ANOMALY },
];

const LINUX_MESSAGES = [
  { msg: "Accepted publickey for user root", code: "auth", level: LogLevel.NORMAL },
  { msg: "Session opened for user ubuntu", code: "auth", level: LogLevel.NORMAL },
  { msg: "Failed password for invalid user admin", code: "auth", level: LogLevel.ANOMALY },
  { msg: "sudo: 3 incorrect password attempts", code: "sudo", level: LogLevel.ANOMALY },
  { msg: "SEGFAULT at ip 00007f...", code: "kernel", level: LogLevel.CRITICAL },
  { msg: "Root login permitted from unknown IP", code: "sshd", level: LogLevel.CRITICAL },
  { msg: "New cron job added by user www-data", code: "cron", level: LogLevel.ANOMALY },
];

export const generateMockLog = (os: OSType): LogEntry => {
  const isWindows = os === OSType.WINDOWS;
  const templates = isWindows ? WINDOWS_MESSAGES : LINUX_MESSAGES;
  const sources = isWindows ? WINDOWS_SOURCES : LINUX_SOURCES;
  
  // Weighted random to favor Normal logs (80%), Anomaly (15%), Critical (5%)
  const rand = Math.random();
  let selectedTemplate;
  
  if (rand > 0.95) {
    selectedTemplate = templates.filter(t => t.level === LogLevel.CRITICAL)[0] || templates[0];
  } else if (rand > 0.80) {
    selectedTemplate = templates.filter(t => t.level === LogLevel.ANOMALY)[0] || templates[0];
    // Randomly pick another anomaly sometimes
    if(Math.random() > 0.5) selectedTemplate = templates.filter(t => t.level === LogLevel.ANOMALY)[1] || selectedTemplate;
  } else {
    selectedTemplate = templates.filter(t => t.level === LogLevel.NORMAL)[0] || templates[0];
    if(Math.random() > 0.5) selectedTemplate = templates.filter(t => t.level === LogLevel.NORMAL)[1] || selectedTemplate;
  }

  const source = sources[Math.floor(Math.random() * sources.length)];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level: selectedTemplate.level,
    source: source,
    eventCode: selectedTemplate.code,
    message: selectedTemplate.msg,
    rawDetails: `Raw log content would appear here. Context: User=System, PID=${Math.floor(Math.random() * 9999)}, Host=${isWindows ? 'WIN-SERVER-01' : 'linux-prod-01'}`,
    isNew: true
  };
};
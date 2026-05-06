import { LogEntry, LogLevel } from '../types';

export const analyzeLogLocal = async (log: LogEntry): Promise<string> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  let analysis = `### AI Behavioral Analysis\n\n`;
  const msg = log.message.toLowerCase();
  const raw = log.rawDetails.toLowerCase();

  // --- Dynamic Context Extraction ---

  // 1. Login/Auth Events
  if (msg.includes('logon') || msg.includes('login') || log.eventCode === '4624' || log.eventCode === '4625') {
    analysis += `**Category:** Identity & Access Management\n`;
    if (msg.includes('fail') || log.eventCode === '4625') {
      analysis += `**Threat Level:** HIGH (Failed Login)\n\n`;
      analysis += `The system detected a failed authentication attempt. This could be a user mistyping a password, or a brute-force attack attempt.\n`;
      analysis += `**Action:** Check if multiple failures occurred from the same IP/User in a short time.`;
    } else {
      analysis += `**Threat Level:** LOW (Successful Login)\n\n`;
      analysis += `A user successfully authenticated to the system. This is normal behavior unless it occurred at an unusual time (e.g., 3 AM) or from an unauthorized location.\n`;
    }
  }
  // 2. Process/Service Events
  else if (msg.includes('process') || msg.includes('service') || msg.includes('start') || msg.includes('stop')) {
    analysis += `**Category:** System Execution\n`;
    analysis += `**Threat Level:** NORMAL\n\n`;
    analysis += `The system recorded a service or process state change. \n`;
    analysis += `**Details:** The operating system started or stopped a background task. This is routine maintenance or application activity.\n`;
    analysis += `**Verify:** Ensure the service name in the details is a known trusted application.`;
  }
  // 3. Network/Firewall
  else if (msg.includes('connection') || msg.includes('firewall') || msg.includes('listen')) {
    analysis += `**Category:** Network Security\n`;
    analysis += `**Threat Level:** MODERATE\n\n`;
    analysis += `Network activity detected. The firewall or network stack reported a connection event.\n`;
    analysis += `**Context:** If this is an inbound connection to a sensitive port (RDP/SSH), verify the source IP.`;
  }
  // 4. Critical Errors
  else if (log.level === LogLevel.CRITICAL || msg.includes('error') || msg.includes('fail') || msg.includes('panic')) {
    analysis += `**Category:** System Stability / Critical Failure\n`;
    analysis += `**Threat Level:** CRITICAL\n\n`;
    analysis += `A critical system error occurred. This indicates a software crash, hardware fault, or security violation that the OS could not recover from gracefully.\n`;
    analysis += `**Recommendation:** Review the full stack trace in the 'Raw Details' section immediately.`;
  }
  // 5. Default / Anomaly
  else if (log.level === LogLevel.ANOMALY) {
    analysis += `**Category:** Behavioral Anomaly\n`;
    analysis += `**Threat Level:** ANOMALY\n\n`;
    analysis += `The AI model flagged this event because it deviates from the standard baseline. It contains keywords or patterns not typically seen in this environment.\n`;
  }
  else {
    analysis += `**Category:** Routine Operation\n`;
    analysis += `**Threat Level:** NORMAL\n\n`;
    analysis += `This is a standard informational event. No security risks detected. The system is operating within normal parameters.`;
  }

  return analysis;
};
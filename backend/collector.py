import platform
import subprocess
import time
import json
import random
import socket
import uuid
from datetime import datetime
import psutil

class LogCollector:
    def __init__(self):
        self.os_type = self.detect_os()

    def detect_os(self):
        system = platform.system()
        if system == 'Windows':
            return 'Windows'
        elif system == 'Linux':
            return 'Linux'
        else:
            return 'Unknown'

    def get_system_info(self):
        # Get Network Info
        ip_address = "127.0.0.1"
        mac_address = "Unknown"
        try:
            # Get primary IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0)
            try:
                # doesn't even have to be reachable
                s.connect(('10.254.254.254', 1))
                ip_address = s.getsockname()[0]
            except Exception:
                ip_address = '127.0.0.1'
            finally:
                s.close()
            
            # Get MAC (first interface)
            addrs = psutil.net_if_addrs()
            for name, snics in addrs.items():
                for snic in snics:
                    if snic.family == psutil.AF_LINK:
                        mac_address = snic.address
                        break
                if mac_address != "Unknown": break
        except Exception as e:
            print(f"Error getting network info: {e}")

        info = {
            'os': self.os_type,
            'hostname': platform.node(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'ip': ip_address,
            'mac': mac_address
        }
        return info

    def collect_logs(self):
        """
        Collects logs based on the OS.
        Returns a list of log dictionaries.
        """
        if self.os_type == 'Windows':
            return self._collect_windows_logs()
        elif self.os_type == 'Linux':
            return self._collect_linux_logs()
        else:
            return []

    def _collect_windows_logs(self):
        logs = []
        # Priority: Security (Audits), System (Services), Application (Software)
        log_channels = ['Security', 'System', 'Application']
        
        collected_any = False

        for channel in log_channels:
            try:
                # Get last 10 events. 
                # We select specific properties to ensure we get useful info.
                # 'Message' contains the rich text details.
                ps_script = f"""
                Get-EventLog -LogName {channel} -Newest 5 -ErrorAction SilentlyContinue | 
                Select-Object TimeGenerated, EntryType, Source, InstanceId, Message, UserName | 
                ConvertTo-Json -Compress
                """
                
                # Run PowerShell command
                result = subprocess.run(["powershell", "-Command", ps_script], capture_output=True, text=True)
                
                if result.returncode != 0 or not result.stdout.strip():
                    continue

                try:
                    data = json.loads(result.stdout)
                    if isinstance(data, dict):
                        data = [data]
                        
                    for entry in data:
                        # Parse Timestamp
                        ts_str = entry.get('TimeGenerated')
                        timestamp = datetime.now().isoformat()
                        
                        if ts_str:
                            try:
                                # PowerShell ConvertTo-Json might return /Date(ms)/ or generic string
                                if "/Date(" in str(ts_str):
                                    # Extract ms
                                    ms = int(ts_str.replace("/Date(", "").replace(")/", ""))
                                    timestamp = datetime.fromtimestamp(ms/1000.0).isoformat()
                                else:
                                    # Try parsing common formats or just leave it if it looks like ISO
                                    # But for safety, let's try to parse it if we can, otherwise use current time to avoid frontend crash
                                    # Actually, let's just use the string if it looks sane, but frontend expects 'T'
                                    if 'T' not in str(ts_str):
                                        # Attempt to convert "11/24/2025 1:00:00 PM" to ISO
                                        # This is complex to guess locale. 
                                        # SAFEST: Use current time for display if format is unknown, 
                                        # OR append 'T' dummy if missing.
                                        # Let's try to trust the system time for the log if we can't parse.
                                        pass 
                                    else:
                                        timestamp = str(ts_str)
                            except Exception:
                                pass # Keep default now()


                        # Parse Message (The most important part)
                        full_message = entry.get('Message', '')
                        
                        # Clean up "Description cannot be found" error
                        if "description for Event ID" in full_message and "cannot be found" in full_message:
                            # Try to extract useful info from ReplacementStrings if they exist (usually at end)
                            # Or just use the Source + EventID as the message
                            full_message = f"Event {entry.get('InstanceId', 'Unknown')} from {entry.get('Source', 'Unknown')}"
                            
                        # Clean up message (remove newlines for summary)
                        summary_message = full_message.split('\n')[0][:100] if full_message else "No details provided"
                        
                        # Determine Level
                        entry_type = entry.get('EntryType', 0) # 1=Error, 2=Warning, 4=Info, 8=SuccessAudit, 16=FailureAudit
                        level = 'Normal'
                        if entry_type == 1 or entry_type == 16: # Error or Failure Audit
                            level = 'Critical'
                        elif entry_type == 2: # Warning
                            level = 'Anomaly'
                        
                        # Create Log Object
                        log_obj = {
                            'id': str(uuid.uuid4()), # Generate new ID to avoid React key issues
                            'timestamp': timestamp,
                            'level': level,
                            'source': f"{entry.get('Source', 'Windows')} ({channel})",
                            'eventCode': str(entry.get('InstanceId', '0')),
                            'message': summary_message,
                            'rawDetails': full_message, # Store full text for the modal
                            'is_simulated': False,
                            'user': entry.get('UserName', 'N/A')
                        }
                        logs.append(log_obj)
                        collected_any = True

                except json.JSONDecodeError:
                    continue

            except Exception as e:
                print(f"Error reading {channel}: {e}")
                continue

        return logs

    def _collect_linux_logs(self):
        logs = []
        try:
            log_file = '/var/log/auth.log'
            if not os.path.exists(log_file):
                log_file = '/var/log/syslog'
                
            with open(log_file, 'r') as f:
                lines = f.readlines()[-5:]
                for line in lines:
                    parts = line.split()
                    if len(parts) > 4:
                        logs.append({
                            'id': str(uuid.uuid4()),
                            'timestamp': f"{parts[0]} {parts[1]} {parts[2]}",
                            'level': 'Normal',
                            'source': 'LinuxSys',
                            'eventCode': 'SYSLOG',
                            'message': " ".join(parts[4:])[:200],
                            'rawDetails': line.strip(),
                            'is_simulated': False
                        })
        except Exception as e:
            # print(f"Error collecting Linux logs: {e}")
            pass
            
        return logs

    def generate_mock_log(self):
        """Fallback for demonstration if real logs aren't accessible"""
        sources = ['Security', 'System', 'Application', 'Firewall']
        messages = [
            'Successful logon', 'Failed password for user root', 'Connection accepted', 
            'Process started', 'File integrity check passed', 'Outbound connection blocked'
        ]
        
        return {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'level': 'Normal',
            'source': random.choice(sources),
            'eventCode': str(random.randint(1000, 9999)),
            'message': random.choice(messages),
            'rawDetails': 'Generated mock log for demonstration',
            'is_simulated': True
        }

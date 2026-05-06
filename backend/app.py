from flask import Flask, jsonify, request
from flask_cors import CORS
from collector import LogCollector
from analysis import LogAnalyzer
import threading
import time
import uuid

app = Flask(__name__)
CORS(app)

# Initialize modules
collector = LogCollector()
analyzer = LogAnalyzer()

# In-memory storage
logs_buffer = []
MAX_LOGS = 10000  # Increased to store more logs for comprehensive history

# Global Cumulative Stats
stats_counters = {
    'total': 0,
    'anomalies': 0,
    'criticals': 0
}

def background_collection():
    """Background thread to collect and analyze logs continuously."""
    global logs_buffer, stats_counters
    print("Starting background log collection...")
    while True:
        try:
            new_logs = collector.collect_logs()
            
            # If no real logs found, generate mock for demo if needed
            if not new_logs:
                # In a real scenario, we might just wait. 
                # For this demo, we'll generate a mock log occasionally to keep the dashboard alive
                if len(logs_buffer) < 5 or int(time.time()) % 5 == 0:
                    new_logs = [collector.generate_mock_log()]
            
            for log in new_logs:
                # Analyze
                analyzed_log = analyzer.analyze(log)
                
                # Add ID if missing
                if 'id' not in analyzed_log:
                    analyzed_log['id'] = str(uuid.uuid4())
                
                # Check if this log ID is already in buffer to prevent duplicates (simple check)
                # In high volume, use a set for O(1)
                if any(l['id'] == analyzed_log['id'] for l in logs_buffer[:50]):
                    continue

                # Update Cumulative Stats
                stats_counters['total'] += 1
                if analyzed_log['level'] == 'Anomaly':
                    stats_counters['anomalies'] += 1
                elif analyzed_log['level'] == 'Critical':
                    stats_counters['criticals'] += 1
                
                # Add to buffer
                logs_buffer.insert(0, analyzed_log)
                
            # Trim buffer
            if len(logs_buffer) > MAX_LOGS:
                logs_buffer = logs_buffer[:MAX_LOGS]
                
        except Exception as e:
            print(f"Error in background collection: {e}")
            
        time.sleep(0.5) # Collect every 0.5 seconds (Faster)

# Start background thread
collection_thread = threading.Thread(target=background_collection, daemon=True)
collection_thread.start()

@app.route('/api/status', methods=['GET'])
def get_status():
    info = collector.get_system_info()
    training_count = len(analyzer.training_data)
    buffer_size = analyzer.training_buffer_size
    
    ai_status = 'Trained' if analyzer.is_trained else f'Training ({training_count}/{buffer_size})'
    
    return jsonify({
        'status': 'Online',
        'os_info': info,
        'ai_status': ai_status
    })

@app.route('/api/logs', methods=['GET'])
def get_logs():
    return jsonify(logs_buffer)  # Return all collected logs

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify({
        'totalLogs': stats_counters['total'],
        'anomalies': stats_counters['anomalies'],
        'criticals': stats_counters['criticals'],
        'os': collector.os_type
    })

if __name__ == '__main__':
    print("Starting Local AI-SIEM Backend...")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)

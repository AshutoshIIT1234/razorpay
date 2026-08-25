import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './AuditTrail.css';

const API_URL = 'http://localhost:3000/api/audit';

export default function AuditTrail({ sessionId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/${sessionId}`);
        setLogs(response.data.data);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    // Poll for new logs every 3 seconds for demo purposes
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!sessionId) {
    return <div className="audit-empty">No active session to audit.</div>;
  }

  const getStatusIcon = (outcome) => {
    switch(outcome) {
      case 'SUCCESS': return <CheckCircle size={16} className="text-green-500" />;
      case 'REJECTED': return <XCircle size={16} className="text-red-500" />;
      case 'PENDING': return <Clock size={16} className="text-blue-500" />;
      case 'PENDING_APPROVAL': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="audit-container glass-card">
      <h3>Session Audit Trail</h3>
      <p className="session-id">Session: {sessionId}</p>
      
      {loading && logs.length === 0 ? (
        <p>Loading logs...</p>
      ) : (
        <div className="timeline">
          {logs.map((log) => (
            <div key={log.id} className="timeline-item">
              <div className="timeline-icon">
                {getStatusIcon(log.outcome)}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <strong>{log.action}</strong>
                  <span className="timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                {log.reasoning && <p className="reasoning">{log.reasoning}</p>}
                {log.input_data && (
                  <pre className="input-data">
                    {JSON.stringify(log.input_data, null, 2)}
                  </pre>
                )}
                <div className={`outcome outcome-${log.outcome ? log.outcome.toLowerCase() : 'unknown'}`}>
                  Outcome: {log.outcome || 'N/A'}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p>No actions logged yet.</p>}
        </div>
      )}
    </div>
  );
}

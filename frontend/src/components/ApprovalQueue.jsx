import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, ShieldAlert } from 'lucide-react';
import './ApprovalQueue.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const API_URL = `${BACKEND_URL}/api/approvals`;

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/pending`);
      setApprovals(response.data.data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id, action) => {
    try {
      await axios.post(`${API_URL}/${id}/${action}`);
      fetchApprovals(); // Refresh list
    } catch (error) {
      console.error(`Error processing ${action}:`, error);
    }
  };

  return (
    <div className="approval-container glass-card">
      <div className="approval-header">
        <h3><ShieldAlert size={20} className="text-yellow-500" /> Guardrail Queue</h3>
        <span className="badge">{approvals.length} pending</span>
      </div>

      {loading && approvals.length === 0 ? (
        <p>Loading...</p>
      ) : (
        <div className="approval-list">
          {approvals.map((item) => (
            <div key={item.id} className="approval-item">
              <div className="approval-details">
                <span className="approval-action">Action: {item.action}</span>
                <span className="approval-session">Session: {item.session_id}</span>
                <pre className="approval-data">
                  {JSON.stringify(item.details, null, 2)}
                </pre>
              </div>
              <div className="approval-actions">
                <button 
                  className="btn-approve" 
                  onClick={() => handleAction(item.id, 'approve')}
                  title="Approve"
                >
                  <Check size={18} />
                </button>
                <button 
                  className="btn-reject" 
                  onClick={() => handleAction(item.id, 'reject')}
                  title="Reject"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
          {approvals.length === 0 && <p className="empty-state">No pending approvals.</p>}
        </div>
      )}
    </div>
  );
}

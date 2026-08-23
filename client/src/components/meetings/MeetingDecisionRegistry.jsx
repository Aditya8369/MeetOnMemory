// src/components/meeting/MeetingDecisionRegistry.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const MeetingDecisionRegistry = ({
  meetingId,
  participants = [],
  onDecisionChange,
  initialDecisions = [],
}) => {
  const [decisions, setDecisions] = useState(initialDecisions);
  const [currentDecision, setCurrentDecision] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDecisions = async () => {
      if (!meetingId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/decisions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch meeting decisions');
        }

        const data = await response.json();
        setDecisions(data);
      } catch (err) {
        setError(err.message);
        console.error('Fetch decisions error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDecisions();
  }, [meetingId]);

  const handleAddDecision = useCallback(
    async (decisionData) => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/decisions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...decisionData,
            timestamp: new Date().toISOString(),
            participants: participants.map((p) => p.email),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save decision');
        }

        const newDecision = await response.json();
        const updatedDecisions = [newDecision, ...decisions];
        setDecisions(updatedDecisions);
        setCurrentDecision(newDecision);

        if (onDecisionChange) {
          onDecisionChange(updatedDecisions);
        }

        return newDecision;
      } catch (err) {
        setError(err.message);
        console.error('Save decision error:', err);
        throw err;
      }
    },
    [meetingId, decisions, participants, onDecisionChange]
  );

  const handleUpdateDecision = useCallback(
    async (decisionId, updates) => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/decisions/${decisionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update decision');
        }

        const updatedDecision = await response.json();
        const updatedDecisions = decisions.map((d) =>
          d.id === decisionId ? updatedDecision : d
        );
        setDecisions(updatedDecisions);

        if (currentDecision?.id === decisionId) {
          setCurrentDecision(updatedDecision);
        }

        if (onDecisionChange) {
          onDecisionChange(updatedDecisions);
        }

        return updatedDecision;
      } catch (err) {
        setError(err.message);
        console.error('Update decision error:', err);
        throw err;
      }
    },
    [meetingId, decisions, currentDecision, onDecisionChange]
  );

  const handleRevertDecision = useCallback(
    async (decisionId) => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/decisions/${decisionId}/revert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to revert decision');
        }

        const revertedDecision = await response.json();
        const updatedDecisions = decisions.map((d) =>
          d.id === decisionId ? revertedDecision : d
        );
        setDecisions(updatedDecisions);

        if (currentDecision?.id === decisionId) {
          setCurrentDecision(revertedDecision);
        }

        if (onDecisionChange) {
          onDecisionChange(updatedDecisions);
        }

        return revertedDecision;
      } catch (err) {
        setError(err.message);
        console.error('Revert decision error:', err);
        throw err;
      }
    },
    [meetingId, decisions, currentDecision, onDecisionChange]
  );

  const sortedDecisions = useMemo(() => {
    return [...decisions].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [decisions]);

  const decisionHistory = useMemo(() => {
    return sortedDecisions.map((decision) => ({
      ...decision,
      version: sortedDecisions.length - sortedDecisions.indexOf(decision),
      isLatest: sortedDecisions.indexOf(decision) === 0,
    }));
  }, [sortedDecisions]);

  const renderDecisionStatus = (status) => {
    const statusMap = {
      proposed: { label: 'Proposed', color: '#ffb74d' },
      approved: { label: 'Approved', color: '#81c784' },
      rejected: { label: 'Rejected', color: '#e57373' },
      implemented: { label: 'Implemented', color: '#4fc3f7' },
      reverted: { label: 'Reverted', color: '#9575cd' },
    };

    const statusInfo = statusMap[status] || statusMap.proposed;
    return (
      <span
        className="decision-status"
        style={{
          backgroundColor: statusInfo.color,
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#fff',
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="meeting-decision-registry-loading">
        <div className="spinner" />
        <p>Loading meeting decisions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-decision-registry-error">
        <div className="error-icon">⚠️</div>
        <h3>Unable to load decisions</h3>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="meeting-decision-registry">
      <div className="decision-registry-header">
        <h3>Meeting Decisions</h3>
        <button
          type="button"
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide History' : `View History (${decisions.length})`}
        </button>
      </div>

      <div className="decision-registry-content">
        {currentDecision && !showHistory && (
          <div className="current-decision">
            <div className="decision-header">
              <h4>Current Decision</h4>
              {renderDecisionStatus(currentDecision.status)}
            </div>
            <div className="decision-body">
              <p className="decision-title">{currentDecision.title}</p>
              <p className="decision-description">{currentDecision.description}</p>
              <div className="decision-meta">
                <span className="decision-maker">
                  By: {currentDecision.madeBy}
                </span>
                <span className="decision-time">
                  {new Date(currentDecision.timestamp).toLocaleString()}
                </span>
              </div>
              {currentDecision.votes && (
                <div className="decision-votes">
                  <span>👍 {currentDecision.votes.for || 0}</span>
                  <span>👎 {currentDecision.votes.against || 0}</span>
                  <span>🤝 {currentDecision.votes.abstain || 0}</span>
                </div>
              )}
            </div>
            <div className="decision-actions">
              <button
                type="button"
                className="action-button approve"
                onClick={() =>
                  handleUpdateDecision(currentDecision.id, { status: 'approved' })
                }
              >
                Approve
              </button>
              <button
                type="button"
                className="action-button reject"
                onClick={() =>
                  handleUpdateDecision(currentDecision.id, { status: 'rejected' })
                }
              >
                Reject
              </button>
              <button
                type="button"
                className="action-button revert"
                onClick={() => handleRevertDecision(currentDecision.id)}
              >
                Revert
              </button>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="decision-history">
            <h4>Decision History</h4>
            <div className="history-timeline">
              {decisionHistory.map((decision) => (
                <div
                  key={decision.id}
                  className={`history-item ${decision.isLatest ? 'latest' : ''}`}
                  onClick={() => {
                    setCurrentDecision(decision);
                    setShowHistory(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentDecision(decision);
                      setShowHistory(false);
                    }
                  }}
                >
                  <div className="history-version">v{decision.version}</div>
                  <div className="history-content">
                    <div className="history-title">{decision.title}</div>
                    <div className="history-meta">
                      {renderDecisionStatus(decision.status)}
                      <span className="history-time">
                        {new Date(decision.timestamp).toLocaleString()}
                      </span>
                      <span className="history-maker">{decision.madeBy}</span>
                    </div>
                  </div>
                  {decision.isLatest && (
                    <div className="history-badge">Latest</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="decision-input">
          <h4>Add New Decision</h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const decisionData = {
                title: formData.get('title'),
                description: formData.get('description'),
                madeBy: formData.get('madeBy') || 'Current User',
                status: 'proposed',
                votes: { for: 0, against: 0, abstain: 0 },
              };
              handleAddDecision(decisionData);
              e.target.reset();
            }}
          >
            <div className="form-group">
              <input
                type="text"
                name="title"
                placeholder="Decision title"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <textarea
                name="description"
                placeholder="Decision description"
                rows="3"
                className="form-textarea"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="madeBy"
                placeholder="Your name"
                className="form-input"
              />
            </div>
            <button type="submit" className="submit-decision-button">
              Add Decision
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .meeting-decision-registry {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
        }

        .decision-registry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f0f0f0;
        }

        .decision-registry-header h3 {
          margin: 0;
          color: #333;
        }

        .history-toggle {
          padding: 8px 16px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .history-toggle:hover {
          background: #e0e0e0;
        }

        .current-decision {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #4fc3f7;
        }

        .decision-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .decision-header h4 {
          margin: 0;
          color: #333;
        }

        .decision-body {
          margin-bottom: 16px;
        }

        .decision-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .decision-description {
          color: #666;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .decision-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: #888;
          margin-bottom: 8px;
        }

        .decision-votes {
          display: flex;
          gap: 16px;
          font-size: 14px;
        }

        .decision-actions {
          display: flex;
          gap: 8px;
        }

        .action-button {
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: opacity 0.2s;
        }

        .action-button:hover {
          opacity: 0.8;
        }

        .action-button.approve {
          background: #81c784;
          color: #fff;
        }

        .action-button.reject {
          background: #e57373;
          color: #fff;
        }

        .action-button.revert {
          background: #9575cd;
          color: #fff;
        }

        .decision-history {
          margin-bottom: 20px;
        }

        .decision-history h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .history-timeline {
          max-height: 400px;
          overflow-y: auto;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .history-item:hover {
          background: #f5f5f5;
          border-color: #4fc3f7;
        }

        .history-item.latest {
          border-color: #4fc3f7;
          background: #f0f8ff;
        }

        .history-version {
          font-weight: 600;
          color: #4fc3f7;
          min-width: 40px;
          font-size: 12px;
        }

        .history-content {
          flex: 1;
        }

        .history-title {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .history-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #888;
          flex-wrap: wrap;
        }

        .history-time {
          color: #999;
        }

        .history-maker {
          color: #999;
        }

        .history-badge {
          padding: 2px 8px;
          background: #4fc3f7;
          color: #fff;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }

        .decision-input {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .decision-input h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #4fc3f7;
        }

        .form-textarea {
          resize: vertical;
        }

        .submit-decision-button {
          width: 100%;
          padding: 10px;
          background: #4fc3f7;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-decision-button:hover {
          background: #39b3e6;
        }

        .meeting-decision-registry-loading,
        .meeting-decision-registry-error {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4fc3f7;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .retry-button {
          padding: 8px 24px;
          background: #4fc3f7;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 12px;
        }

        .retry-button:hover {
          background: #39b3e6;
        }
      `}</style>
    </div>
  );
};

MeetingDecisionRegistry.propTypes = {
  meetingId: PropTypes.string.isRequired,
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      email: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ),
  onDecisionChange: PropTypes.func,
  initialDecisions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      status: PropTypes.oneOf(['proposed', 'approved', 'rejected', 'implemented', 'reverted']),
      madeBy: PropTypes.string,
      timestamp: PropTypes.string,
      votes: PropTypes.shape({
        for: PropTypes.number,
        against: PropTypes.number,
        abstain: PropTypes.number,
      }),
    })
  ),
};

MeetingDecisionRegistry.defaultProps = {
  participants: [],
  onDecisionChange: null,
  initialDecisions: [],
};

export default MeetingDecisionRegistry;

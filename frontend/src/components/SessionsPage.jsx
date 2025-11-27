function SessionsPage({ sessions, onCreateClick, onOpenSession, onDeleteSession }) {
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div className="sessions-page">
      <div className="sessions-toolbar">
        <div className="sessions-toolbar-left">
          <h1>Transfer Plans</h1>
          <p className="sessions-description">Manage and create transfer plans</p>
        </div>
        <div className="sessions-toolbar-right">
          <button className="btn-primary" onClick={onCreateClick}>
            Create New Plan
          </button>
        </div>
      </div>

      <div className="sessions-container">
        {sessions.length === 0 ? (
          <div className="sessions-empty-state">
            <div className="empty-state-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                <path d="M9 12h6m-6 4h6"/>
              </svg>
            </div>
            <h2>No Plans Yet</h2>
            <p>Get started by creating your first transfer plan.</p>
            <p className="empty-state-hint">Click "Create New Plan" button above to begin.</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {sortedSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onOpen={() => onOpenSession(session)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onOpen, onDelete }) {
  const createdDate = new Date(session.created_at);

  const handleClick = (e) => {
    if (!e.target.closest('.session-delete-btn')) {
      onOpen();
    }
  };

  return (
    <div className="session-card" onClick={handleClick}>
      <button
        className="session-delete-btn"
        title="Delete plan"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
      <div className="session-card-header">
        <div className="session-card-icon-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
        </div>
        <div className="session-card-info">
          <h3>{session.name}</h3>
          <p className="session-timestamp">
            {createdDate.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
      <div className="session-card-metadata">
        <div className="session-metadata-item">
          <div className="metadata-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div className="metadata-info">
            <span className="metadata-value">{session.products_count || 0}</span>
            <span className="metadata-label">Products</span>
          </div>
        </div>
        <div className="session-metadata-item">
          <div className="metadata-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/>
            </svg>
          </div>
          <div className="metadata-info">
            <span className="metadata-value">{session.plants_count || 0}</span>
            <span className="metadata-label">Plants</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionsPage;

function Results({ result, onPrev, onStartOver }) {
  if (!result) {
    return (
      <section className="tab-content active">
        <div className="page-header">
          <h2>Transfer Plan Results</h2>
          <p className="section-description">View the optimized transfer plan recommendations</p>
        </div>

        <div className="empty-state">
          <p>No transfer plan generated yet</p>
          <p className="empty-state-hint">Go back to generate a transfer plan</p>
        </div>

        <div className="step-navigation">
          <button type="button" className="btn-secondary" onClick={onPrev}>
            Previous: Generate Plan
          </button>
          <button type="button" className="btn-primary" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </section>
    );
  }

  if (!result.feasible) {
    return (
      <section className="tab-content active">
        <div className="page-header">
          <h2>Transfer Plan Results</h2>
          <p className="section-description">View the optimized transfer plan recommendations</p>
        </div>

        <div className="alert alert-warning">
          <h3>Transfer Plan Not Feasible</h3>
          <p>The optimization could not find a feasible solution that satisfies all constraints.</p>
          <h4>Constraints Violated:</h4>
          <ul>
            {result.constraints_violated.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>

        <div className="step-navigation">
          <button type="button" className="btn-secondary" onClick={onPrev}>
            Previous: Generate Plan
          </button>
          <button type="button" className="btn-primary" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </section>
    );
  }

  const transfersCount = result.assignments.filter(a => a.source_plant_id !== a.target_plant_id).length;
  const staysCount = result.assignments.filter(a => a.source_plant_id === a.target_plant_id).length;

  return (
    <section className="tab-content active">
      <div className="page-header">
        <h2>Transfer Plan Results</h2>
        <p className="section-description">View the optimized transfer plan recommendations</p>
      </div>

      <div className="card" style={{ borderLeft: '3px solid #1a1a1a', marginBottom: '20px' }}>
        <h3>Transfer Plan Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', marginTop: '15px', background: '#d0d0d0' }}>
          <div style={{ background: '#ffffff', padding: '20px' }}>
            <p style={{ color: '#707070', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Products to Transfer</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1a1a1a', margin: '5px 0' }}>{transfersCount}</p>
          </div>
          <div style={{ background: '#ffffff', padding: '20px' }}>
            <p style={{ color: '#707070', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Products Staying</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1a1a1a', margin: '5px 0' }}>{staysCount}</p>
          </div>
          <div style={{ background: '#ffffff', padding: '20px' }}>
            <p style={{ color: '#707070', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Products</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1a1a1a', margin: '5px 0' }}>{result.assignments.length}</p>
          </div>
        </div>
      </div>

      <div className="results-summary">
        <div className="summary-card">
          <h3>Total Transfer Cost</h3>
          <p className="big-number">${result.total_transfer_cost.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Total Monthly Cost</h3>
          <p className="big-number">${result.total_monthly_cost.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Total Cost</h3>
          <p className="big-number">${result.total_cost.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Average Utilization</h3>
          <p className="big-number">{result.average_utilization.toFixed(1)}%</p>
        </div>
      </div>

      <div className="card">
        <h3>Transfer Assignments</h3>
        <table>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Transfer (From - To)</th>
              <th>Volume (pcs/month)</th>
              <th>Utilization</th>
              <th>Transfer Cost</th>
              <th>Monthly Cost</th>
              <th>Total Cost</th>
              <th>Start Month</th>
            </tr>
          </thead>
          <tbody>
            {result.assignments.map((a, i) => {
              const isTransfer = a.source_plant_id !== a.target_plant_id;
              return (
                <tr key={i} style={isTransfer ? { background: '#f5f5f5' } : {}}>
                  <td>
                    <strong>{a.product_id}</strong>
                    {isTransfer ? (
                      <span style={{ background: '#1a1a1a', color: '#ffffff', padding: '4px 10px', borderRadius: 0, fontSize: '0.75rem', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>TRANSFER</span>
                    ) : (
                      <span style={{ background: '#f5f5f5', color: '#4a4a4a', padding: '4px 10px', borderRadius: 0, fontSize: '0.75rem', marginLeft: '8px', border: '1px solid #d0d0d0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>STAY</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: '#707070' }}>{a.source_plant_id || 'New'}</span>
                    {' -> '}
                    <strong style={{ color: isTransfer ? '#1a1a1a' : '#4a4a4a' }}>{a.target_plant_id}</strong>
                  </td>
                  <td>{a.assigned_volume.toLocaleString()}</td>
                  <td><span className="utilization-badge">{a.utilization.toFixed(1)}%</span></td>
                  <td>${a.transfer_cost.toLocaleString()}</td>
                  <td>${a.monthly_production_cost.toLocaleString()}</td>
                  <td>${a.total_cost.toLocaleString()}</td>
                  <td>{a.start_month || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {result.constraints_violated.length > 0 && (
        <div className="alert alert-info">
          <h4>Notes:</h4>
          <ul>
            {result.constraints_violated.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Optimization Details</h3>
        <p><strong>Optimization Time:</strong> {result.optimization_time_seconds} seconds</p>
        <p><strong>Feasible:</strong> {result.feasible ? 'Yes' : 'No'}</p>
        <p><strong>Number of Assignments:</strong> {result.assignments.length}</p>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={onPrev}>
          Previous: Generate Plan
        </button>
        <button type="button" className="btn-primary" onClick={onStartOver}>
          Start Over
        </button>
      </div>
    </section>
  );
}

export default Results;

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Results({ result, onPrev, onStartOver }) {
  const exportToCSV = () => {
    if (!result || !result.assignments || result.assignments.length === 0) {
      alert('No data to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Product ID',
      'Source Plant',
      'Target Plant',
      'Transfer Status',
      'Volume (pcs/month)',
      'Utilization (%)',
      'Transfer Cost ($)',
      'Monthly Cost ($)',
      'Total Cost ($)',
      'Start Month'
    ];

    // Generate CSV rows
    const rows = result.assignments.map(a => {
      const isTransfer = a.source_plant_id !== a.target_plant_id;
      return [
        a.product_id,
        a.source_plant_id || 'New',
        a.target_plant_id,
        isTransfer ? 'TRANSFER' : 'STAY',
        a.assigned_volume,
        a.utilization.toFixed(1),
        a.transfer_cost,
        a.monthly_production_cost,
        a.total_cost,
        a.start_month || 0
      ];
    });

    // Add summary rows
    rows.push([]); // Empty row
    rows.push(['--- SUMMARY ---']);
    rows.push(['Total Transfer Cost', '', '', '', '', '', result.total_transfer_cost]);
    rows.push(['Total Monthly Cost', '', '', '', '', '', '', result.total_monthly_cost]);
    rows.push(['Total Cost', '', '', '', '', '', '', '', result.total_cost]);
    rows.push(['Average Utilization (%)', '', '', '', '', result.average_utilization.toFixed(1)]);
    rows.push(['Optimization Time (sec)', '', '', '', '', '', '', '', '', result.optimization_time_seconds]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transfer_plan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
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

      <div className="card" style={{ borderLeft: '3px solid #16a34a', marginBottom: '20px' }}>
        <h3>Transfer Plan Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', marginTop: '15px', background: '#d1d5db', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: '#fafffe', padding: '20px' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Products to Transfer</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1f2937', margin: '5px 0' }}>{transfersCount}</p>
          </div>
          <div style={{ background: '#fafffe', padding: '20px' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Products Staying</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1f2937', margin: '5px 0' }}>{staysCount}</p>
          </div>
          <div style={{ background: '#fafffe', padding: '20px' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Products</p>
            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1f2937', margin: '5px 0' }}>{result.assignments.length}</p>
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Transfer Assignments</h3>
          <button
            type="button"
            onClick={exportToCSV}
            style={{
              padding: '8px 16px',
              fontSize: '0.8125rem',
              fontWeight: '500',
              border: '1px solid #374151',
              cursor: 'pointer',
              backgroundColor: '#374151',
              color: '#ffffff',
              transition: 'all 0.2s ease',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1f2937'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
        </div>
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
                <tr key={i} style={isTransfer ? { background: '#f0fdf4' } : {}}>
                  <td>
                    <strong>{a.product_id}</strong>
                    {isTransfer ? (
                      <span style={{ background: '#16a34a', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>TRANSFER</span>
                    ) : (
                      <span style={{ background: '#f0fdf4', color: '#374151', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', marginLeft: '8px', border: '1px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>STAY</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: '#6b7280' }}>{a.source_plant_id || 'New'}</span>
                    {' -> '}
                    <strong style={{ color: isTransfer ? '#16a34a' : '#374151' }}>{a.target_plant_id}</strong>
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

      <div className="card">
        <h3>Visualizations</h3>

        {/* Cost Breakdown Pie Chart */}
        <div style={{ marginBottom: '40px' }}>
          <h4 style={{ marginBottom: '20px', color: '#374151' }}>Cost Breakdown</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Transfer Cost', value: result.total_transfer_cost },
                  { name: 'Monthly Production Cost', value: result.total_monthly_cost }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#4A90E2" />
                <Cell fill="#7ED321" />
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Transfer vs Stay Distribution */}
        <div style={{ marginBottom: '40px' }}>
          <h4 style={{ marginBottom: '20px', color: '#374151' }}>Transfer vs Stay Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { category: 'Products to Transfer', count: transfersCount },
                { category: 'Products Staying', count: staysCount }
              ]}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#F5A623" name="Number of Products" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plant Utilization Chart - Before and After */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '20px', color: '#374151' }}>Plant-wise Utilization (Before vs After Transfer Plan)</h4>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={(() => {
                const plantDataBefore = {};
                const plantDataAfter = {};

                // Calculate "Before" state (based on source plants)
                result.assignments.forEach(a => {
                  if (a.source_plant_id) {
                    if (!plantDataBefore[a.source_plant_id]) {
                      plantDataBefore[a.source_plant_id] = {
                        totalUtilization: 0,
                        count: 0
                      };
                    }
                    plantDataBefore[a.source_plant_id].totalUtilization += a.utilization;
                    plantDataBefore[a.source_plant_id].count += 1;
                  }
                });

                // Calculate "After" state (based on target plants)
                result.assignments.forEach(a => {
                  if (!plantDataAfter[a.target_plant_id]) {
                    plantDataAfter[a.target_plant_id] = {
                      totalUtilization: 0,
                      count: 0
                    };
                  }
                  plantDataAfter[a.target_plant_id].totalUtilization += a.utilization;
                  plantDataAfter[a.target_plant_id].count += 1;
                });

                // Combine all plant IDs
                const allPlants = new Set([
                  ...Object.keys(plantDataBefore),
                  ...Object.keys(plantDataAfter)
                ]);

                return Array.from(allPlants).sort().map(plantId => ({
                  plant: plantId,
                  before: plantDataBefore[plantId]
                    ? parseFloat((plantDataBefore[plantId].totalUtilization / plantDataBefore[plantId].count).toFixed(1))
                    : 0,
                  after: plantDataAfter[plantId]
                    ? parseFloat((plantDataAfter[plantId].totalUtilization / plantDataAfter[plantId].count).toFixed(1))
                    : 0
                })).filter(p => p.after > 0);
              })()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="plant" label={{ value: 'Plant ID', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Avg Utilization (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="before" fill="#E94B3C" name="Before Transfer (%)" />
              <Bar dataKey="after" fill="#50E3C2" name="After Transfer (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              alert('Transfer plan accepted! This will proceed with implementation.');
            }}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: '1px solid #16a34a',
              cursor: 'pointer',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '12px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
          >
            Accept Plan
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to reject this transfer plan?')) {
                alert('Transfer plan rejected. You can generate a new plan.');
              }
            }}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: '1px solid #dc2626',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '12px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            Reject Plan
          </button>
          <button type="button" className="btn-primary" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </div>
    </section>
  );
}

export default Results;

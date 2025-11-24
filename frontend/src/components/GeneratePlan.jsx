import { useState } from 'react';
import { api } from '../services/api';

function GeneratePlan({ onPrev, onNext, onPlanGenerated, hasResult }) {
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    setStatus({ type: 'info', message: 'Generating transfer plan recommendation...' });
    setLoading(true);

    const config = {
      budget_capital: form.budgetCapital.value ? parseFloat(form.budgetCapital.value) : null,
      transfer_deadline: form.transferDeadline.value || null,
      discount_rate: form.discountRate.value ? parseFloat(form.discountRate.value) : null,
      objective_function: form.objectiveFunction.value,
      allow_fractional_assignment: form.allowFractional.checked
    };

    try {
      const result = await api.generateTransferPlan(config);
      setStatus({
        type: 'success',
        message: `Transfer plan generated successfully! (${result.optimization_time_seconds}s)`
      });
      onPlanGenerated(result);
    } catch (error) {
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    }

    setLoading(false);
  };

  return (
    <section className="tab-content active">
      <div className="page-header">
        <h2>Generate Transfer Plan</h2>
        <p className="section-description">Configure optimization parameters and generate transfer plan recommendations</p>
      </div>

      <div className="card highlighted-card">
        <h3>Optimization Configuration</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="budgetCapital">Budget Capital ($)</label>
            <input
              type="number"
              name="budgetCapital"
              placeholder="Optional - leave blank for no limit"
              step="0.01"
              min="0"
            />
          </div>
          <div className="form-group">
            <label htmlFor="transferDeadline">Transfer Deadline</label>
            <input type="date" name="transferDeadline" placeholder="Optional" />
          </div>
          <div className="form-group">
            <label htmlFor="discountRate">Discount Rate (0-1)</label>
            <input
              type="number"
              name="discountRate"
              placeholder="Optional"
              step="0.01"
              min="0"
              max="1"
            />
          </div>
          <div className="form-group">
            <label htmlFor="objectiveFunction">Objective Function</label>
            <select name="objectiveFunction" defaultValue="minimize_cost">
              <option value="minimize_cost">Minimize Total Cost</option>
              <option value="minimize_time">Minimize Time-to-Production</option>
              <option value="balance_utilization">Balance Utilization</option>
              <option value="multi_objective">Multi-Objective</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label className="checkbox-label">
              <input type="checkbox" name="allowFractional" />
              Allow fractional assignment (split production across plants)
            </label>
          </div>
          <div className="form-group full-width">
            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Transfer Plan'}
            </button>
          </div>
        </form>
      </div>

      {status.message && (
        <div className="status-message">
          <p className={status.type}>{status.message}</p>
        </div>
      )}

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={onPrev}>
          Previous: Data Management
        </button>
        <button type="button" className="btn-primary" onClick={onNext} disabled={!hasResult}>
          Next: View Results
        </button>
      </div>
    </section>
  );
}

export default GeneratePlan;

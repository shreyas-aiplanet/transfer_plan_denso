import { useState, useEffect } from 'react';
import { api } from '../services/api';

function GeneratePlan({ onPrev, onNext, onPlanGenerated, hasResult }) {
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [plants, setPlants] = useState([]);
  const [excludedProducts, setExcludedProducts] = useState([]);
  const [excludedPlants, setExcludedPlants] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, plantsData] = await Promise.all([
          api.getProducts(),
          api.getPlants()
        ]);
        setProducts(productsData);
        setPlants(plantsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const handleAddExcludedProduct = (e) => {
    const productId = e.target.value;
    if (productId && !excludedProducts.includes(productId)) {
      setExcludedProducts([...excludedProducts, productId]);
    }
    e.target.value = '';
  };

  const handleRemoveExcludedProduct = (productId) => {
    setExcludedProducts(excludedProducts.filter(id => id !== productId));
  };

  const handleAddExcludedPlant = (e) => {
    const plantId = e.target.value;
    if (plantId && !excludedPlants.includes(plantId)) {
      setExcludedPlants([...excludedPlants, plantId]);
    }
    e.target.value = '';
  };

  const handleRemoveExcludedPlant = (plantId) => {
    setExcludedPlants(excludedPlants.filter(id => id !== plantId));
  };

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
      allow_fractional_assignment: form.allowFractional.checked,
      excluded_products: excludedProducts,
      excluded_plants: excludedPlants
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

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Exclusions</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '20px' }}>
          Exclude specific products or plants from the optimization process
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Exclude Products */}
          <div>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: '#1f2937' }}>
              Exclude Products from Transfer
            </label>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '12px' }}>
              Selected products will stay at their current plant
            </p>
            <select
              onChange={handleAddExcludedProduct}
              defaultValue=""
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <option value="" disabled>Select a product to exclude...</option>
              {products
                .filter(p => !excludedProducts.includes(p.product_id))
                .map(p => (
                  <option key={p.id} value={p.product_id}>
                    {p.product_id} (at {p.current_plant_id || 'Unassigned'})
                  </option>
                ))
              }
            </select>
            {excludedProducts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {excludedProducts.map(productId => (
                  <span
                    key={productId}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #16a34a',
                      color: '#166534',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {productId}
                    <button
                      type="button"
                      onClick={() => handleRemoveExcludedProduct(productId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '1.1rem',
                        lineHeight: '1',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {excludedProducts.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                No products excluded
              </p>
            )}
          </div>

          {/* Exclude Plants */}
          <div>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: '#1f2937' }}>
              Exclude Plants from Optimization
            </label>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '12px' }}>
              Selected plants will not be considered as transfer destinations
            </p>
            <select
              onChange={handleAddExcludedPlant}
              defaultValue=""
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <option value="" disabled>Select a plant to exclude...</option>
              {plants
                .filter(p => !excludedPlants.includes(p.plant_id))
                .map(p => (
                  <option key={p.id} value={p.plant_id}>
                    {p.plant_id} (Capacity: {p.available_capacity.toLocaleString()})
                  </option>
                ))
              }
            </select>
            {excludedPlants.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {excludedPlants.map(plantId => (
                  <span
                    key={plantId}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #dc2626',
                      color: '#991b1b',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {plantId}
                    <button
                      type="button"
                      onClick={() => handleRemoveExcludedPlant(plantId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '1.1rem',
                        lineHeight: '1',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {excludedPlants.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                No plants excluded
              </p>
            )}
          </div>
        </div>
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

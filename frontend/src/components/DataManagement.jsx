import { useState, useEffect, useRef } from 'react';
import { api, parseCSV } from '../services/api';

function DataManagement({ onNext, onUpdateSession }) {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);

  const productsFileRef = useRef(null);
  const plantsFileRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, plantsData] = await Promise.all([
        api.getProducts(),
        api.getPlants()
      ]);
      setProducts(productsData);
      setPlants(plantsData);
    } catch (error) {
      console.warn('Error loading data:', error);
    }
    setLoading(false);
  };

  const clearAllProducts = async () => {
    if (!confirm('Are you sure you want to delete ALL products? This cannot be undone.')) return;
    try {
      const result = await api.clearAllProducts();
      alert(`Cleared ${result.deleted} products successfully!`);
      await loadData();
      onUpdateSession();
    } catch (error) {
      console.error('Error clearing products:', error);
      alert(`Error clearing products: ${error.message}`);
    }
  };

  const clearAllPlants = async () => {
    if (!confirm('Are you sure you want to delete ALL plants? This cannot be undone.')) return;
    try {
      const result = await api.clearAllPlants();
      alert(`Cleared ${result.deleted} plants successfully!`);
      await loadData();
      onUpdateSession();
    } catch (error) {
      console.error('Error clearing plants:', error);
      alert(`Error clearing plants: ${error.message}`);
    }
  };

  const handleProductsCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseCSV(text);

      const requiredFields = ['product_id', 'current_plant_id', 'monthly_demand', 'current_unit_cost'];
      const missingFields = requiredFields.filter(f => !(f in data[0]));

      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(', ')}`);
        e.target.value = '';
        return;
      }

      // Ask user if they want to clear existing products first
      const shouldClear = products.length > 0 && confirm(
        `You have ${products.length} existing product(s). Do you want to clear them before importing?\n\nClick OK to clear existing data first, or Cancel to add to existing data.`
      );

      if (shouldClear) {
        await api.clearAllProducts();
      }

      let successCount = 0;
      for (const product of data) {
        try {
          await api.createProduct({
            product_id: product.product_id,
            current_plant_id: product.current_plant_id,
            monthly_demand: product.monthly_demand,
            current_unit_cost: product.current_unit_cost,
            unit_volume_or_weight: product.unit_volume_or_weight,
            cycle_time_sec: product.cycle_time_sec,
            yield_rate: product.yield_rate
          });
          successCount++;
        } catch (error) {
          console.warn('Error uploading product:', error);
        }
      }

      alert(`Products imported: ${successCount} success`);
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    e.target.value = '';
  };

  const handlePlantsCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseCSV(text);

      const requiredFields = ['plant_id', 'available_capacity', 'unit_production_cost', 'transfer_fixed_cost'];
      const missingFields = requiredFields.filter(f => !(f in data[0]));

      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(', ')}`);
        e.target.value = '';
        return;
      }

      // Ask user if they want to clear existing plants first
      const shouldClear = plants.length > 0 && confirm(
        `You have ${plants.length} existing plant(s). Do you want to clear them before importing?\n\nClick OK to clear existing data first, or Cancel to add to existing data.`
      );

      if (shouldClear) {
        await api.clearAllPlants();
      }

      let successCount = 0;
      for (const plant of data) {
        try {
          await api.createPlant({
            plant_id: plant.plant_id,
            available_capacity: plant.available_capacity,
            unit_production_cost: plant.unit_production_cost,
            transfer_fixed_cost: plant.transfer_fixed_cost,
            effective_oee: plant.effective_oee || 1.0,
            lead_time_to_start: plant.lead_time_to_start || 0,
            risk_score: plant.risk_score,
            max_utilization_target: plant.max_utilization_target || 90
          });
          successCount++;
        } catch (error) {
          console.warn('Error uploading plant:', error);
        }
      }

      alert(`Plants imported: ${successCount} success`);
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    e.target.value = '';
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(id);
      alert('Product deleted successfully!');
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePlant = async (id) => {
    if (!confirm('Are you sure you want to delete this plant?')) return;
    try {
      await api.deletePlant(id);
      alert('Plant deleted successfully!');
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    const product = {
      product_id: form.productId.value,
      current_plant_id: form.currentPlantId.value,
      monthly_demand: parseFloat(form.monthlyDemand.value),
      current_unit_cost: parseFloat(form.currentUnitCost.value),
      unit_volume_or_weight: form.unitVolume.value ? parseFloat(form.unitVolume.value) : null,
      cycle_time_sec: form.cycleTime.value ? parseFloat(form.cycleTime.value) : null,
      yield_rate: form.yieldRate.value ? parseFloat(form.yieldRate.value) : null
    };

    try {
      await api.createProduct(product);
      alert('Product added successfully!');
      form.reset();
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleAddPlant = async (e) => {
    e.preventDefault();
    const form = e.target;
    const plant = {
      plant_id: form.plantId.value,
      available_capacity: parseFloat(form.availableCapacity.value),
      unit_production_cost: parseFloat(form.unitProductionCost.value),
      transfer_fixed_cost: parseFloat(form.transferFixedCost.value),
      effective_oee: parseFloat(form.effectiveOEE.value),
      lead_time_to_start: parseFloat(form.leadTimeToStart.value),
      risk_score: form.riskScore.value ? parseFloat(form.riskScore.value) : null,
      max_utilization_target: parseFloat(form.maxUtilization.value)
    };

    try {
      await api.createPlant(plant);
      alert('Plant added successfully!');
      form.reset();
      form.effectiveOEE.value = '1.0';
      form.leadTimeToStart.value = '0';
      form.maxUtilization.value = '90';
      await loadData();
      onUpdateSession();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <section className="tab-content active">
      <div className="page-header">
        <h2>Data Management</h2>
        <p className="section-description">Manage products and plants for transfer plan optimization</p>
      </div>

      <div className="sub-tabs">
        <button
          className={`sub-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={`sub-tab-btn ${activeTab === 'plants' ? 'active' : ''}`}
          onClick={() => setActiveTab('plants')}
        >
          Plants
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="sub-tab-content active">
          <div className="card">
            <div className="card-header">
              <h3>Products List</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={loadData}>Refresh</button>
                {products.length > 0 && (
                  <button className="btn-delete" onClick={clearAllProducts}>
                    Clear All
                  </button>
                )}
                <button className="btn-primary" onClick={() => productsFileRef.current?.click()}>
                  Upload CSV
                </button>
                <input
                  type="file"
                  ref={productsFileRef}
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleProductsCSV}
                />
              </div>
            </div>
            <div className="data-table">
              {products.length === 0 ? (
                <p className="empty-message">No products found. Add a product to get started.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Current Plant</th>
                      <th>Monthly Demand</th>
                      <th>Unit Cost</th>
                      <th>Cycle Time</th>
                      <th>Yield Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.product_id}</strong></td>
                        <td><strong>{p.current_plant_id || <span style={{ color: '#6b7280' }}>Not Assigned</span>}</strong></td>
                        <td>{p.monthly_demand.toLocaleString()} pcs/month</td>
                        <td>${p.current_unit_cost.toFixed(2)}</td>
                        <td>{p.cycle_time_sec ? `${p.cycle_time_sec} sec` : '-'}</td>
                        <td>{p.yield_rate ? `${p.yield_rate}%` : '-'}</td>
                        <td>
                          <button className="btn-delete" onClick={() => handleDeleteProduct(p.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Add New Product</h3>
            <form className="form-grid" onSubmit={handleAddProduct}>
              <div className="form-group">
                <label htmlFor="productId">Product ID (SKU) *</label>
                <input type="text" name="productId" placeholder="e.g., SKU-001" required />
              </div>
              <div className="form-group">
                <label htmlFor="currentPlantId">Current Plant ID *</label>
                <input type="text" name="currentPlantId" placeholder="e.g., PLANT-JP-01" required />
              </div>
              <div className="form-group">
                <label htmlFor="monthlyDemand">Monthly Demand (pcs) *</label>
                <input type="number" name="monthlyDemand" placeholder="e.g., 10000" step="1" min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="currentUnitCost">Current Unit Cost ($) *</label>
                <input type="number" name="currentUnitCost" placeholder="e.g., 25.50" step="0.01" min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="unitVolume">Unit Volume/Weight</label>
                <input type="number" name="unitVolume" placeholder="Optional" step="0.01" min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="cycleTime">Cycle Time (sec)</label>
                <input type="number" name="cycleTime" placeholder="Optional" step="0.1" min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="yieldRate">Yield Rate (%)</label>
                <input type="number" name="yieldRate" placeholder="Optional" step="0.1" min="0" max="100" />
              </div>
              <div className="form-group full-width">
                <button type="submit" className="btn-primary">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'plants' && (
        <div className="sub-tab-content active">
          <div className="card">
            <div className="card-header">
              <h3>Plants List</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={loadData}>Refresh</button>
                {plants.length > 0 && (
                  <button className="btn-delete" onClick={clearAllPlants}>
                    Clear All
                  </button>
                )}
                <button className="btn-primary" onClick={() => plantsFileRef.current?.click()}>
                  Upload CSV
                </button>
                <input
                  type="file"
                  ref={plantsFileRef}
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handlePlantsCSV}
                />
              </div>
            </div>
            <div className="data-table">
              {plants.length === 0 ? (
                <p className="empty-message">No plants found. Add a plant to get started.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Plant ID</th>
                      <th>Capacity</th>
                      <th>Unit Cost</th>
                      <th>Transfer Cost</th>
                      <th>OEE</th>
                      <th>Lead Time</th>
                      <th>Risk Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plants.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.plant_id}</strong></td>
                        <td>{p.available_capacity.toLocaleString()} pcs/month</td>
                        <td>${p.unit_production_cost.toFixed(2)}</td>
                        <td>${p.transfer_fixed_cost.toLocaleString()}</td>
                        <td>{p.effective_oee ? `${(p.effective_oee * 100).toFixed(0)}%` : '-'}</td>
                        <td>{p.lead_time_to_start ? `${p.lead_time_to_start} months` : '-'}</td>
                        <td>{p.risk_score !== null ? p.risk_score.toFixed(2) : '-'}</td>
                        <td>
                          <button className="btn-delete" onClick={() => handleDeletePlant(p.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Add New Plant</h3>
            <form className="form-grid" onSubmit={handleAddPlant}>
              <div className="form-group">
                <label htmlFor="plantId">Plant ID *</label>
                <input type="text" name="plantId" placeholder="e.g., PLANT-JP-01" required />
              </div>
              <div className="form-group">
                <label htmlFor="availableCapacity">Available Capacity (pcs/month) *</label>
                <input type="number" name="availableCapacity" placeholder="e.g., 50000" step="1" min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="unitProductionCost">Unit Production Cost ($) *</label>
                <input type="number" name="unitProductionCost" placeholder="e.g., 22.00" step="0.01" min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="transferFixedCost">Transfer Fixed Cost ($) *</label>
                <input type="number" name="transferFixedCost" placeholder="e.g., 50000" step="0.01" min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="effectiveOEE">Effective OEE (0-1)</label>
                <input type="number" name="effectiveOEE" placeholder="e.g., 0.85" step="0.01" min="0" max="1" defaultValue="1.0" />
              </div>
              <div className="form-group">
                <label htmlFor="leadTimeToStart">Lead Time to Start (months)</label>
                <input type="number" name="leadTimeToStart" placeholder="e.g., 3" step="0.1" min="0" defaultValue="0" />
              </div>
              <div className="form-group">
                <label htmlFor="riskScore">Risk Score (0-1)</label>
                <input type="number" name="riskScore" placeholder="Optional" step="0.01" min="0" max="1" />
              </div>
              <div className="form-group">
                <label htmlFor="maxUtilization">Max Utilization Target (%)</label>
                <input type="number" name="maxUtilization" placeholder="e.g., 90" step="1" min="0" max="100" defaultValue="90" />
              </div>
              <div className="form-group full-width">
                <button type="submit" className="btn-primary">Add Plant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="step-navigation">
        <button type="button" className="btn-secondary" style={{ visibility: 'hidden' }}>Previous</button>
        <button type="button" className="btn-primary" onClick={onNext}>Next: Generate Plan</button>
      </div>
    </section>
  );
}

export default DataManagement;

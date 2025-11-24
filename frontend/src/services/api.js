const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = {
  // Products
  async getProducts() {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async createProduct(product) {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create product');
    }
    return response.json();
  },

  async deleteProduct(id) {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return response.json();
  },

  // Plants
  async getPlants() {
    const response = await fetch(`${API_BASE_URL}/plants`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async createPlant(plant) {
    const response = await fetch(`${API_BASE_URL}/plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plant)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create plant');
    }
    return response.json();
  },

  async deletePlant(id) {
    const response = await fetch(`${API_BASE_URL}/plants/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete plant');
    return response.json();
  },

  // Transfer Plan
  async generateTransferPlan(config) {
    const response = await fetch(`${API_BASE_URL}/transfer-plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate transfer plan');
    }
    return response.json();
  }
};

export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      const value = values[index];
      if (value && value !== '' && !isNaN(value)) {
        row[header] = parseFloat(value);
      } else {
        row[header] = value || null;
      }
    });

    data.push(row);
  }

  return data;
}

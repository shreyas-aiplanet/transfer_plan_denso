// API Base URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Global variable to store last transfer plan result
let lastTransferPlanResult = null;

// ==================== MAIN TAB NAVIGATION ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// ==================== SUB-TAB NAVIGATION (Products/Plants) ====================
document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const subtabName = btn.dataset.subtab;

        // Update active sub-tab button
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active sub-tab content
        document.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${subtabName}-section`).classList.add('active');
    });
});

// ==================== SESSION MANAGEMENT ====================

// Function to clear all data from backend
async function clearAllData() {
    try {
        // Get all products and delete them
        const productsResponse = await fetch(`${API_BASE_URL}/products`);
        const products = await productsResponse.json();
        for (const product of products) {
            await fetch(`${API_BASE_URL}/products/${product.id}`, { method: 'DELETE' });
        }

        // Get all plants and delete them
        const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
        const plants = await plantsResponse.json();
        for (const plant of plants) {
            await fetch(`${API_BASE_URL}/plants/${plant.id}`, { method: 'DELETE' });
        }

        // Clear last transfer plan result
        lastTransferPlanResult = null;

        // Reload UI
        await loadProducts();
        await loadPlants();

        // Clear results display
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No transfer plan generated yet</p>
                    <p class="empty-state-hint">Go to "Generate Plan" to create an optimized transfer plan</p>
                </div>
            `;
        }

        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        alert(`Error clearing data: ${error.message}`);
        return false;
    }
}

// New session button
document.getElementById('newSessionBtn')?.addEventListener('click', async () => {
    // Check if there's existing data
    const productsResponse = await fetch(`${API_BASE_URL}/products`);
    const products = await productsResponse.json();
    const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
    const plants = await plantsResponse.json();

    let confirmClear = true;
    if (products.length > 0 || plants.length > 0) {
        confirmClear = confirm(
            `Creating a new session will clear all existing data:\n` +
            `- ${products.length} product(s)\n` +
            `- ${plants.length} plant(s)\n\n` +
            `Are you sure you want to continue?`
        );
    }

    if (!confirmClear) return;

    const sessionName = prompt('Enter session name:');
    if (sessionName) {
        // Show loading
        const btn = document.getElementById('newSessionBtn');
        const originalText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;

        // Clear all data
        const cleared = await clearAllData();

        if (cleared) {
            const sessionsList = document.getElementById('sessionsList');
            const newSession = document.createElement('div');
            newSession.className = 'session-item';
            newSession.innerHTML = `
                <div class="session-info">
                    <div class="session-name">${sessionName}</div>
                    <div class="session-date">${new Date().toLocaleDateString()}</div>
                </div>
            `;

            // Remove active from all sessions
            document.querySelectorAll('.session-item').forEach(s => s.classList.remove('active'));
            newSession.classList.add('active');

            sessionsList.appendChild(newSession);

            // Add click handler for switching sessions (with warning)
            newSession.addEventListener('click', async () => {
                const currentActive = document.querySelector('.session-item.active');
                if (currentActive !== newSession) {
                    // Check if there's data before switching
                    const productsResp = await fetch(`${API_BASE_URL}/products`);
                    const prods = await productsResp.json();
                    const plantsResp = await fetch(`${API_BASE_URL}/plants`);
                    const plts = await plantsResp.json();

                    let confirmSwitch = true;
                    if (prods.length > 0 || plts.length > 0) {
                        confirmSwitch = confirm(
                            `Switching sessions will clear current data:\n` +
                            `- ${prods.length} product(s)\n` +
                            `- ${plts.length} plant(s)\n\n` +
                            `Continue?`
                        );
                    }

                    if (confirmSwitch) {
                        await clearAllData();
                        document.querySelectorAll('.session-item').forEach(s => s.classList.remove('active'));
                        newSession.classList.add('active');
                    }
                }
            });

            // Show success message
            alert(`New session "${sessionName}" created successfully!\nAll data has been cleared.`);
        }

        // Reset button
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Session switching for existing sessions
document.querySelectorAll('.session-item').forEach(session => {
    session.addEventListener('click', async () => {
        const currentActive = document.querySelector('.session-item.active');
        if (currentActive !== session) {
            // Check if there's data before switching
            const productsResponse = await fetch(`${API_BASE_URL}/products`);
            const products = await productsResponse.json();
            const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
            const plants = await plantsResponse.json();

            let confirmSwitch = true;
            if (products.length > 0 || plants.length > 0) {
                confirmSwitch = confirm(
                    `Switching sessions will clear current data:\n` +
                    `- ${products.length} product(s)\n` +
                    `- ${plants.length} plant(s)\n\n` +
                    `Continue?`
                );
            }

            if (confirmSwitch) {
                await clearAllData();
                document.querySelectorAll('.session-item').forEach(s => s.classList.remove('active'));
                session.classList.add('active');
            }
        }
    });
});

// ==================== SESSION STATS UPDATE ====================
async function updateSessionStats() {
    try {
        const productsResponse = await fetch(`${API_BASE_URL}/products`);
        const products = await productsResponse.json();
        const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
        const plants = await plantsResponse.json();

        const productCountEl = document.getElementById('productCount');
        const plantCountEl = document.getElementById('plantCount');

        if (productCountEl) productCountEl.textContent = products.length;
        if (plantCountEl) plantCountEl.textContent = plants.length;
    } catch (error) {
        console.error('Error updating session stats:', error);
    }
}

// ==================== SIDEBAR QUICK ACTIONS ====================
// Load Example Data from sidebar
document.getElementById('loadExampleDataSidebar')?.addEventListener('click', async () => {
    // Switch to Data Management tab
    document.querySelector('[data-tab="data-management"]').click();

    // Show loading state
    const btn = document.getElementById('loadExampleDataSidebar');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Loading...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/transfer-plan/load-example-data`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();

            // Show success notification
            alert(`Example data loaded successfully!\nProducts: ${result.products_added} | Plants: ${result.plants_added}`);

            // Reload the products and plants lists
            await loadProducts();
            await loadPlants();
            await updateSessionStats();
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Clear Data button
document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
    // Check if there's data to clear
    const productsResponse = await fetch(`${API_BASE_URL}/products`);
    const products = await productsResponse.json();
    const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
    const plants = await plantsResponse.json();

    if (products.length === 0 && plants.length === 0) {
        alert('No data to clear.');
        return;
    }

    const confirmClear = confirm(
        `Are you sure you want to clear all data?\n\n` +
        `- ${products.length} product(s)\n` +
        `- ${plants.length} plant(s)\n\n` +
        `This action cannot be undone.`
    );

    if (confirmClear) {
        const btn = document.getElementById('clearDataBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Clearing...';
        btn.disabled = true;

        const cleared = await clearAllData();

        if (cleared) {
            await updateSessionStats();
            alert('All data has been cleared successfully!');
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// ==================== PRODUCT MANAGEMENT ====================

// Load Products
document.getElementById('loadProducts').addEventListener('click', async () => {
    await loadProducts();
});

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();

        const productsList = document.getElementById('productsList');
        if (products.length === 0) {
            productsList.innerHTML = '<p class="empty-message">No products found. Add a product to get started.</p>';
        } else {
            productsList.innerHTML = `
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
                        ${products.map(p => `
                            <tr>
                                <td><strong>${p.product_id}</strong></td>
                                <td><strong style="color: #10A958;">${p.current_plant_id || '<span style="color: #ff6b6b;">Not Assigned</span>'}</strong></td>
                                <td>${p.monthly_demand.toLocaleString()} pcs/month</td>
                                <td>$${p.current_unit_cost.toFixed(2)}</td>
                                <td>${p.cycle_time_sec ? p.cycle_time_sec + ' sec' : '-'}</td>
                                <td>${p.yield_rate ? p.yield_rate + '%' : '-'}</td>
                                <td><button class="btn-delete" onclick="deleteProduct(${p.id})">Delete</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // Update session stats
        await updateSessionStats();
    } catch (error) {
        document.getElementById('productsList').innerHTML = `
            <p class="error">Error loading products: ${error.message}</p>
        `;
    }
}

// Add Product
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newProduct = {
        product_id: document.getElementById('productId').value,
        current_plant_id: document.getElementById('currentPlantId').value,
        monthly_demand: parseFloat(document.getElementById('monthlyDemand').value),
        current_unit_cost: parseFloat(document.getElementById('currentUnitCost').value),
        unit_volume_or_weight: document.getElementById('unitVolume').value ? parseFloat(document.getElementById('unitVolume').value) : null,
        cycle_time_sec: document.getElementById('cycleTime').value ? parseFloat(document.getElementById('cycleTime').value) : null,
        yield_rate: document.getElementById('yieldRate').value ? parseFloat(document.getElementById('yieldRate').value) : null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newProduct)
        });

        if (response.ok) {
            alert('Product added successfully!');
            document.getElementById('addProductForm').reset();
            await loadProducts();
        } else {
            const error = await response.json();
            alert(`Error: ${JSON.stringify(error.detail)}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Delete Product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Product deleted successfully!');
            await loadProducts();
        } else {
            alert('Error deleting product');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// ==================== PLANT MANAGEMENT ====================

// Load Plants
document.getElementById('loadPlants').addEventListener('click', async () => {
    await loadPlants();
});

async function loadPlants() {
    try {
        const response = await fetch(`${API_BASE_URL}/plants`);
        const plants = await response.json();

        const plantsList = document.getElementById('plantsList');
        if (plants.length === 0) {
            plantsList.innerHTML = '<p class="empty-message">No plants found. Add a plant to get started.</p>';
        } else {
            plantsList.innerHTML = `
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
                        ${plants.map(p => `
                            <tr>
                                <td><strong>${p.plant_id}</strong></td>
                                <td>${p.available_capacity.toLocaleString()} pcs/month</td>
                                <td>$${p.unit_production_cost.toFixed(2)}</td>
                                <td>$${p.transfer_fixed_cost.toLocaleString()}</td>
                                <td>${p.effective_oee ? (p.effective_oee * 100).toFixed(0) + '%' : '-'}</td>
                                <td>${p.lead_time_to_start ? p.lead_time_to_start + ' months' : '-'}</td>
                                <td>${p.risk_score !== null ? p.risk_score.toFixed(2) : '-'}</td>
                                <td><button class="btn-delete" onclick="deletePlant(${p.id})">Delete</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // Update session stats
        await updateSessionStats();
    } catch (error) {
        document.getElementById('plantsList').innerHTML = `
            <p class="error">Error loading plants: ${error.message}</p>
        `;
    }
}

// Add Plant
document.getElementById('addPlantForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPlant = {
        plant_id: document.getElementById('plantId').value,
        available_capacity: parseFloat(document.getElementById('availableCapacity').value),
        unit_production_cost: parseFloat(document.getElementById('unitProductionCost').value),
        transfer_fixed_cost: parseFloat(document.getElementById('transferFixedCost').value),
        effective_oee: parseFloat(document.getElementById('effectiveOEE').value),
        lead_time_to_start: parseFloat(document.getElementById('leadTimeToStart').value),
        risk_score: document.getElementById('riskScore').value ? parseFloat(document.getElementById('riskScore').value) : null,
        max_utilization_target: parseFloat(document.getElementById('maxUtilization').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/plants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPlant)
        });

        if (response.ok) {
            alert('Plant added successfully!');
            document.getElementById('addPlantForm').reset();
            // Reset to default values
            document.getElementById('effectiveOEE').value = '1.0';
            document.getElementById('leadTimeToStart').value = '0';
            document.getElementById('maxUtilization').value = '90';
            await loadPlants();
        } else {
            const error = await response.json();
            alert(`Error: ${JSON.stringify(error.detail)}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Delete Plant
async function deletePlant(plantId) {
    if (!confirm('Are you sure you want to delete this plant?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Plant deleted successfully!');
            await loadPlants();
        } else {
            alert('Error deleting plant');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}


// ==================== TRANSFER PLAN GENERATION ====================

document.getElementById('generatePlanForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const statusDiv = document.getElementById('planGenerationStatus');
    statusDiv.innerHTML = '<p class="info">Generating transfer plan recommendation...</p>';

    const config = {
        budget_capital: document.getElementById('budgetCapital').value ? parseFloat(document.getElementById('budgetCapital').value) : null,
        transfer_deadline: document.getElementById('transferDeadline').value || null,
        discount_rate: document.getElementById('discountRate').value ? parseFloat(document.getElementById('discountRate').value) : null,
        objective_function: document.getElementById('objectiveFunction').value,
        allow_fractional_assignment: document.getElementById('allowFractional').checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/transfer-plan/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            const result = await response.json();
            lastTransferPlanResult = result;

            statusDiv.innerHTML = `<p class="success">Transfer plan generated successfully! (${result.optimization_time_seconds}s)</p>`;

            // Switch to results tab
            document.querySelector('[data-tab="results"]').click();
            displayResults(result);
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<p class="error">Error: ${error.detail}</p>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});

// ==================== RESULTS DISPLAY ====================

function displayResults(result) {
    const container = document.getElementById('resultsContainer');

    if (!result.feasible) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <h3>Transfer Plan Not Feasible</h3>
                <p>The optimization could not find a feasible solution that satisfies all constraints.</p>
                <h4>Constraints Violated:</h4>
                <ul>
                    ${result.constraints_violated.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
        `;
        return;
    }

    // Calculate transfer statistics
    const transfersCount = result.assignments.filter(a => a.source_plant_id !== a.target_plant_id).length;
    const staysCount = result.assignments.filter(a => a.source_plant_id === a.target_plant_id).length;

    container.innerHTML = `
        <div class="card" style="background: #f0f9f4; border-left: 4px solid #10A958; margin-bottom: 20px;">
            <h3>Transfer Plan Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div>
                    <p style="color: #666; margin: 0;">Products to Transfer</p>
                    <p style="font-size: 2em; font-weight: bold; color: #10A958; margin: 5px 0;">${transfersCount}</p>
                </div>
                <div>
                    <p style="color: #666; margin: 0;">Products Staying</p>
                    <p style="font-size: 2em; font-weight: bold; color: #666; margin: 5px 0;">${staysCount}</p>
                </div>
                <div>
                    <p style="color: #666; margin: 0;">Total Products</p>
                    <p style="font-size: 2em; font-weight: bold; color: #333; margin: 5px 0;">${result.assignments.length}</p>
                </div>
            </div>
        </div>

        <div class="results-summary">
            <div class="summary-card">
                <h3>Total Transfer Cost</h3>
                <p class="big-number">$${result.total_transfer_cost.toLocaleString()}</p>
            </div>
            <div class="summary-card">
                <h3>Total Monthly Cost</h3>
                <p class="big-number">$${result.total_monthly_cost.toLocaleString()}</p>
            </div>
            <div class="summary-card">
                <h3>Total Cost</h3>
                <p class="big-number">$${result.total_cost.toLocaleString()}</p>
            </div>
            <div class="summary-card">
                <h3>Average Utilization</h3>
                <p class="big-number">${result.average_utilization.toFixed(1)}%</p>
            </div>
        </div>

        <div class="card">
            <h3>Transfer Assignments</h3>
            <table>
                <thead>
                    <tr>
                        <th>Product ID</th>
                        <th>Transfer (From → To)</th>
                        <th>Volume (pcs/month)</th>
                        <th>Utilization</th>
                        <th>Transfer Cost</th>
                        <th>Monthly Cost</th>
                        <th>Total Cost</th>
                        <th>Start Month</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.assignments.map(a => {
                        const isTransfer = a.source_plant_id !== a.target_plant_id;
                        const rowStyle = isTransfer ? 'background: #fff9f0;' : '';
                        const transferBadge = isTransfer ? '<span style="background: #10A958; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; margin-left: 5px;">TRANSFER</span>' : '<span style="background: #e9ecef; color: #666; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; margin-left: 5px;">STAY</span>';

                        return `
                        <tr style="${rowStyle}">
                            <td><strong>${a.product_id}</strong>${transferBadge}</td>
                            <td><span style="color: #666;">${a.source_plant_id || 'New'}</span> → <strong style="color: ${isTransfer ? '#10A958' : '#666'};">${a.target_plant_id}</strong></td>
                            <td>${a.assigned_volume.toLocaleString()}</td>
                            <td><span class="utilization-badge">${a.utilization.toFixed(1)}%</span></td>
                            <td>$${a.transfer_cost.toLocaleString()}</td>
                            <td>$${a.monthly_production_cost.toLocaleString()}</td>
                            <td>$${a.total_cost.toLocaleString()}</td>
                            <td>${a.start_month || 0}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${result.constraints_violated.length > 0 ? `
            <div class="alert alert-info">
                <h4>Notes:</h4>
                <ul>
                    ${result.constraints_violated.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="card">
            <h3>Optimization Details</h3>
            <p><strong>Optimization Time:</strong> ${result.optimization_time_seconds} seconds</p>
            <p><strong>Feasible:</strong> ${result.feasible ? 'Yes' : 'No'}</p>
            <p><strong>Number of Assignments:</strong> ${result.assignments.length}</p>
        </div>
    `;
}

// ==================== INITIALIZATION ====================

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadPlants();
    updateSessionStats();
});

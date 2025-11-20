// API Base URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Global variable to store last transfer plan result
let lastTransferPlanResult = null;

// ==================== SESSION STORAGE & MANAGEMENT ====================
let sessions = JSON.parse(localStorage.getItem('denso_sessions') || '[]');
let currentSession = null;

// Modal state
let modalProductsFile = null;
let modalPlantsFile = null;
let modalProductsData = [];
let modalPlantsData = [];

// ==================== PAGE ROUTING ====================
function showSessionsPage() {
    const sessionsPage = document.getElementById('sessionsPage');
    const mainApp = document.getElementById('mainApp');

    sessionsPage.style.display = 'flex';
    mainApp.style.display = 'none';
    document.getElementById('backToSessionsBtn').style.display = 'none';

    console.log('Showing sessions page - sidebar is always visible');
    renderSessionCards();
}

function showMainApp(sessionData) {
    const mainApp = document.getElementById('mainApp');
    const sessionsPage = document.getElementById('sessionsPage');

    console.log('=== Showing main app ===');

    sessionsPage.style.display = 'none';
    mainApp.style.display = 'flex';
    mainApp.classList.remove('sessions-mode');

    console.log('Main app display:', mainApp.style.display);

    document.getElementById('backToSessionsBtn').style.display = 'block';
    currentSession = sessionData;
}

// Back to plans button
document.getElementById('backToSessionsBtn')?.addEventListener('click', async () => {
    try {
        const productsResponse = await fetch(`${API_BASE_URL}/products`);
        const plantsResponse = await fetch(`${API_BASE_URL}/plants`);

        // Only check for unsaved data if backend is available
        if (productsResponse.ok && plantsResponse.ok) {
            const products = await productsResponse.json();
            const plants = await plantsResponse.json();

            if (products.length > 0 || plants.length > 0) {
                const confirmLeave = confirm(
                    'You have unsaved data in the current plan. Going back will not save this data.\n\n' +
                    'Are you sure you want to return to plans?'
                );
                if (!confirmLeave) return;
            }
        }
    } catch (error) {
        console.warn('Could not check for unsaved data (backend may not be running):', error.message);
        // Continue to plans page anyway
    }

    showSessionsPage();
});

// ==================== SESSION CARDS RENDERING ====================
function renderSessionCards() {
    const sessionsGrid = document.getElementById('sessionsGrid');

    // Clear existing session cards
    sessionsGrid.innerHTML = '';

    // Show empty state if no sessions
    const emptyState = document.getElementById('sessionsEmptyState');
    if (sessions.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        sessionsGrid.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        sessionsGrid.style.display = 'grid';
    }

    // Sort sessions by creation date (newest first)
    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    // Render existing sessions
    sortedSessions.forEach(session => {
        const sessionCard = document.createElement('div');
        sessionCard.className = 'session-card';

        const createdDate = new Date(session.created_at);

        sessionCard.innerHTML = `
            <div class="session-card-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
            </div>
            <h3>${session.name}</h3>
            <p class="session-timestamp">${createdDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
            <div class="session-card-metadata">
                <div class="session-metadata-item">
                    <div class="metadata-info">
                        <span class="metadata-value">${session.products_count || 0}</span>
                        <span class="metadata-label">Products</span>
                    </div>
                </div>
                <div class="session-metadata-item">
                    <div class="metadata-info">
                        <span class="metadata-value">${session.plants_count || 0}</span>
                        <span class="metadata-label">Plants</span>
                    </div>
                </div>
            </div>
            <button class="session-delete-btn" data-session-id="${session.id}" title="Delete plan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
        `;

        // Add click handler for opening session (but not for delete button)
        sessionCard.addEventListener('click', (e) => {
            // Don't open if clicking delete button
            if (e.target.closest('.session-delete-btn')) {
                return;
            }
            openSession(session);
        });

        // Add delete button handler
        const deleteBtn = sessionCard.querySelector('.session-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            deleteSession(session.id);
        });

        sessionsGrid.appendChild(sessionCard);
    });
}

// Delete plan function
function deleteSession(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const confirmDelete = confirm(
        `Are you sure you want to delete the plan "${session.name}"?\n\n` +
        `This action cannot be undone.`
    );

    if (confirmDelete) {
        // Remove from array
        sessions = sessions.filter(s => s.id !== sessionId);

        // Update localStorage
        localStorage.setItem('denso_sessions', JSON.stringify(sessions));

        // Re-render cards
        renderSessionCards();
    }
}

async function openSession(session) {
    try {
        // Show loading
        showLoading('Opening Plan', 'Loading plan data...');

        // Clear current data first
        await clearAllData();

        // Upload session's products to backend
        if (session.products && session.products.length > 0) {
            updateProgress(10, 'Restoring products...');
            for (let i = 0; i < session.products.length; i++) {
                const product = session.products[i];
                try {
                    const payload = {
                        product_id: product.product_id,
                        current_plant_id: product.current_plant_id,
                        monthly_demand: product.monthly_demand,
                        current_unit_cost: product.current_unit_cost,
                        unit_volume_or_weight: product.unit_volume_or_weight,
                        cycle_time_sec: product.cycle_time_sec,
                        yield_rate: product.yield_rate
                    };

                    await fetch(`${API_BASE_URL}/products`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const progress = 10 + ((i + 1) / session.products.length) * 40;
                    updateProgress(progress, `Restoring products: ${i + 1}/${session.products.length}`);
                } catch (error) {
                    console.warn('Error restoring product:', error);
                }
            }
        }

        // Upload session's plants to backend
        if (session.plants && session.plants.length > 0) {
            updateProgress(50, 'Restoring plants...');
            for (let i = 0; i < session.plants.length; i++) {
                const plant = session.plants[i];
                try {
                    const payload = {
                        plant_id: plant.plant_id,
                        available_capacity: plant.available_capacity,
                        unit_production_cost: plant.unit_production_cost,
                        transfer_fixed_cost: plant.transfer_fixed_cost,
                        effective_oee: plant.effective_oee || 1.0,
                        lead_time_to_start: plant.lead_time_to_start || 0,
                        risk_score: plant.risk_score,
                        max_utilization_target: plant.max_utilization_target || 90
                    };

                    await fetch(`${API_BASE_URL}/plants`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const progress = 50 + ((i + 1) / session.plants.length) * 40;
                    updateProgress(progress, `Restoring plants: ${i + 1}/${session.plants.length}`);
                } catch (error) {
                    console.warn('Error restoring plant:', error);
                }
            }
        }

        updateProgress(95, 'Finalizing...');

        // Show main app
        showMainApp(session);

        // Make sure we're on step 1 (data management)
        goToStep(1);

        updateProgress(100, 'Complete!');

        // Hide loading and load data
        setTimeout(async () => {
            hideLoading();

            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Load products and plants to display in UI
            console.log('Loading plan data...');
            await loadProducts();
            await loadPlants();
            await updateSessionStats();
            console.log('Plan data loaded');
        }, 500);
    } catch (error) {
        console.error('Error opening plan:', error);
        hideLoading();
        alert(`Error opening plan: ${error.message}`);
        showSessionsPage();
    }
}

// ==================== MODAL FUNCTIONALITY ====================
const modal = document.getElementById('sessionModal');
const createSessionBtn = document.getElementById('createSessionBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelSessionBtn = document.getElementById('cancelSessionBtn');
const createSessionSubmitBtn = document.getElementById('createSessionSubmitBtn');
const sessionNameInput = document.getElementById('sessionName');

// Open modal
createSessionBtn?.addEventListener('click', () => {
    modal.classList.add('active');
    resetModal();
});

// Close modal
function closeModal() {
    modal.classList.remove('active');
    resetModal();
}

closeModalBtn?.addEventListener('click', closeModal);
cancelSessionBtn?.addEventListener('click', closeModal);

// Close modal when clicking outside
modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Reset modal
function resetModal() {
    sessionNameInput.value = '';
    modalProductsFile = null;
    modalPlantsFile = null;
    modalProductsData = [];
    modalPlantsData = [];

    // Reset products drop zone
    document.getElementById('productsDropArea').style.display = 'block';
    document.getElementById('productsFileStatus').style.display = 'none';
    document.getElementById('productsPreview').innerHTML = '';
    document.getElementById('productsPreview').classList.remove('visible');

    // Reset plants drop zone
    document.getElementById('plantsDropArea').style.display = 'block';
    document.getElementById('plantsFileStatus').style.display = 'none';
    document.getElementById('plantsPreview').innerHTML = '';
    document.getElementById('plantsPreview').classList.remove('visible');

    updateCreateButtonState();
}

// Update create button state
function updateCreateButtonState() {
    const hasName = sessionNameInput.value.trim() !== '';
    const hasProducts = modalProductsFile !== null;
    const hasPlants = modalPlantsFile !== null;

    createSessionSubmitBtn.disabled = !(hasName && hasProducts && hasPlants);
}

sessionNameInput?.addEventListener('input', updateCreateButtonState);

// ==================== CSV UPLOAD & PREVIEW IN MODAL ====================

// Helper function to handle file processing
async function handleFileUpload(file, dataType) {
    if (!file) {
        console.log('No file provided');
        return;
    }

    console.log(`Processing ${dataType} file:`, file.name, 'Size:', file.size);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size exceeds 10MB limit');
        return;
    }

    try {
        const text = await file.text();
        console.log(`Read ${text.length} characters from ${dataType} file`);

        const parsedData = parseCSV(text);
        console.log(`Parsed ${parsedData.length} rows from ${dataType} CSV`);

        if (parsedData.length === 0) {
            alert('CSV file is empty or invalid');
            return;
        }

        if (dataType === 'products') {
            modalProductsFile = file;
            modalProductsData = parsedData;
            console.log('✓ Saved products data to modalProductsData:', modalProductsData.length, 'rows');

            // Hide drop zone, show status
            document.getElementById('productsDropArea').style.display = 'none';
            const statusEl = document.getElementById('productsFileStatus');
            statusEl.style.display = 'flex';
            statusEl.querySelector('.status-text').textContent = `${file.name} (${parsedData.length} rows)`;

            // Show preview
            displayCSVPreview(parsedData, 'productsPreview');
        } else if (dataType === 'plants') {
            modalPlantsFile = file;
            modalPlantsData = parsedData;
            console.log('✓ Saved plants data to modalPlantsData:', modalPlantsData.length, 'rows');

            // Hide drop zone, show status
            document.getElementById('plantsDropArea').style.display = 'none';
            const statusEl = document.getElementById('plantsFileStatus');
            statusEl.style.display = 'flex';
            statusEl.querySelector('.status-text').textContent = `${file.name} (${parsedData.length} rows)`;

            // Show preview
            displayCSVPreview(parsedData, 'plantsPreview');
        }

        updateCreateButtonState();
    } catch (error) {
        console.error(`Error reading ${dataType} CSV:`, error);
        alert(`Error reading ${dataType} CSV: ${error.message}`);
    }
}

// File input change handlers
document.getElementById('modalProductsCSV')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    await handleFileUpload(file, 'products');
    e.target.value = ''; // Reset input
});

document.getElementById('modalPlantsCSV')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    await handleFileUpload(file, 'plants');
    e.target.value = ''; // Reset input
});

// Drag and drop functionality for products
const productsDropZone = document.getElementById('productsDropZone');
const productsDropArea = document.getElementById('productsDropArea');

productsDropArea?.addEventListener('click', () => {
    document.getElementById('modalProductsCSV').click();
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    productsDropZone?.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    productsDropZone?.addEventListener(eventName, () => {
        productsDropZone.classList.add('drag-over');
        productsDropArea.classList.add('drag-active');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    productsDropZone?.addEventListener(eventName, () => {
        productsDropZone.classList.remove('drag-over');
        productsDropArea.classList.remove('drag-active');
    });
});

productsDropZone?.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await handleFileUpload(files[0], 'products');
    }
});

// Drag and drop functionality for plants
const plantsDropZone = document.getElementById('plantsDropZone');
const plantsDropArea = document.getElementById('plantsDropArea');

plantsDropArea?.addEventListener('click', () => {
    document.getElementById('modalPlantsCSV').click();
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    plantsDropZone?.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    plantsDropZone?.addEventListener(eventName, () => {
        plantsDropZone.classList.add('drag-over');
        plantsDropArea.classList.add('drag-active');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    plantsDropZone?.addEventListener(eventName, () => {
        plantsDropZone.classList.remove('drag-over');
        plantsDropArea.classList.remove('drag-active');
    });
});

plantsDropZone?.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await handleFileUpload(files[0], 'plants');
    }
});

function displayCSVPreview(data, previewId) {
    const previewDiv = document.getElementById(previewId);

    if (data.length === 0) {
        previewDiv.innerHTML = '<p class="preview-empty">No data to preview</p>';
        return;
    }

    const headers = Object.keys(data[0]);
    const previewRows = data.slice(0, 5); // Show first 5 rows

    let html = `
        <div class="preview-header">
            <div class="preview-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <span>Preview: Showing ${previewRows.length} of ${data.length} rows</span>
            </div>
        </div>
        <div class="preview-table-wrapper">
            <table class="preview-table">
                <thead>
                    <tr>`;

    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });

    html += `</tr>
                </thead>
                <tbody>`;

    previewRows.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            const value = row[header];
            const displayValue = value !== null && value !== undefined && value !== '' ? value : '-';
            html += `<td>${displayValue}</td>`;
        });
        html += '</tr>';
    });

    html += `</tbody>
            </table>
        </div>`;

    previewDiv.innerHTML = html;
    previewDiv.classList.add('visible');
}

// ==================== CREATE SESSION ====================

// Loading overlay functions
function showLoading(title, message) {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    overlay.classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function updateProgress(percent, message) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `${Math.round(percent)}%`;
    if (message) {
        document.getElementById('loadingMessage').textContent = message;
    }
}

createSessionSubmitBtn?.addEventListener('click', async () => {
    const sessionName = sessionNameInput.value.trim();

    console.log('=== CREATE PLAN CLICKED ===');
    console.log('Plan name:', sessionName);
    console.log('modalProductsFile:', modalProductsFile ? modalProductsFile.name : 'NULL');
    console.log('modalPlantsFile:', modalPlantsFile ? modalPlantsFile.name : 'NULL');
    console.log('modalProductsData length:', modalProductsData.length);
    console.log('modalPlantsData length:', modalPlantsData.length);

    if (!sessionName || !modalProductsFile || !modalPlantsFile) {
        alert('Please provide plan name and upload both CSV files');
        return;
    }

    if (modalProductsData.length === 0 && modalPlantsData.length === 0) {
        alert('CSV files appear to be empty. Please check your files and try again.');
        return;
    }

    // IMPORTANT: Save data to local variables BEFORE closing modal
    // because closeModal() calls resetModal() which clears these arrays
    const productsToUpload = [...modalProductsData];
    const plantsToUpload = [...modalPlantsData];
    console.log('✓ Saved data to local variables:', productsToUpload.length, 'products,', plantsToUpload.length, 'plants');

    // Show loading overlay
    showLoading('Creating Plan', 'Preparing data upload...');
    closeModal();

    try {
        // Clear any existing data first
        updateProgress(5, 'Clearing existing data...');
        await clearAllData();

        // Upload products
        updateProgress(10, 'Uploading products...');
        let productsSuccess = 0;
        let productsErrors = 0;
        const totalProducts = productsToUpload.length;

        console.log(`Uploading ${totalProducts} products to backend...`);
        console.log('API URL:', API_BASE_URL);

        for (let i = 0; i < totalProducts; i++) {
            const product = productsToUpload[i];
            try {
                const payload = {
                    product_id: product.product_id,
                    current_plant_id: product.current_plant_id,
                    monthly_demand: product.monthly_demand,
                    current_unit_cost: product.current_unit_cost,
                    unit_volume_or_weight: product.unit_volume_or_weight,
                    cycle_time_sec: product.cycle_time_sec,
                    yield_rate: product.yield_rate
                };

                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    productsSuccess++;
                    const responseData = await response.json();
                    console.log(`✓ Product ${product.product_id} uploaded, ID: ${responseData.id}`);

                    // Test: Check if data persists immediately after first upload
                    if (i === 0) {
                        const testFetch = await fetch(`${API_BASE_URL}/products`);
                        if (testFetch.ok) {
                            const testData = await testFetch.json();
                            console.log(`🧪 TEST: Immediately after first upload, backend has ${testData.length} products`);
                            if (testData.length === 0) {
                                console.error('❌ CRITICAL: Backend not persisting data!');
                            }
                        }
                    }
                } else {
                    productsErrors++;
                    const errorData = await response.text();
                    console.error(`✗ Product ${product.product_id} failed (${response.status}):`, errorData);
                }
            } catch (error) {
                productsErrors++;
                console.error(`✗ Product ${product.product_id} error:`, error);
            }

            // Update progress (10% to 50%)
            const progress = 10 + ((i + 1) / totalProducts) * 40;
            updateProgress(progress, `Uploading products: ${i + 1}/${totalProducts}`);
        }

        console.log(`Products upload complete: ${productsSuccess} success, ${productsErrors} failed`);

        // Upload plants
        updateProgress(50, 'Uploading plants...');
        let plantsSuccess = 0;
        let plantsErrors = 0;
        const totalPlants = plantsToUpload.length;

        console.log(`Uploading ${totalPlants} plants to backend...`);

        for (let i = 0; i < totalPlants; i++) {
            const plant = plantsToUpload[i];
            try {
                const payload = {
                    plant_id: plant.plant_id,
                    available_capacity: plant.available_capacity,
                    unit_production_cost: plant.unit_production_cost,
                    transfer_fixed_cost: plant.transfer_fixed_cost,
                    effective_oee: plant.effective_oee || 1.0,
                    lead_time_to_start: plant.lead_time_to_start || 0,
                    risk_score: plant.risk_score,
                    max_utilization_target: plant.max_utilization_target || 90
                };

                const response = await fetch(`${API_BASE_URL}/plants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    plantsSuccess++;
                    const responseData = await response.json();
                    console.log(`✓ Plant ${plant.plant_id} uploaded, ID: ${responseData.id}`);
                } else {
                    plantsErrors++;
                    const errorData = await response.text();
                    console.error(`✗ Plant ${plant.plant_id} failed (${response.status}):`, errorData);
                }
            } catch (error) {
                plantsErrors++;
                console.error(`✗ Plant ${plant.plant_id} error:`, error);
            }

            // Update progress (50% to 90%)
            const progress = 50 + ((i + 1) / totalPlants) * 40;
            updateProgress(progress, `Uploading plants: ${i + 1}/${totalPlants}`);
        }

        console.log(`Plants upload complete: ${plantsSuccess} success, ${plantsErrors} failed`);

        // Verify data was uploaded by fetching it back
        updateProgress(90, 'Verifying upload...');
        try {
            const verifyProductsResp = await fetch(`${API_BASE_URL}/products`);
            const verifyPlantsResp = await fetch(`${API_BASE_URL}/plants`);

            if (verifyProductsResp.ok && verifyPlantsResp.ok) {
                const verifyProducts = await verifyProductsResp.json();
                const verifyPlants = await verifyPlantsResp.json();
                console.log(`✓ Verification: ${verifyProducts.length} products and ${verifyPlants.length} plants in backend`);

                if (verifyProducts.length === 0 && verifyPlants.length === 0) {
                    console.error('❌ WARNING: No data found in backend after upload!');
                }
            }
        } catch (error) {
            console.error('Verification failed:', error);
        }

        // Create session object with actual data
        updateProgress(92, 'Finalizing session...');
        const newSession = {
            id: Date.now().toString(),
            name: sessionName,
            created_at: new Date().toISOString(),
            products_count: productsSuccess,
            plants_count: plantsSuccess,
            products: productsToUpload,  // Store actual products data
            plants: plantsToUpload       // Store actual plants data
        };

        // Save to localStorage
        sessions.push(newSession);
        localStorage.setItem('denso_sessions', JSON.stringify(sessions));

        updateProgress(95, 'Loading session data...');

        // Navigate to main app
        showMainApp(newSession);

        // Make sure we're on step 1 (data management)
        goToStep(1);

        updateProgress(100, 'Complete!');

        // Hide loading and load data
        setTimeout(async () => {
            hideLoading();

            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Load data after UI is visible
            console.log('Loading products and plants...');
            await loadProducts();
            await loadPlants();
            await updateSessionStats();
            console.log('Data loading complete');

            // Show summary if there were any errors
            if (productsErrors > 0 || plantsErrors > 0) {
                alert(
                    `Plan "${sessionName}" created!\n\n` +
                    `Products: ${productsSuccess} uploaded, ${productsErrors} failed\n` +
                    `Plants: ${plantsSuccess} uploaded, ${plantsErrors} failed`
                );
            }
        }, 500);

    } catch (error) {
        hideLoading();
        alert(`Error creating plan: ${error.message}`);
    }
});

// ==================== STEPPER NAVIGATION ====================
let currentStep = 1;

function goToStep(stepNumber) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Show target content
    const stepMap = {
        1: 'data-management-tab',
        2: 'transfer-plan-tab',
        3: 'results-tab'
    };

    document.getElementById(stepMap[stepNumber]).classList.add('active');

    // Update stepper UI
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');

        if (stepNum === stepNumber) {
            step.classList.add('active');
        } else if (stepNum < stepNumber) {
            step.classList.add('completed');
        }
    });

    currentStep = stepNumber;

    // Scroll to top
    document.querySelector('main').scrollTop = 0;
}

// Step navigation buttons
document.getElementById('nextStep1')?.addEventListener('click', () => {
    goToStep(2);
});

document.getElementById('prevStep2')?.addEventListener('click', () => {
    goToStep(1);
});

document.getElementById('nextStep2')?.addEventListener('click', () => {
    goToStep(3);
});

document.getElementById('prevStep3')?.addEventListener('click', () => {
    goToStep(2);
});

document.getElementById('startOver')?.addEventListener('click', () => {
    goToStep(1);
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

// Function to update current session data in localStorage
async function updateCurrentSessionData() {
    if (!currentSession) return;

    try {
        // Fetch current data from backend
        const productsResponse = await fetch(`${API_BASE_URL}/products`);
        const plantsResponse = await fetch(`${API_BASE_URL}/plants`);

        if (productsResponse.ok && plantsResponse.ok) {
            const products = await productsResponse.json();
            const plants = await plantsResponse.json();

            // Find and update the session in the sessions array
            const sessionIndex = sessions.findIndex(s => s.id === currentSession.id);
            if (sessionIndex !== -1) {
                sessions[sessionIndex].products = products.map(p => ({
                    product_id: p.product_id,
                    current_plant_id: p.current_plant_id,
                    monthly_demand: p.monthly_demand,
                    current_unit_cost: p.current_unit_cost,
                    unit_volume_or_weight: p.unit_volume_or_weight,
                    cycle_time_sec: p.cycle_time_sec,
                    yield_rate: p.yield_rate
                }));
                sessions[sessionIndex].plants = plants.map(p => ({
                    plant_id: p.plant_id,
                    available_capacity: p.available_capacity,
                    unit_production_cost: p.unit_production_cost,
                    transfer_fixed_cost: p.transfer_fixed_cost,
                    effective_oee: p.effective_oee,
                    lead_time_to_start: p.lead_time_to_start,
                    risk_score: p.risk_score,
                    max_utilization_target: p.max_utilization_target
                }));
                sessions[sessionIndex].products_count = products.length;
                sessions[sessionIndex].plants_count = plants.length;

                // Update currentSession reference
                currentSession = sessions[sessionIndex];

                // Save to localStorage
                localStorage.setItem('denso_sessions', JSON.stringify(sessions));
            }
        }
    } catch (error) {
        console.warn('Error updating session data:', error);
    }
}

// Function to clear all data from backend
async function clearAllData() {
    try {
        // Try to get all products and delete them
        try {
            const productsResponse = await fetch(`${API_BASE_URL}/products`);
            if (productsResponse.ok) {
                const products = await productsResponse.json();
                for (const product of products) {
                    try {
                        await fetch(`${API_BASE_URL}/products/${product.id}`, { method: 'DELETE' });
                    } catch (err) {
                        console.warn('Failed to delete product:', product.id, err);
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch products (backend may not be running):', err.message);
        }

        // Try to get all plants and delete them
        try {
            const plantsResponse = await fetch(`${API_BASE_URL}/plants`);
            if (plantsResponse.ok) {
                const plants = await plantsResponse.json();
                for (const plant of plants) {
                    try {
                        await fetch(`${API_BASE_URL}/plants/${plant.id}`, { method: 'DELETE' });
                    } catch (err) {
                        console.warn('Failed to delete plant:', plant.id, err);
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch plants (backend may not be running):', err.message);
        }

        // Clear last transfer plan result
        lastTransferPlanResult = null;

        // Try to reload UI (don't fail if backend is down)
        try {
            await loadProducts();
        } catch (err) {
            console.warn('Could not load products:', err.message);
        }

        try {
            await loadPlants();
        } catch (err) {
            console.warn('Could not load plants:', err.message);
        }

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
        console.error('Unexpected error in clearAllData:', error);
        // Don't show alert for expected errors like backend being down
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
        const plantsResponse = await fetch(`${API_BASE_URL}/plants`);

        if (!productsResponse.ok || !plantsResponse.ok) {
            console.warn('Backend not available for stats update');
            return;
        }

        const products = await productsResponse.json();
        const plants = await plantsResponse.json();

        const productCountEl = document.getElementById('productCount');
        const plantCountEl = document.getElementById('plantCount');

        if (productCountEl) productCountEl.textContent = products.length;
        if (plantCountEl) plantCountEl.textContent = plants.length;
    } catch (error) {
        console.warn('Error updating session stats (backend may not be running):', error.message);
    }
}

// ==================== CSV PARSING UTILITY ====================
function parseCSV(csvText) {
    // Handle different line endings (Windows, Unix, Mac)
    const lines = csvText.trim().split(/\r?\n/);

    if (lines.length === 0) {
        return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, index) => {
            const value = values[index];
            // Try to parse as number if possible
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

// ==================== CSV UPLOAD HANDLERS ====================
// Trigger file input when button is clicked
document.getElementById('uploadProductsCSVBtn')?.addEventListener('click', () => {
    document.getElementById('productsCSVUpload')?.click();
});

document.getElementById('uploadPlantsCSVBtn')?.addEventListener('click', () => {
    document.getElementById('plantsCSVUpload')?.click();
});

// Products CSV Upload
document.getElementById('productsCSVUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Processing products CSV file:', file.name);

    try {
        const text = await file.text();
        console.log('CSV content loaded, parsing...');
        const products = parseCSV(text);
        console.log('Parsed products:', products);

        if (products.length === 0) {
            alert('CSV file is empty or invalid');
            e.target.value = '';
            return;
        }

        // Validate required fields
        const requiredFields = ['product_id', 'current_plant_id', 'monthly_demand', 'current_unit_cost'];
        const firstProduct = products[0];
        const missingFields = requiredFields.filter(field => !(field in firstProduct));

        if (missingFields.length > 0) {
            alert(`Missing required fields: ${missingFields.join(', ')}\n\nRequired fields: ${requiredFields.join(', ')}`);
            e.target.value = '';
            return;
        }

        // Upload products one by one
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const product of products) {
            try {
                const payload = {
                    product_id: product.product_id,
                    current_plant_id: product.current_plant_id,
                    monthly_demand: product.monthly_demand,
                    current_unit_cost: product.current_unit_cost,
                    unit_volume_or_weight: product.unit_volume_or_weight,
                    cycle_time_sec: product.cycle_time_sec,
                    yield_rate: product.yield_rate
                };

                console.log('Uploading product:', payload);

                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successCount++;
                    console.log(`✓ Product ${product.product_id} uploaded successfully`);
                } else {
                    errorCount++;
                    const errorData = await response.json();
                    console.error(`✗ Failed to upload ${product.product_id}:`, errorData);
                    errors.push(`${product.product_id}: ${errorData.detail || 'Unknown error'}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`✗ Error uploading ${product.product_id}:`, error);
                errors.push(`${product.product_id}: ${error.message}`);
            }
        }

        let message = `Products imported:\n✓ Success: ${successCount}\n✗ Failed: ${errorCount}`;
        if (errors.length > 0 && errors.length <= 5) {
            message += '\n\nErrors:\n' + errors.join('\n');
        }

        alert(message);
        await loadProducts();
        await updateSessionStats();
        await updateCurrentSessionData();
        e.target.value = '';
    } catch (error) {
        console.error('Error reading CSV file:', error);
        alert(`Error reading CSV file: ${error.message}`);
        e.target.value = '';
    }
});

// Plants CSV Upload
document.getElementById('plantsCSVUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Processing plants CSV file:', file.name);

    try {
        const text = await file.text();
        console.log('CSV content loaded, parsing...');
        const plants = parseCSV(text);
        console.log('Parsed plants:', plants);

        if (plants.length === 0) {
            alert('CSV file is empty or invalid');
            e.target.value = '';
            return;
        }

        // Validate required fields
        const requiredFields = ['plant_id', 'available_capacity', 'unit_production_cost', 'transfer_fixed_cost'];
        const firstPlant = plants[0];
        const missingFields = requiredFields.filter(field => !(field in firstPlant));

        if (missingFields.length > 0) {
            alert(`Missing required fields: ${missingFields.join(', ')}\n\nRequired fields: ${requiredFields.join(', ')}`);
            e.target.value = '';
            return;
        }

        // Upload plants one by one
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const plant of plants) {
            try {
                const payload = {
                    plant_id: plant.plant_id,
                    available_capacity: plant.available_capacity,
                    unit_production_cost: plant.unit_production_cost,
                    transfer_fixed_cost: plant.transfer_fixed_cost,
                    effective_oee: plant.effective_oee || 1.0,
                    lead_time_to_start: plant.lead_time_to_start || 0,
                    risk_score: plant.risk_score,
                    max_utilization_target: plant.max_utilization_target || 90
                };

                console.log('Uploading plant:', payload);

                const response = await fetch(`${API_BASE_URL}/plants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successCount++;
                    console.log(`✓ Plant ${plant.plant_id} uploaded successfully`);
                } else {
                    errorCount++;
                    const errorData = await response.json();
                    console.error(`✗ Failed to upload ${plant.plant_id}:`, errorData);
                    errors.push(`${plant.plant_id}: ${errorData.detail || 'Unknown error'}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`✗ Error uploading ${plant.plant_id}:`, error);
                errors.push(`${plant.plant_id}: ${error.message}`);
            }
        }

        let message = `Plants imported:\n✓ Success: ${successCount}\n✗ Failed: ${errorCount}`;
        if (errors.length > 0 && errors.length <= 5) {
            message += '\n\nErrors:\n' + errors.join('\n');
        }

        alert(message);
        await loadPlants();
        await updateSessionStats();
        await updateCurrentSessionData();
        e.target.value = '';
    } catch (error) {
        console.error('Error reading CSV file:', error);
        alert(`Error reading CSV file: ${error.message}`);
        e.target.value = '';
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
    const productsList = document.getElementById('productsList');

    if (!productsList) {
        console.error('productsList element not found!');
        return;
    }

    try {
        console.log('Fetching products from backend...');
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const products = await response.json();
        console.log('Products fetched:', products.length);

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
                                <td><strong>${p.current_plant_id || '<span style="color: #707070;">Not Assigned</span>'}</strong></td>
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
        console.warn('Error loading products:', error);
        productsList.innerHTML = `
            <div class="alert alert-warning">
                <p><strong>Unable to connect to backend server</strong></p>
                <p>Please ensure the backend server is running at <code>${API_BASE_URL}</code></p>
            </div>
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
            await updateCurrentSessionData();
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
            await updateCurrentSessionData();
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
    const plantsList = document.getElementById('plantsList');

    if (!plantsList) {
        console.error('plantsList element not found!');
        return;
    }

    try {
        console.log('Fetching plants from backend...');
        const response = await fetch(`${API_BASE_URL}/plants`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const plants = await response.json();
        console.log('Plants fetched:', plants.length);

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
        console.warn('Error loading plants:', error);
        plantsList.innerHTML = `
            <div class="alert alert-warning">
                <p><strong>Unable to connect to backend server</strong></p>
                <p>Please ensure the backend server is running at <code>${API_BASE_URL}</code></p>
            </div>
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
            await updateCurrentSessionData();
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
            await updateCurrentSessionData();
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

            // Enable Next button and automatically go to results
            document.getElementById('nextStep2').disabled = false;
            displayResults(result);

            // Auto-navigate to results after a short delay
            setTimeout(() => {
                goToStep(3);
            }, 1500);
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
        <div class="card" style="border-left: 3px solid #1a1a1a; margin-bottom: 20px;">
            <h3>Transfer Plan Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; margin-top: 15px; background: #d0d0d0;">
                <div style="background: #ffffff; padding: 20px;">
                    <p style="color: #707070; margin: 0; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em;">Products to Transfer</p>
                    <p style="font-size: 2em; font-weight: bold; color: #1a1a1a; margin: 5px 0;">${transfersCount}</p>
                </div>
                <div style="background: #ffffff; padding: 20px;">
                    <p style="color: #707070; margin: 0; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em;">Products Staying</p>
                    <p style="font-size: 2em; font-weight: bold; color: #1a1a1a; margin: 5px 0;">${staysCount}</p>
                </div>
                <div style="background: #ffffff; padding: 20px;">
                    <p style="color: #707070; margin: 0; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em;">Total Products</p>
                    <p style="font-size: 2em; font-weight: bold; color: #1a1a1a; margin: 5px 0;">${result.assignments.length}</p>
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
                        const rowStyle = isTransfer ? 'background: #f5f5f5;' : '';
                        const transferBadge = isTransfer ? '<span style="background: #1a1a1a; color: #ffffff; padding: 4px 10px; border-radius: 0; font-size: 0.75rem; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">TRANSFER</span>' : '<span style="background: #f5f5f5; color: #4a4a4a; padding: 4px 10px; border-radius: 0; font-size: 0.75rem; margin-left: 8px; border: 1px solid #d0d0d0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">STAY</span>';

                        return `
                        <tr style="${rowStyle}">
                            <td><strong>${a.product_id}</strong>${transferBadge}</td>
                            <td><span style="color: #707070;">${a.source_plant_id || 'New'}</span> → <strong style="color: ${isTransfer ? '#1a1a1a' : '#4a4a4a'};">${a.target_plant_id}</strong></td>
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
    // Show sessions page on startup
    showSessionsPage();
});

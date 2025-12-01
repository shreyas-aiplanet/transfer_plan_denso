import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SessionsPage from './components/SessionsPage';
import MainApp from './components/MainApp';
import CreatePlanModal from './components/CreatePlanModal';
import LoadingOverlay from './components/LoadingOverlay';
import { api } from './services/api';
import './styles/main.css';

function App() {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('denso_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState({ show: false, title: '', message: '', progress: 0 });
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    localStorage.setItem('denso_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const showLoading = (title, message) => {
    setLoading({ show: true, title, message, progress: 0 });
  };

  const hideLoading = () => {
    setLoading({ show: false, title: '', message: '', progress: 0 });
  };

  const updateProgress = (progress, message) => {
    setLoading(prev => ({ ...prev, progress, message: message || prev.message }));
  };

  const clearAllData = async () => {
    try {
      const result = await api.clearAllData();
      console.log('Cleared data:', result);
      return result;
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  };

  const handleCreateSession = async (sessionName, productsData, plantsData) => {
    showLoading('Creating Plan', 'Preparing data upload...');
    setShowModal(false);

    try {
      updateProgress(5, 'Clearing existing data...');
      await clearAllData();

      updateProgress(10, 'Uploading products...');
      let productsSuccess = 0;
      for (let i = 0; i < productsData.length; i++) {
        const product = productsData[i];
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
          productsSuccess++;
        } catch (error) {
          console.warn('Error uploading product:', error);
        }
        updateProgress(10 + ((i + 1) / productsData.length) * 40, `Uploading products: ${i + 1}/${productsData.length}`);
      }

      updateProgress(50, 'Uploading plants...');
      let plantsSuccess = 0;
      for (let i = 0; i < plantsData.length; i++) {
        const plant = plantsData[i];
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
          plantsSuccess++;
        } catch (error) {
          console.warn('Error uploading plant:', error);
        }
        updateProgress(50 + ((i + 1) / plantsData.length) * 40, `Uploading plants: ${i + 1}/${plantsData.length}`);
      }

      const newSession = {
        id: Date.now().toString(),
        name: sessionName,
        created_at: new Date().toISOString(),
        products_count: productsSuccess,
        plants_count: plantsSuccess,
        products: productsData,
        plants: plantsData
      };

      setSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);

      updateProgress(100, 'Complete!');
      setTimeout(hideLoading, 500);
    } catch (error) {
      hideLoading();
      alert(`Error creating plan: ${error.message}`);
    }
  };

  const handleOpenSession = async (session) => {
    showLoading('Opening Plan', 'Loading plan data...');

    try {
      await clearAllData();

      if (session.products?.length > 0) {
        updateProgress(10, 'Restoring products...');
        for (let i = 0; i < session.products.length; i++) {
          const product = session.products[i];
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
          } catch (error) {
            console.warn('Error restoring product:', error);
          }
          updateProgress(10 + ((i + 1) / session.products.length) * 40, `Restoring products: ${i + 1}/${session.products.length}`);
        }
      }

      if (session.plants?.length > 0) {
        updateProgress(50, 'Restoring plants...');
        for (let i = 0; i < session.plants.length; i++) {
          const plant = session.plants[i];
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
          } catch (error) {
            console.warn('Error restoring plant:', error);
          }
          updateProgress(50 + ((i + 1) / session.plants.length) * 40, `Restoring plants: ${i + 1}/${session.plants.length}`);
        }
      }

      updateProgress(100, 'Complete!');
      setCurrentSession(session);
      setTimeout(hideLoading, 500);
    } catch (error) {
      hideLoading();
      alert(`Error opening plan: ${error.message}`);
    }
  };

  const handleDeleteSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (confirm(`Are you sure you want to delete the plan "${session.name}"?\n\nThis action cannot be undone.`)) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    }
  };

  const handleBackToSessions = async () => {
    try {
      const products = await api.getProducts();
      const plants = await api.getPlants();

      if (products.length > 0 || plants.length > 0) {
        if (!confirm('You have unsaved data in the current plan. Going back will not save this data.\n\nAre you sure you want to return to plans?')) {
          return;
        }
      }
    } catch (error) {
      console.warn('Could not check for unsaved data:', error);
    }

    setCurrentSession(null);
  };

  const updateSessionData = async () => {
    if (!currentSession) return;

    try {
      const products = await api.getProducts();
      const plants = await api.getPlants();

      setSessions(prev => prev.map(s => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            products: products.map(p => ({
              product_id: p.product_id,
              current_plant_id: p.current_plant_id,
              monthly_demand: p.monthly_demand,
              current_unit_cost: p.current_unit_cost,
              unit_volume_or_weight: p.unit_volume_or_weight,
              cycle_time_sec: p.cycle_time_sec,
              yield_rate: p.yield_rate
            })),
            plants: plants.map(p => ({
              plant_id: p.plant_id,
              available_capacity: p.available_capacity,
              unit_production_cost: p.unit_production_cost,
              transfer_fixed_cost: p.transfer_fixed_cost,
              effective_oee: p.effective_oee,
              lead_time_to_start: p.lead_time_to_start,
              risk_score: p.risk_score,
              max_utilization_target: p.max_utilization_target
            })),
            products_count: products.length,
            plants_count: plants.length
          };
        }
        return s;
      }));
    } catch (error) {
      console.warn('Error updating session data:', error);
    }
  };

  return (
    <div className="app-container">
      <Header
        showBackButton={!!currentSession}
        onBackClick={handleBackToSessions}
      />

      <div className="app-layout">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />

        <div className="main-content-container">
          {!currentSession ? (
            <SessionsPage
              sessions={sessions}
              onCreateClick={() => setShowModal(true)}
              onOpenSession={handleOpenSession}
              onDeleteSession={handleDeleteSession}
            />
          ) : (
            <MainApp
              session={currentSession}
              onUpdateSession={updateSessionData}
            />
          )}
        </div>
      </div>

      <CreatePlanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateSession}
      />

      <LoadingOverlay
        show={loading.show}
        title={loading.title}
        message={loading.message}
        progress={loading.progress}
      />

      <footer>
        <p>&copy; 2025 DENSO Corporation. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import DataManagement from './DataManagement';
import GeneratePlan from './GeneratePlan';
import Results from './Results';

function MainApp({ session, onUpdateSession }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [transferPlanResult, setTransferPlanResult] = useState(null);

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const handlePlanGenerated = (result) => {
    setTransferPlanResult(result);
    setTimeout(() => goToStep(3), 1500);
  };

  return (
    <div className="main-layout">
      <div className="content-wrapper">
        <Stepper currentStep={currentStep} />

        <main>
          {currentStep === 1 && (
            <DataManagement
              onNext={() => goToStep(2)}
              onUpdateSession={onUpdateSession}
            />
          )}

          {currentStep === 2 && (
            <GeneratePlan
              onPrev={() => goToStep(1)}
              onNext={() => goToStep(3)}
              onPlanGenerated={handlePlanGenerated}
              hasResult={!!transferPlanResult}
            />
          )}

          {currentStep === 3 && (
            <Results
              result={transferPlanResult}
              onPrev={() => goToStep(2)}
              onStartOver={() => goToStep(1)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Stepper({ currentStep }) {
  return (
    <div className="stepper">
      <div className={`step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`} data-step="1">
        <div className="step-number">1</div>
        <div className="step-label">Data Management</div>
      </div>
      <div className="step-divider"></div>
      <div className={`step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`} data-step="2">
        <div className="step-number">2</div>
        <div className="step-label">Generate Plan</div>
      </div>
      <div className="step-divider"></div>
      <div className={`step ${currentStep === 3 ? 'active' : ''}`} data-step="3">
        <div className="step-number">3</div>
        <div className="step-label">Results</div>
      </div>
    </div>
  );
}

export default MainApp;

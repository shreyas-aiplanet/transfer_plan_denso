import { useState, useRef } from 'react';
import { parseCSV } from '../services/api';

function CreatePlanModal({ isOpen, onClose, onSubmit }) {
  const [sessionName, setSessionName] = useState('');
  const [productsFile, setProductsFile] = useState(null);
  const [plantsFile, setPlantsFile] = useState(null);
  const [productsData, setProductsData] = useState([]);
  const [plantsData, setPlantsData] = useState([]);

  const productsInputRef = useRef(null);
  const plantsInputRef = useRef(null);

  const resetModal = () => {
    setSessionName('');
    setProductsFile(null);
    setPlantsFile(null);
    setProductsData([]);
    setPlantsData([]);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileUpload = async (file, type) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        alert('CSV file is empty or invalid');
        return;
      }

      if (type === 'products') {
        setProductsFile(file);
        setProductsData(data);
      } else {
        setPlantsFile(file);
        setPlantsData(data);
      }
    } catch (error) {
      alert(`Error reading CSV: ${error.message}`);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file, type);
  };

  const handleSubmit = () => {
    if (!sessionName.trim() || !productsFile || !plantsFile) {
      alert('Please provide plan name and upload both CSV files');
      return;
    }
    onSubmit(sessionName.trim(), productsData, plantsData);
    resetModal();
  };

  const canSubmit = sessionName.trim() && productsFile && plantsFile;

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Plan</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="sessionName">Plan Name *</label>
            <input
              type="text"
              id="sessionName"
              placeholder="e.g., Q1 2025 Transfer Plan"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              required
            />
          </div>

          <div className="csv-upload-section">
            <h3>Upload Data Files</h3>
            <p className="upload-hint">Drag & drop CSV files or click to browse</p>

            <UploadCard
              title="Products Data"
              file={productsFile}
              data={productsData}
              inputRef={productsInputRef}
              onFileChange={(e) => handleFileUpload(e.target.files[0], 'products')}
              onDrop={(e) => handleDrop(e, 'products')}
              onClick={() => productsInputRef.current?.click()}
            />

            <UploadCard
              title="Plants Data"
              file={plantsFile}
              data={plantsData}
              inputRef={plantsInputRef}
              onFileChange={(e) => handleFileUpload(e.target.files[0], 'plants')}
              onDrop={(e) => handleDrop(e, 'plants')}
              onClick={() => plantsInputRef.current?.click()}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            Create Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadCard({ title, file, data, inputRef, onFileChange, onDrop, onClick }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div
      className={`upload-card ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-card-header">
        <h4>{title}</h4>
        <input
          type="file"
          ref={inputRef}
          accept=".csv"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>

      {!file ? (
        <div className={`drop-zone ${isDragging ? 'drag-active' : ''}`} onClick={onClick}>
          <svg className="drop-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <p className="drop-text">Drop {title.toLowerCase()} CSV here</p>
          <p className="drop-subtext">or click to browse</p>
        </div>
      ) : (
        <div className="file-status" style={{ display: 'flex' }}>
          <span className="status-text">{file.name} ({data.length} rows)</span>
        </div>
      )}

      {data.length > 0 && <CSVPreview data={data} />}
    </div>
  );
}

function CSVPreview({ data }) {
  const headers = Object.keys(data[0]);
  const previewRows = data.slice(0, 5);

  return (
    <div className="csv-preview visible">
      <div className="preview-header">
        <div className="preview-info">
          <span>Preview: Showing {previewRows.length} of {data.length} rows</span>
        </div>
      </div>
      <div className="preview-table-wrapper">
        <table className="preview-table">
          <thead>
            <tr>
              {headers.map(header => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                {headers.map(header => (
                  <td key={header}>{row[header] ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CreatePlanModal;

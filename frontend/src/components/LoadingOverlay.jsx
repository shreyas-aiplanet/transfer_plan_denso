function LoadingOverlay({ show, title, message, progress }) {
  if (!show) return null;

  return (
    <div className="loading-overlay active">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="loading-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;

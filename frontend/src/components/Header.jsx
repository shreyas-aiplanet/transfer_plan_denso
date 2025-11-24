function Header({ showBackButton, onBackClick }) {
  return (
    <header>
      <div className="header-content">
        <div className="header-left">
          <img src="/Denso.png" alt="DENSO" className="logo-image" />
          <div className="logo-divider"></div>
          <div className="logo-subtitle">Transfer Plan Recommendation System</div>
        </div>
        <div className="header-right">
          {showBackButton && (
            <button className="back-btn" onClick={onBackClick}>
              Back to Plans
            </button>
          )}
          <div className="powered-by">Powered by AI Planet</div>
        </div>
      </div>
    </header>
  );
}

export default Header;

function Sidebar({ activePage, onPageChange }) {
  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <a
          href="#"
          className={`sidebar-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); onPageChange('dashboard'); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </a>
        <a
          href="#"
          className={`sidebar-nav-item ${activePage === 'settings' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); onPageChange('settings'); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
          </svg>
          <span>Settings</span>
        </a>
      </nav>
    </aside>
  );
}

export default Sidebar;

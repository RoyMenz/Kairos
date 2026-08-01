import { useState } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import Sidebar from '../components/Sidebar.jsx';

function DashboardLayout({ children, currentPath, title, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="dashboard-page app-layout">
      <button className="mobile-menu" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">☰</button>
      <Sidebar currentPath={currentPath} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <AppHeader title={title} theme={theme} onToggleTheme={onToggleTheme} />
      {children}
    </div>
  );
}

export default DashboardLayout;

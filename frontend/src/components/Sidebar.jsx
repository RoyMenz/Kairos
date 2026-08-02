const navigation = [
  { icon: '▦', label: 'Dashboard', href: '/dashboard' },
  { icon: '◉', label: 'Employees', href: '/employees' },
  { icon: '⌘', label: 'Workflows', href: '/workflows' },
  { icon: '▤', label: 'Applications', href: '/applications' },
  { icon: '☷', label: 'Logs', href: '/logs' },
];

function Sidebar({ currentPath, open, onNavigate }) {
  function isActive(href) {
    if (href === '/employees') return currentPath === '/employees' || currentPath.startsWith('/employees/');
    return currentPath === href;
  }

  function handleLogout() {
    localStorage.removeItem('kairos_access_token');
    localStorage.removeItem('kairos_user');
    onNavigate?.();
    window.location.href = '/login';
  }

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar-brand overview-brand">
        <i>ϟ</i>
        <div><strong>PeopleFlow</strong><span>Enterprise HR</span></div>
      </div>
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map(({ icon, label, href }) => (
          <a className={isActive(href) ? 'active' : ''} href={href} key={label} onClick={onNavigate}>
            <span aria-hidden="true">{icon}</span>{label}
          </a>
        ))}
      </nav>
      <button className="sidebar-logout" type="button" onClick={handleLogout}>
        <span aria-hidden="true">⇥</span>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;

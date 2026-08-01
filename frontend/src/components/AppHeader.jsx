import NotificationButton from './NotificationButton.jsx';

function AppHeader({ title, theme, onToggleTheme }) {
  return (
    <header className="topbar shared-topbar">
      <strong>{title}</strong>
      <div className="app-header-actions">
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <NotificationButton />
      </div>
    </header>
  );
}

export default AppHeader;

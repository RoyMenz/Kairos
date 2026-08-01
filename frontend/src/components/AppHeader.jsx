import NotificationButton from './NotificationButton.jsx';

function AppHeader({ title }) {
  return (
    <header className="topbar shared-topbar">
      <strong>{title}</strong>
      <NotificationButton />
    </header>
  );
}

export default AppHeader;

import { createElement, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

const pages = {
  '/': LoginPage,
  '/login': LoginPage,
  '/dashboard': DashboardPage,
};

function App() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const Page = pages[pathname] || DashboardPage;

  useEffect(() => {
    document.title = pathname === '/dashboard' ? 'Employee Onboarding | PeopleFlow' : 'HR Login | PeopleFlow';
  }, [pathname]);

  return createElement(Page);
}

export default App;

import { createElement, useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AddEmployeePage from './pages/AddEmployeePage.jsx';
import WorkflowsPage from './pages/WorkflowsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

const pages = {
  '/': LoginPage,
  '/login': LoginPage,
  '/dashboard': DashboardPage,
  '/employees': EmployeesPage,
  '/employees/new': AddEmployeePage,
  '/workflows': WorkflowsPage,
  '/applications': ApplicationsPage,
  '/logs': LogsPage,
  '/settings': SettingsPage,
};

const pageTitles = {
  '/': 'HR Login | PeopleFlow',
  '/login': 'HR Login | PeopleFlow',
  '/dashboard': 'Dashboard | PeopleFlow',
  '/employees': 'Employees Directory | PeopleFlow',
  '/employees/new': 'Add Employee | PeopleFlow',
  '/workflows': 'Workflows | PeopleFlow',
  '/applications': 'Applications | PeopleFlow',
  '/logs': 'Logs & Monitoring | PeopleFlow',
  '/settings': 'Settings | PeopleFlow',
};

const appBarTitles = {
  '/dashboard': 'Provisioning Overview',
  '/employees': 'Employees',
  '/employees/new': 'Create Employee Profile',
  '/workflows': 'Workflow Engine',
  '/applications': 'Integrated Applications',
  '/logs': 'Event Logs',
  '/settings': 'Organization Settings',
};

function App() {
  const [theme, setTheme] = useState(() => {
    const initializedTheme = document.documentElement.dataset.theme;
    if (initializedTheme === 'dark' || initializedTheme === 'light') return initializedTheme;
    const savedTheme = localStorage.getItem('peopleflow-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const isLoginPage = pathname === '/' || pathname === '/login';
  const isAuthenticated = Boolean(localStorage.getItem('kairos_access_token'));
  const Page = pages[pathname] || DashboardPage;
  const resolvedPath = pages[pathname] ? pathname : '/dashboard';

  useEffect(() => {
    document.title = pageTitles[pathname] || 'PeopleFlow';
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('peopleflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    function enforceAuthentication() {
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      const isProtectedPage = currentPath !== '/' && currentPath !== '/login';
      if (isProtectedPage && !localStorage.getItem('kairos_access_token')) {
        window.location.replace('/login');
      }
    }

    enforceAuthentication();
    window.addEventListener('pageshow', enforceAuthentication);
    return () => window.removeEventListener('pageshow', enforceAuthentication);
  }, []);

  if (!isLoginPage && !isAuthenticated) return null;
  if (isLoginPage) return createElement(Page);

  return createElement(
    DashboardLayout,
    {
      currentPath: resolvedPath,
      title: appBarTitles[resolvedPath] || 'Provisioning Overview',
      theme,
      onToggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
    },
    createElement(Page),
  );
}

export default App;

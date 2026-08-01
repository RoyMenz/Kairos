import { createElement, useEffect } from 'react';
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
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const Page = pages[pathname] || DashboardPage;
  const resolvedPath = pages[pathname] ? pathname : '/dashboard';

  useEffect(() => {
    document.title = pageTitles[pathname] || 'PeopleFlow';
  }, [pathname]);

  if (pathname === '/' || pathname === '/login') return createElement(Page);

  return createElement(
    DashboardLayout,
    { currentPath: resolvedPath, title: appBarTitles[resolvedPath] || 'Provisioning Overview' },
    createElement(Page),
  );
}

export default App;

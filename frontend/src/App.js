import { createElement, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AddEmployeePage from './pages/AddEmployeePage.jsx';
import WorkflowsPage from './pages/WorkflowsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

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

function App() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const Page = pages[pathname] || DashboardPage;

  useEffect(() => {
    document.title = pageTitles[pathname] || 'PeopleFlow';
  }, [pathname]);

  return createElement(Page);
}

export default App;

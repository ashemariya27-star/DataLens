import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, Moon, Search, Sun, UserRound } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SubjectsPage from './pages/SubjectsPage';
import PlannerPage from './pages/PlannerPage';
import TasksPage from './pages/TasksPage';
import MaterialsPage from './pages/MaterialsPage';
import RemindersPage from './pages/RemindersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { getDashboard, getDatasets, getMaterials, getSubjects, getTasks } from './api';
import './App.css';

function WorkspaceTopbar({ theme, setTheme }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [searchData, setSearchData] = useState({ subjects: [], tasks: [], materials: [], datasets: [] });
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    Promise.allSettled([getSubjects(), getTasks(), getMaterials(), getDatasets(), getDashboard()]).then((results) => {
      setSearchData({
        subjects: results[0].status === 'fulfilled' ? results[0].value : [],
        tasks: results[1].status === 'fulfilled' ? results[1].value : [],
        materials: results[2].status === 'fulfilled' ? results[2].value : [],
        datasets: results[3].status === 'fulfilled' ? results[3].value : [],
      });
      if (results[4].status === 'fulfilled') setReminderCount(results[4].value.upcoming_reminders || 0);
    });
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.trim().toLowerCase();
    return [
      ...searchData.subjects.map((item) => ({ name: item.name, detail: `Subject · ${item.code}`, path: '/subjects' })),
      ...searchData.tasks.map((item) => ({ name: item.title, detail: `Task · ${item.status}`, path: '/tasks' })),
      ...searchData.materials.map((item) => ({ name: item.title, detail: `Study material · ${item.subject_name || 'Academic'}`, path: '/materials' })),
      ...searchData.datasets.map((item) => ({ name: item.filename, detail: `Dataset · ${item.row_count} rows`, path: '/analytics' })),
    ].filter((item) => `${item.name} ${item.detail}`.toLowerCase().includes(needle)).slice(0, 6);
  }, [query, searchData]);

  return (
    <header className="workspace-topbar">
      <div className="workspace-search"><Search size={18} /><input aria-label="Search your academic workspace" placeholder="Search subjects, tasks, notes…" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} />
        {open && query.trim() && <div className="workspace-search-results">{results.length ? results.map((item, index) => <Link key={`${item.name}-${index}`} to={item.path} onClick={() => setQuery('')}><strong>{item.name}</strong><small>{item.detail}</small></Link>) : <p>No matching academic records.</p>}</div>}
      </div>
      <div className="workspace-tools">
        <button className="workspace-theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Sun size={16} /><Moon size={16} /></button>
        <Link className="workspace-bell" to="/reminders" aria-label={`${reminderCount} upcoming reminders`}><Bell size={19} />{reminderCount > 0 && <span>{reminderCount}</span>}</Link>
        <div className="workspace-user"><span><UserRound size={17} /></span><div><strong>Academic workspace</strong><small>Tutor dashboard</small></div></div>
      </div>
    </header>
  );
}

function AppShell() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('datalens-dashboard-theme') || 'dark');
  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem('datalens-dashboard-theme') || 'dark');
    window.addEventListener('datalens-theme-change', syncTheme);
    return () => window.removeEventListener('datalens-theme-change', syncTheme);
  }, []);
  useEffect(() => { localStorage.setItem('datalens-dashboard-theme', theme); }, [theme]);
  const isDashboard = location.pathname === '/';

  return (
    <div className={`app-shell ${theme === 'light' ? 'workspace-light' : ''}`}>
      <Sidebar />
      <main className="main-panel">
        {!isDashboard && <WorkspaceTopbar theme={theme} setTheme={setTheme} />}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}



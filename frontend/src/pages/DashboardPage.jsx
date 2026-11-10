import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, Bell,
  BookOpen, CalendarDays, Check, CheckSquare, Clock3, FileSpreadsheet,
  GraduationCap, Moon, Search, Sun, UploadCloud, UserRound,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  getDashboard, getDatasets, getMaterials, getSchedules, getSubjects, getTasks,
  getApiErrorMessage,
} from '../api';
import { formatDate } from '../utils/dateFormatting';
import {
  bindDashboardRefreshEvents, buildDashboardState, buildScheduleChartData,
  createDashboardRefreshController, getTaskDistribution,
} from '../dashboardSync';
import { DASHBOARD_DESTINATIONS } from '../dashboardNavigation';
import './DashboardPage.css';

const palette = ['#e7b768', '#38c99b', '#348fd3', '#b58af4'];
const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sectionErrors, setSectionErrors] = useState({});
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('datalens-dashboard-theme') || 'dark');
  const refreshControllerRef = useRef(null);

  useEffect(() => {
    const controller = createDashboardRefreshController(async (isCurrent) => {
      setIsLoading(true);
      setError('');
      const [summary, tasks, subjects, schedules, materials, datasets] = await Promise.allSettled([
        getDashboard(), getTasks(), getSubjects(), getSchedules(), getMaterials(), getDatasets(),
      ]);
      if (!isCurrent()) return;
      const dashboardState = buildDashboardState([summary, tasks, subjects, schedules, materials, datasets], getApiErrorMessage);
      setError(dashboardState.error);
      if (dashboardState.error) {
        setIsLoading(false);
        return;
      }
      setSectionErrors(dashboardState.sectionErrors);
      setData(dashboardState.data);
      setIsLoading(false);
    });
    refreshControllerRef.current = controller;
    const removeRefreshListeners = bindDashboardRefreshEvents({
      windowObject: window,
      documentObject: document,
      onRefresh: () => { void controller.refresh(); },
    });
    void controller.refresh();

    return () => {
      removeRefreshListeners();
      controller.dispose();
      if (refreshControllerRef.current === controller) refreshControllerRef.current = null;
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('datalens-dashboard-theme', theme);
    window.dispatchEvent(new Event('datalens-theme-change'));
  }, [theme]);

  const searchResults = useMemo(() => {
    if (!data || !query.trim()) return [];
    const needle = query.trim().toLowerCase();
    return [
      ...data.subjects.map((item) => ({ title: item.name, detail: `Subject · ${item.code}`, to: '/subjects' })),
      ...data.tasks.map((item) => ({ title: item.title, detail: `Task · ${item.status}`, to: '/tasks' })),
      ...data.materials.map((item) => ({ title: item.title, detail: `Study material · ${item.subject_name || 'Academic'}`, to: '/materials' })),
      ...data.datasets.map((item) => ({ title: item.filename, detail: `Dataset · ${item.row_count} rows`, to: '/analytics' })),
    ].filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(needle)).slice(0, 6);
  }, [data, query]);

  if (isLoading) return <div className={`dashboard-state ${theme === 'dark' ? 'dashboard-dark' : 'dashboard-light'}`} role="status">Preparing your academic overview…</div>;
  if (error) return <section className={`dashboard-state dashboard-error ${theme === 'dark' ? 'dashboard-dark' : 'dashboard-light'}`} role="alert"><p>{error}</p><button type="button" onClick={() => { void refreshControllerRef.current?.refresh(); }}>Retry</button></section>;
  if (!data) return null;

  const { summary, tasks, schedules, datasets } = data;
  const statusCounts = getTaskDistribution(tasks);
  const thisWeek = buildScheduleChartData(summary.weekly_activity, schedules);
  const upcoming = [...tasks]
    .filter((task) => task.status !== 'Completed')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 3);
  const recentUploads = [...datasets].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).slice(0, 3);
  const themeIsDark = theme === 'dark';

  return (
    <div className={`dashboard-shell ${themeIsDark ? 'dashboard-dark' : 'dashboard-light'}`}>
      <header className="dashboard-topbar">
        <div className="dashboard-search-wrap">
          <Search size={19} />
          <input
            aria-label="Search subjects, tasks, and study materials"
            placeholder="Search subjects, tasks, notes…"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
          />
          {searchOpen && query.trim() && (
            <div className="dashboard-search-results">
              {Object.keys(sectionErrors).length > 0 && <p role="alert">Search results may be incomplete because some records could not be loaded.</p>}
              {searchResults.length ? searchResults.map((item, index) => (
                <Link to={item.to} key={`${item.title}-${index}`} onClick={() => setQuery('')}>
                  <strong>{item.title}</strong><small>{item.detail}</small>
                </Link>
              )) : <p>{Object.keys(sectionErrors).length ? 'Some records could not be searched. Try again after the connection recovers.' : 'No matching subjects, tasks, materials, or datasets.'}</p>}
            </div>
          )}
        </div>
        <div className="dashboard-top-actions">
          <button className="theme-switch" type="button" onClick={() => setTheme(themeIsDark ? 'light' : 'dark')} aria-label={`Switch to ${themeIsDark ? 'light' : 'dark'} theme`}>
            <span className={themeIsDark ? '' : 'selected'}><Sun size={16} /></span>
            <span className={themeIsDark ? 'selected' : ''}><Moon size={16} /></span>
          </button>
          <Link to={DASHBOARD_DESTINATIONS.reminders} className="notification-button" aria-label={`${summary.upcoming_reminders} upcoming reminders`}>
            <Bell size={20} />{summary.upcoming_reminders > 0 && <span>{summary.upcoming_reminders}</span>}
          </Link>
          <Link to={DASHBOARD_DESTINATIONS.settings} className="workspace-profile" aria-label="Open profile and settings"><span className="profile-avatar"><UserRound size={18} /></span><span><strong>Academic workspace</strong><small>Tutor dashboard</small></span></Link>
        </div>
      </header>

      <section className="dashboard-welcome">
        <div><p className="dashboard-kicker">Your learning command centre</p><h1>Welcome back <span>to DataLens</span></h1><p>Here’s your academic overview for today.</p></div>
        <div className="welcome-quote"><GraduationCap size={24} /><p>“Knowledge is the key<br />to a brighter future.”</p></div>
        <div className="welcome-orbit" aria-hidden="true" />
      </section>

      <section className="dashboard-metrics" aria-label="Academic statistics">
        <button type="button" className="metric-card metric-gold metric-card-link" aria-label={`Total Subjects: ${summary.total_subjects}. Open Subjects.`} onClick={() => navigate(DASHBOARD_DESTINATIONS.subjects)}><span className="metric-icon"><BookOpen /></span><div><small>Total Subjects</small><strong>{summary.total_subjects}</strong></div></button>
        <button type="button" className="metric-card metric-blue metric-card-link" aria-label={`Total Tasks: ${summary.total_tasks}. Open Tasks and Assignments.`} onClick={() => navigate(DASHBOARD_DESTINATIONS.totalTasks)}><span className="metric-icon"><CheckSquare /></span><div><small>Total Tasks</small><strong>{summary.total_tasks}</strong></div></button>
        <button type="button" className="metric-card metric-violet metric-card-link" aria-label={`Pending Tasks: ${summary.pending_tasks}. Open Tasks and Assignments; status filtering is unavailable.`} onClick={() => navigate(DASHBOARD_DESTINATIONS.pendingTasks)}><span className="metric-icon"><Clock3 /></span><div><small>Pending Tasks</small><strong>{summary.pending_tasks}</strong></div></button>
        <button type="button" className="metric-card metric-mint metric-card-link" aria-label={`Completed Tasks: ${summary.completed_tasks}. Open Tasks and Assignments; status filtering is unavailable.`} onClick={() => navigate(DASHBOARD_DESTINATIONS.completedTasks)}><span className="metric-icon"><Check /></span><div><small>Completed Tasks</small><strong>{summary.completed_tasks}</strong></div></button>
      </section>

      <section className="dashboard-charts">
        <article className="dashboard-card overview-chart-card">
          <div className="dashboard-card-heading"><div><BarChart3 /><h2>Academic Overview</h2></div><div className="dashboard-section-links"><Link className="dashboard-section-link" to={DASHBOARD_DESTINATIONS.tasks}>Tasks</Link><Link className="dashboard-section-link" to={DASHBOARD_DESTINATIONS.planner}>Planner</Link><span className="chart-period">Next 7 days</span></div></div>
          <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.weekly_activity} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Bar dataKey="value" name="Tasks & sessions" fill="#e5b260" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </article>
        <article className="dashboard-card distribution-card">
          <div className="dashboard-card-heading"><div><Activity /><h2>Task Distribution</h2></div><Link className="dashboard-section-link" to={DASHBOARD_DESTINATIONS.tasks}>View tasks <ArrowRight size={13} /></Link></div>
          {sectionErrors.tasks ? <p className="dashboard-empty" role="alert">{sectionErrors.tasks}</p> : statusCounts.length ? <div className="distribution-layout"><div className="distribution-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius="63%" outerRadius="91%" paddingAngle={3} stroke="none">{statusCounts.map((entry, index) => <Cell key={entry.name} fill={['#e8b65e', '#358fd4', '#39c89a', palette[3]][['Pending', 'In Progress', 'Completed', 'Other'].indexOf(entry.name)] || palette[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><strong>{tasks.length}<small>Total</small></strong></div><div className="distribution-legend">{statusCounts.map((item) => <div key={item.name}><i className={`legend-${item.name.toLowerCase().replace(' ', '-')}`} style={item.name === 'Other' ? { backgroundColor: palette[3] } : undefined} /><span>{item.name}</span><b>{item.percentage}%</b></div>)}</div></div> : <p className="dashboard-empty">Add tasks to see their status breakdown.</p>}
        </article>
        <article className="dashboard-card schedule-card">
          <div className="dashboard-card-heading"><div><CalendarDays /><h2>Study Schedule</h2></div><div className="dashboard-section-links"><Link className="dashboard-section-link" to={DASHBOARD_DESTINATIONS.planner}>Open planner <ArrowRight size={13} /></Link><span className="chart-period">This week</span></div></div>
          {sectionErrors.schedules ? <p className="dashboard-empty" role="alert">{sectionErrors.schedules}</p> : <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={thisWeek}><defs><linearGradient id="scheduleFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d6a858" stopOpacity={0.34} /><stop offset="100%" stopColor="#d6a858" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={25} /><Tooltip /><Area type="monotone" dataKey="count" name="Scheduled sessions" stroke="#e5b260" strokeWidth={2.5} fill="url(#scheduleFill)" /></AreaChart></ResponsiveContainer></div>}
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-card upcoming-card"><div className="dashboard-card-heading"><div><CalendarDays /><h2>Upcoming Activities</h2></div><Link to={DASHBOARD_DESTINATIONS.tasks}>View all <ArrowRight size={15} /></Link></div>
          {sectionErrors.tasks ? <p className="dashboard-empty" role="alert">{sectionErrors.tasks}</p> : upcoming.length ? <div className="dashboard-list">{upcoming.map((task) => <Link className="dashboard-list-row dashboard-row-link" to={DASHBOARD_DESTINATIONS.upcomingActivity} aria-label={`Open task: ${task.title}`} key={task.id}><span className="date-tile date-tile-full">{task.due_date ? formatDate(task.due_date) : 'No due date'}</span><div className="list-copy"><strong>{task.title}</strong><small>{task.subject_name || 'Subject'} · {task.activity_type}</small></div><span className={`priority-pill priority-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'Medium'}</span></Link>)}</div> : <p className="dashboard-empty">No upcoming tasks. Add an activity to see it here.</p>}
        </article>
        <article className="dashboard-card uploads-card"><div className="dashboard-card-heading"><div><UploadCloud /><h2>Recent Uploads</h2></div><Link to={DASHBOARD_DESTINATIONS.analytics}>View all <ArrowRight size={15} /></Link></div>
          {sectionErrors.datasets ? <p className="dashboard-empty" role="alert">{sectionErrors.datasets}</p> : recentUploads.length ? <div className="dashboard-list">{recentUploads.map((dataset) => <Link className="dashboard-list-row dashboard-row-link" to={DASHBOARD_DESTINATIONS.recentUpload} aria-label={`Open analytics for dataset: ${dataset.filename}`} key={dataset.id}><span className="upload-file-icon"><FileSpreadsheet size={19} /></span><div className="list-copy"><strong>{dataset.filename}</strong><small>{formatBytes(dataset.size_bytes)} · {dataset.row_count.toLocaleString()} rows</small></div><span className="processed-pill">Processed</span></Link>)}</div> : <p className="dashboard-empty">No datasets uploaded yet. Upload one to start exploring.</p>}
        </article>
        <article className="dashboard-card quick-actions-card"><div className="dashboard-card-heading"><div><Activity /><h2>Quick Actions</h2></div></div><div className="quick-action-grid"><Link to={DASHBOARD_DESTINATIONS.subjects}><BookOpen /><span>Add Subject</span></Link><Link to={DASHBOARD_DESTINATIONS.tasks}><CheckSquare /><span>Create Task</span></Link><Link to={DASHBOARD_DESTINATIONS.analytics}><UploadCloud /><span>Upload Dataset</span></Link><Link to={DASHBOARD_DESTINATIONS.analytics}><BarChart3 /><span>View Analytics</span></Link></div></article>
      </section>
    </div>
  );
}





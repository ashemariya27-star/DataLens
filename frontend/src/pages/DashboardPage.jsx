import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell,
  BookOpen, CalendarDays, Check, CheckSquare, Clock3, FileSpreadsheet,
  GraduationCap, Moon, Search, Sun, UploadCloud, UserRound,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  getDashboard, getDatasets, getMaterials, getSchedules, getSubjects, getTasks,
} from '../api';

const palette = ['#e7b768', '#38c99b', '#348fd3', '#b58af4'];
const shortDate = (value) => {
  if (!value) return 'No due date';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('datalens-dashboard-theme') || 'dark');
  const [currentDate] = useState(() => new Date());

  const loadDashboard = async () => {
    const [summary, tasks, subjects, schedules, materials, datasets] = await Promise.allSettled([
      getDashboard(), getTasks(), getSubjects(), getSchedules(), getMaterials(), getDatasets(),
    ]);
    if (summary.status === 'rejected') {
      setError('Dashboard data could not be loaded. Check that the backend is running and try again.');
      setIsLoading(false);
      return;
    }
    setData({
      summary: summary.value,
      tasks: tasks.status === 'fulfilled' ? tasks.value : [],
      subjects: subjects.status === 'fulfilled' ? subjects.value : [],
      schedules: schedules.status === 'fulfilled' ? schedules.value : [],
      materials: materials.status === 'fulfilled' ? materials.value : [],
      datasets: datasets.status === 'fulfilled' ? datasets.value : [],
    });
    setIsLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);
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

  if (isLoading) return <div className="dashboard-state" role="status">Preparing your academic overview…</div>;
  if (error) return <section className="dashboard-state dashboard-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setIsLoading(true); setError(''); loadDashboard(); }}>Retry</button></section>;
  if (!data) return null;

  const { summary, tasks, schedules, datasets } = data;
  const statusCounts = [
    { name: 'Pending', value: tasks.filter((task) => task.status === 'Pending').length },
    { name: 'In Progress', value: tasks.filter((task) => task.status === 'In Progress').length },
    { name: 'Completed', value: tasks.filter((task) => task.status === 'Completed').length },
  ].filter((item) => item.value > 0);
  const thisWeek = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const isoDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), count: schedules.filter((entry) => entry.scheduled_date === isoDate).length };
  });
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
              {searchResults.length ? searchResults.map((item, index) => (
                <Link to={item.to} key={`${item.title}-${index}`} onClick={() => setQuery('')}>
                  <strong>{item.title}</strong><small>{item.detail}</small>
                </Link>
              )) : <p>No matching subjects, tasks, materials, or datasets.</p>}
            </div>
          )}
        </div>
        <div className="dashboard-top-actions">
          <button className="theme-switch" type="button" onClick={() => setTheme(themeIsDark ? 'light' : 'dark')} aria-label={`Switch to ${themeIsDark ? 'light' : 'dark'} theme`}>
            <span className={themeIsDark ? '' : 'selected'}><Sun size={16} /></span>
            <span className={themeIsDark ? 'selected' : ''}><Moon size={16} /></span>
          </button>
          <Link to="/reminders" className="notification-button" aria-label={`${summary.upcoming_reminders} upcoming reminders`}>
            <Bell size={20} />{summary.upcoming_reminders > 0 && <span>{summary.upcoming_reminders}</span>}
          </Link>
          <div className="workspace-profile"><span className="profile-avatar"><UserRound size={18} /></span><span><strong>Academic workspace</strong><small>Tutor dashboard</small></span></div>
        </div>
      </header>

      <section className="dashboard-welcome">
        <div><p className="dashboard-kicker">Your learning command centre</p><h1>Welcome back <span>to DataLens</span></h1><p>Here’s your academic overview for today.</p></div>
        <div className="welcome-quote"><GraduationCap size={24} /><p>“Knowledge is the key<br />to a brighter future.”</p></div>
        <div className="welcome-orbit" aria-hidden="true" />
      </section>

      <section className="dashboard-metrics" aria-label="Academic statistics">
        <article className="metric-card metric-gold"><span className="metric-icon"><BookOpen /></span><div><small>Total Subjects</small><strong>{summary.total_subjects}</strong><em><ArrowUpRight size={14} /> Active courses</em></div><span className="metric-spark spark-gold" /></article>
        <article className="metric-card metric-blue"><span className="metric-icon"><CheckSquare /></span><div><small>Total Tasks</small><strong>{summary.total_tasks}</strong><em><Activity size={14} /> All assignments</em></div><span className="metric-spark spark-blue" /></article>
        <article className="metric-card metric-violet"><span className="metric-icon"><Clock3 /></span><div><small>Pending Tasks</small><strong>{summary.pending_tasks}</strong><em><ArrowDownRight size={14} /> Need attention</em></div><span className="metric-spark spark-violet" /></article>
        <article className="metric-card metric-mint"><span className="metric-icon"><Check /></span><div><small>Completed Tasks</small><strong>{summary.completed_tasks}</strong><em><ArrowUpRight size={14} /> Successfully done</em></div><span className="metric-spark spark-mint" /></article>
      </section>

      <section className="dashboard-charts">
        <article className="dashboard-card overview-chart-card">
          <div className="dashboard-card-heading"><div><BarChart3 /><h2>Academic Overview</h2></div><span className="chart-period">Next 7 days</span></div>
          <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.weekly_activity} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Bar dataKey="value" name="Tasks & sessions" fill="#e5b260" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </article>
        <article className="dashboard-card distribution-card">
          <div className="dashboard-card-heading"><div><Activity /><h2>Task Distribution</h2></div></div>
          {statusCounts.length ? <div className="distribution-layout"><div className="distribution-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius="63%" outerRadius="91%" paddingAngle={3} stroke="none">{statusCounts.map((entry, index) => <Cell key={entry.name} fill={['#e8b65e', '#358fd4', '#39c89a'][['Pending', 'In Progress', 'Completed'].indexOf(entry.name)] || palette[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><strong>{tasks.length}<small>Total</small></strong></div><div className="distribution-legend">{statusCounts.map((item) => <div key={item.name}><i className={`legend-${item.name.toLowerCase().replace(' ', '-')}`} /><span>{item.name}</span><b>{Math.round((item.value / tasks.length) * 100)}%</b></div>)}</div></div> : <p className="dashboard-empty">Add tasks to see their status breakdown.</p>}
        </article>
        <article className="dashboard-card schedule-card">
          <div className="dashboard-card-heading"><div><CalendarDays /><h2>Study Schedule</h2></div><span className="chart-period">This week</span></div>
          <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={thisWeek}><defs><linearGradient id="scheduleFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d6a858" stopOpacity={0.34} /><stop offset="100%" stopColor="#d6a858" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={25} /><Tooltip /><Area type="monotone" dataKey="count" name="Scheduled sessions" stroke="#e5b260" strokeWidth={2.5} fill="url(#scheduleFill)" /></AreaChart></ResponsiveContainer></div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-card upcoming-card"><div className="dashboard-card-heading"><div><CalendarDays /><h2>Upcoming Activities</h2></div><Link to="/tasks">View all <ArrowRight size={15} /></Link></div>
          {upcoming.length ? <div className="dashboard-list">{upcoming.map((task) => <div className="dashboard-list-row" key={task.id}><span className="date-tile">{shortDate(task.due_date)}</span><div className="list-copy"><strong>{task.title}</strong><small>{task.subject_name || 'Subject'} · {task.activity_type}</small></div><span className={`priority-pill priority-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'Medium'}</span></div>)}</div> : <p className="dashboard-empty">No upcoming tasks. Add an activity to see it here.</p>}
        </article>
        <article className="dashboard-card uploads-card"><div className="dashboard-card-heading"><div><UploadCloud /><h2>Recent Uploads</h2></div><Link to="/analytics">View all <ArrowRight size={15} /></Link></div>
          {recentUploads.length ? <div className="dashboard-list">{recentUploads.map((dataset) => <div className="dashboard-list-row" key={dataset.id}><span className="upload-file-icon"><FileSpreadsheet size={19} /></span><div className="list-copy"><strong>{dataset.filename}</strong><small>{formatBytes(dataset.size_bytes)} · {dataset.row_count.toLocaleString()} rows</small></div><span className="processed-pill">Processed</span></div>)}</div> : <p className="dashboard-empty">No datasets uploaded yet. Upload one to start exploring.</p>}
        </article>
        <article className="dashboard-card quick-actions-card"><div className="dashboard-card-heading"><div><Activity /><h2>Quick Actions</h2></div></div><div className="quick-action-grid"><Link to="/subjects"><BookOpen /><span>Add Subject</span></Link><Link to="/tasks"><CheckSquare /><span>Create Task</span></Link><Link to="/analytics"><UploadCloud /><span>Upload Dataset</span></Link><Link to="/analytics"><BarChart3 /><span>View Analytics</span></Link></div></article>
      </section>
    </div>
  );
}





import { BarChart3, BellRing, BookOpen, CalendarRange, ClipboardList, FileText, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import './Sidebar.css';

const academicItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Weekly Planner', path: '/planner', icon: CalendarRange },
  { label: 'Tasks & Assignments', path: '/tasks', icon: ClipboardList },
  { label: 'Notes & Materials', path: '/materials', icon: FileText },
  { label: 'Reminders & Notifications', path: '/reminders', icon: BellRing },
];

const analyticsItems = [
  { label: 'Datasets & Analytics', path: '/analytics', icon: BarChart3 },
];

function NavigationLinks({ items }) {
  return items.map(({ label, path, icon: Icon }) => (
    <NavLink key={label} to={path} end={path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  ));
}

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand-block">
        <img className="brand-logo" src="/datalens-icon.png" alt="" aria-hidden="true" />
        <div className="brand-copy">
          <span className="brand-name">DataLens</span>
          <span className="brand-subtitle">Academic &amp; Analytics</span>
        </div>
      </div>

      <nav className="nav-menu">
        <section className="nav-section" aria-labelledby="academic-nav-heading">
          <h2 className="nav-section-title" id="academic-nav-heading"><BookOpen size={14} aria-hidden="true" />Academic Workspace</h2>
          <div className="nav-section-links"><NavigationLinks items={academicItems} /></div>
        </section>
        <section className="nav-section" aria-labelledby="analytics-nav-heading">
          <h2 className="nav-section-title" id="analytics-nav-heading"><FolderKanban size={14} aria-hidden="true" />Analytics Workspace</h2>
          <div className="nav-section-links"><NavigationLinks items={analyticsItems} /></div>
        </section>
      </nav>

      <div className="sidebar-footer">
        <NavigationLinks items={[{ label: 'Profile & Settings', path: '/settings', icon: Settings }]} />
      </div>
    </aside>
  );
}

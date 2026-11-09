import { LayoutDashboard, BookOpen, CalendarRange, ClipboardList, FileText, BellRing, BarChart3, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Weekly Planner', path: '/planner', icon: CalendarRange },
  { label: 'Tasks & Assignments', path: '/tasks', icon: ClipboardList },
  { label: 'Tests & Examinations', path: '/tasks', icon: FileText },
  { label: 'Notes & Materials', path: '/materials', icon: FileText },
  { label: 'Reminders & Notifications', path: '/reminders', icon: BellRing },
  { label: 'DataLens Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img className="brand-logo" src="/datalens-brand.png" alt="DataLens — Plan. Manage. Analyse. Improve." />
      </div>

      <nav className="nav-menu">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={label} to={path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

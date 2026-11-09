import { Bell, Palette, UserCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">System</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        <section className="panel">
          <div className="section-heading">
            <h2>Application profile</h2>
          </div>
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-icon"><UserCircle size={18} /></span>
              <div>
                <strong>Tutor profile</strong>
                <small>Single-tutor prototype</small>
              </div>
            </div>
            <p>This MVP is intentionally designed for a single tutor workspace without authentication.</p>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Preferences</h2>
          </div>
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-icon"><Bell size={18} /></span>
              <div>
                <strong>Notifications</strong>
                <small>In-app reminders and browser alerts</small>
              </div>
            </div>
            <label className="toggle-row">
              <input type="checkbox" defaultChecked />
              Enable reminder notifications
            </label>
          </div>
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-icon"><Palette size={18} /></span>
              <div>
                <strong>Theme</strong>
                <small>Professional navy palette</small>
              </div>
            </div>
            <p>Current visual theme uses the DataLens navy, lavender, and mint palette for a clean academic interface.</p>
          </div>
        </section>
      </div>
    </>
  );
}

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
                <small>Single-user prototype</small>
              </div>
            </div>
            <p>This prototype has one shared workspace. Account sign-in and separate user workspaces are not available yet.</p>
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
                <small>Future feature</small>
              </div>
            </div>
            <p>Notification preferences are not configurable in this prototype.</p>
          </div>
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-icon"><Palette size={18} /></span>
              <div>
                <strong>Theme</strong>
                <small>Dark and light themes</small>
              </div>
            </div>
            <p>Use the theme control in the top bar to switch between dark and light appearance.</p>
          </div>
        </section>
      </div>
    </>
  );
}

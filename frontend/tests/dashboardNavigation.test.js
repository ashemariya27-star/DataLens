import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DASHBOARD_DESTINATIONS } from '../src/dashboardNavigation.js';

test('dashboard actions point to existing application routes', () => {
  assert.deepEqual(DASHBOARD_DESTINATIONS, {
    subjects: '/subjects',
    totalTasks: '/tasks',
    pendingTasks: '/tasks',
    completedTasks: '/tasks',
    tasks: '/tasks',
    planner: '/planner',
    upcomingActivity: '/tasks',
    recentUpload: '/analytics',
    analytics: '/analytics',
    reminders: '/reminders',
    settings: '/settings',
  });
  const appRoutes = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const destination of new Set(Object.values(DASHBOARD_DESTINATIONS))) {
    assert.ok(appRoutes.includes(`path="${destination}"`), `Missing application route: ${destination}`);
  }
});

test('pending and completed cards use the existing unfiltered task route', () => {
  assert.equal(DASHBOARD_DESTINATIONS.pendingTasks, DASHBOARD_DESTINATIONS.tasks);
  assert.equal(DASHBOARD_DESTINATIONS.completedTasks, DASHBOARD_DESTINATIONS.tasks);
  assert.equal(DASHBOARD_DESTINATIONS.pendingTasks.includes('?'), false);
  assert.equal(DASHBOARD_DESTINATIONS.completedTasks.includes('?'), false);
});

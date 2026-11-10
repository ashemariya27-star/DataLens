import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bindDashboardRefreshEvents,
  buildDashboardState,
  buildScheduleChartData,
  createDashboardRefreshController,
  getTaskDistribution,
} from '../src/dashboardSync.js';
import { applyReminderCompletion } from '../src/reminderCompletion.js';

class EventTargetStub {
  listeners = new Map();

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || new Set();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }

  removeEventListener(name, listener) {
    this.listeners.get(name)?.delete(listener);
  }

  dispatch(name) {
    this.listeners.get(name)?.forEach((listener) => listener());
  }
}

const fulfilled = (value) => ({ status: 'fulfilled', value });
const rejected = (reason) => ({ status: 'rejected', reason });
const emptyDashboardResults = () => [
  fulfilled({ total_subjects: 0, total_tasks: 0, pending_tasks: 0, completed_tasks: 0, weekly_activity: [] }),
  fulfilled([]), fulfilled([]), fulfilled([]), fulfilled([]), fulfilled([]),
];

test('refreshes on visible focus and visibility changes, midnight, and removes listeners', () => {
  const windowObject = new EventTargetStub();
  const documentObject = new EventTargetStub();
  documentObject.visibilityState = 'visible';
  const timers = new Map();
  let nextTimerId = 0;
  const cancelled = [];
  const refreshes = [];
  let now = new Date(2026, 10, 10, 23, 59, 59);
  const cleanup = bindDashboardRefreshEvents({
    windowObject,
    documentObject,
    onRefresh: () => refreshes.push('refresh'),
    now: () => now,
    schedule: (callback, delay) => {
      const id = ++nextTimerId;
      timers.set(id, { callback, delay });
      return id;
    },
    cancel: (id) => cancelled.push(id),
  });

  windowObject.dispatch('focus');
  documentObject.visibilityState = 'hidden';
  documentObject.dispatch('visibilitychange');
  documentObject.visibilityState = 'visible';
  documentObject.dispatch('visibilitychange');
  assert.equal(refreshes.length, 2);

  const midnightTimer = timers.get(1);
  assert.ok(midnightTimer.delay > 0);
  now = new Date(2026, 10, 11, 0, 0, 1);
  midnightTimer.callback();
  assert.equal(refreshes.length, 3);
  assert.equal(timers.size, 2);

  cleanup();
  windowObject.dispatch('focus');
  documentObject.dispatch('visibilitychange');
  assert.equal(refreshes.length, 3);
  assert.deepEqual(cancelled, [2]);
  assert.equal(windowObject.listeners.get('focus').size, 0);
  assert.equal(documentObject.listeners.get('visibilitychange').size, 0);
});

test('serializes refreshes and prevents an older response from being applied', async () => {
  const requests = [];
  const applied = [];
  let active = 0;
  let maximumActive = 0;
  const controller = createDashboardRefreshController(async (isCurrent) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    let resolveRequest;
    const result = new Promise((resolve) => { resolveRequest = resolve; });
    requests.push({ resolveRequest, isCurrent });
    const value = await result;
    active -= 1;
    if (isCurrent()) applied.push(value);
  });

  const first = controller.refresh();
  await Promise.resolve();
  controller.refresh();
  controller.refresh();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].isCurrent(), false);

  requests[0].resolveRequest('stale');
  await first;
  for (let attempt = 0; requests.length < 2 && attempt < 10; attempt += 1) await Promise.resolve();
  assert.equal(requests.length, 2);
  assert.equal(maximumActive, 1);
  requests[1].resolveRequest('fresh');
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(applied, ['fresh']);
  controller.dispose();
});

test('discarded refresh responses cannot apply after disposal', async () => {
  let resolveRequest;
  const applied = [];
  const controller = createDashboardRefreshController(async (isCurrent) => {
    await new Promise((resolve) => { resolveRequest = resolve; });
    if (isCurrent()) applied.push('late');
  });
  const request = controller.refresh();
  await Promise.resolve();
  controller.dispose();
  resolveRequest();
  await request;
  assert.deepEqual(applied, []);
});

test('Study Schedule uses the backend overview date keys without timezone parsing', () => {
  const overview = [
    { day: 'Tue', date: '2026-11-10', value: 2 },
    { day: 'Wed', date: '2026-11-11', value: 1 },
  ];
  const schedules = [
    { scheduled_date: '2026-11-10' },
    { scheduled_date: '2026-11-10' },
    { scheduled_date: '2026-11-11' },
    { scheduled_date: '2026-11-09' },
  ];
  assert.deepEqual(buildScheduleChartData(overview, schedules), [
    { day: 'Tue', date: '2026-11-10', count: 2 },
    { day: 'Wed', date: '2026-11-11', count: 1 },
  ]);
  assert.deepEqual(buildScheduleChartData([], schedules), []);
});

test('task distribution includes unknown statuses and allocates percentages across every task', () => {
  const tasks = [
    { status: 'Pending' }, { status: 'Pending' },
    { status: 'In Progress' }, { status: 'Completed' },
    { status: 'Archived' }, { status: null },
  ];
  const distribution = getTaskDistribution(tasks);
  assert.deepEqual(distribution.map(({ name, value }) => ({ name, value })), [
    { name: 'Pending', value: 2 },
    { name: 'In Progress', value: 1 },
    { name: 'Completed', value: 1 },
    { name: 'Other', value: 2 },
  ]);
  assert.equal(distribution.reduce((sum, item) => sum + item.value, 0), tasks.length);
  assert.equal(distribution.reduce((sum, item) => sum + item.percentage, 0), 100);
  assert.deepEqual(getTaskDistribution([]), []);
});

test('dashboard response mapping preserves empty, summary-error, and partial-error states', () => {
  const toMessage = (error, fallback) => error?.message || fallback;
  const empty = buildDashboardState(emptyDashboardResults(), toMessage);
  assert.equal(empty.error, '');
  assert.deepEqual(empty.sectionErrors, {});
  assert.deepEqual(empty.data.tasks, []);
  assert.deepEqual(getTaskDistribution(empty.data.tasks), []);
  assert.deepEqual(buildScheduleChartData(empty.data.summary.weekly_activity, empty.data.schedules), []);

  const failedSummary = buildDashboardState([
    rejected(new Error('summary unavailable')),
    ...emptyDashboardResults().slice(1),
  ], toMessage);
  assert.equal(failedSummary.error, 'summary unavailable');
  assert.equal(failedSummary.data, null);

  const partial = emptyDashboardResults();
  partial[1] = rejected(new Error('tasks unavailable'));
  partial[3] = rejected(new Error('schedules unavailable'));
  const partialState = buildDashboardState(partial, toMessage);
  assert.equal(partialState.error, '');
  assert.deepEqual(partialState.sectionErrors, {
    tasks: 'tasks unavailable',
    schedules: 'schedules unavailable',
  });
  assert.deepEqual(partialState.data.tasks, []);
  assert.deepEqual(partialState.data.schedules, []);
});

test('successful reminder completion updates only the matching card state', () => {
  const reminders = [
    { id: 3, title: 'Submit assignment', is_completed: false },
    { id: 4, title: 'Review notes', is_completed: false },
  ];
  const updated = applyReminderCompletion(reminders, 3, true);
  assert.deepEqual(updated, [
    { id: 3, title: 'Submit assignment', is_completed: true },
    { id: 4, title: 'Review notes', is_completed: false },
  ]);
  assert.equal(reminders[0].is_completed, false);
});

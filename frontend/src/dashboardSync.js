const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Other'];

export function buildScheduleChartData(weeklyActivity = [], schedules = []) {
  if (!Array.isArray(weeklyActivity) || !Array.isArray(schedules)) return [];
  const scheduledCounts = new Map();
  schedules.forEach((entry) => {
    const dateKey = entry.scheduled_date;
    if (typeof dateKey === 'string') {
      scheduledCounts.set(dateKey, (scheduledCounts.get(dateKey) || 0) + 1);
    }
  });

  return weeklyActivity.map((day) => ({
    day: day.day,
    date: day.date,
    count: scheduledCounts.get(day.date) || 0,
  }));
}

export function getTaskDistribution(tasks = []) {
  if (!Array.isArray(tasks)) return [];
  const counts = new Map(TASK_STATUSES.map((status) => [status, 0]));
  tasks.forEach((task) => {
    const status = TASK_STATUSES.includes(task.status) && task.status !== 'Other'
      ? task.status
      : 'Other';
    counts.set(status, counts.get(status) + 1);
  });

  const nonEmpty = TASK_STATUSES
    .map((name) => ({ name, value: counts.get(name) }))
    .filter((item) => item.value > 0);
  const total = tasks.length;
  if (!total) return [];

  const percentages = nonEmpty.map((item) => {
    const exact = (item.value / total) * 100;
    return { ...item, percentage: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let unassignedPercentage = 100 - percentages.reduce((sum, item) => sum + item.percentage, 0);
  percentages
    .slice()
    .sort((left, right) => right.remainder - left.remainder)
    .slice(0, unassignedPercentage)
    .forEach(({ name }) => {
      const item = percentages.find((entry) => entry.name === name);
      item.percentage += 1;
      unassignedPercentage -= 1;
    });

  return percentages.map(({ name, value, percentage }) => ({ name, value, percentage }));
}

export function buildDashboardState(results, getErrorMessage) {
  const [summary, tasks, subjects, schedules, materials, datasets] = results;
  if (summary.status === 'rejected') {
    return {
      data: null,
      sectionErrors: {},
      error: getErrorMessage(summary.reason, 'Dashboard data could not be loaded. Check that the backend is running and try again.'),
    };
  }

  const sections = { tasks, subjects, schedules, materials, datasets };
  const sectionErrors = Object.fromEntries(
    Object.entries(sections)
      .filter(([, result]) => result.status === 'rejected')
      .map(([key, result]) => [key, getErrorMessage(result.reason, `${key} could not be loaded.`)]),
  );
  return {
    error: '',
    sectionErrors,
    data: {
      summary: summary.value,
      tasks: tasks.status === 'fulfilled' ? tasks.value : [],
      subjects: subjects.status === 'fulfilled' ? subjects.value : [],
      schedules: schedules.status === 'fulfilled' ? schedules.value : [],
      materials: materials.status === 'fulfilled' ? materials.value : [],
      datasets: datasets.status === 'fulfilled' ? datasets.value : [],
    },
  };
}

export function createDashboardRefreshController(load) {
  let inFlight = null;
  let refreshQueued = false;
  let requestVersion = 0;
  let disposed = false;

  const refresh = () => {
    if (disposed) return Promise.resolve();
    if (inFlight) {
      refreshQueued = true;
      return inFlight;
    }

    const version = ++requestVersion;
    const isCurrent = () => !disposed && version === requestVersion && !refreshQueued;
    const request = Promise.resolve().then(() => load(isCurrent));
    inFlight = request.finally(() => {
      if (inFlight === wrappedRequest) inFlight = null;
      if (refreshQueued && !disposed) {
        refreshQueued = false;
        void refresh();
      }
    });
    const wrappedRequest = inFlight;
    return inFlight;
  };

  return {
    refresh,
    dispose() {
      disposed = true;
      requestVersion += 1;
      refreshQueued = false;
    },
  };
}

export function bindDashboardRefreshEvents({
  windowObject,
  documentObject,
  onRefresh,
  now = () => new Date(),
  schedule = windowObject.setTimeout.bind(windowObject),
  cancel = windowObject.clearTimeout.bind(windowObject),
}) {
  let midnightTimer;
  let active = true;

  const refreshWhenVisible = () => {
    if (documentObject.visibilityState !== 'hidden') onRefresh();
  };
  const scheduleMidnightRefresh = () => {
    if (!active) return;
    const current = now();
    const nextMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    midnightTimer = schedule(() => {
      if (!active) return;
      onRefresh();
      scheduleMidnightRefresh();
    }, Math.max(1, nextMidnight.getTime() - current.getTime() + 25));
  };

  windowObject.addEventListener('focus', refreshWhenVisible);
  documentObject.addEventListener('visibilitychange', refreshWhenVisible);
  scheduleMidnightRefresh();

  return () => {
    active = false;
    windowObject.removeEventListener('focus', refreshWhenVisible);
    documentObject.removeEventListener('visibilitychange', refreshWhenVisible);
    cancel(midnightTimer);
  };
}

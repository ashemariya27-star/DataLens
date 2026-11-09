export default function StatCard({ title, value, detail, tone = 'navy' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

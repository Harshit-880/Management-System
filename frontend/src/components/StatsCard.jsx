export default function StatsCard({ icon: Icon, label, value, sub, subHighlight }) {
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <span className="stats-label">{label}</span>
        <div className="stats-icon"><Icon size={16} /></div>
      </div>
      <div className="stats-value">{value}</div>
      {sub && (
        <div className="stats-sub">
          {subHighlight && <span className="stats-highlight">{subHighlight}</span>}
          {sub}
        </div>
      )}
    </div>
  );
}

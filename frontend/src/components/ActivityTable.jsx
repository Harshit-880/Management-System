const STATUS_CLASS = {
  Completed: 'badge-green',
  'In Progress': 'badge-yellow',
  Open: 'badge-blue',
};

export default function ActivityTable({ rows = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Group Activity &amp; Staffing Metrics</h3>
          <p className="card-sub">
            {rows.length > 0 ? `${rows.length} events` : 'No activity recorded yet'}
          </p>
        </div>
        <div className="card-actions">
          <button className="btn-ghost btn-sm">All Properties</button>
          <button className="btn-ghost btn-sm">Filter by Role</button>
          <button className="btn-primary btn-sm">Export Ledger</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>EVENT</th>
            <th>PROPERTY</th>
            <th>ROLE</th>
            <th>STATUS</th>
            <th>DATE</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-state">No activity data available</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                <td>{row.event}</td>
                <td>{row.property}</td>
                <td>{row.role}</td>
                <td><span className={`badge ${STATUS_CLASS[row.status] ?? 'badge-blue'}`}>{row.status}</span></td>
                <td className="text-muted">{row.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

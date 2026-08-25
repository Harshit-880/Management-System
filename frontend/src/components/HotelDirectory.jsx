const INITIALS_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed'];

export default function HotelDirectory({ hotels = [], onEdit, onManageStaff }) {

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Hotel Management Directory</h3>
        <div className="card-actions">
          <button className="btn-ghost btn-sm">Filter</button>
          <button className="btn-primary btn-sm">Export</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>HOTEL NAME</th>
            <th>CITY / COUNTRY</th>
            <th>PHONE</th>
            <th>CURRENCY</th>
            <th>STATUS</th>
            <th>SYSTEM ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {hotels.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state">No hotels found. Add your first property.</td>
            </tr>
          ) : (
            hotels.map((h, i) => (
              <tr key={h.hotelId} style={h.isActive === false ? { opacity: .65 } : undefined}>
                <td>
                  <div className="hotel-name-cell">
                    <div className="hotel-thumb" style={{ background: INITIALS_COLORS[i % INITIALS_COLORS.length] }}>
                      {h.hotelName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-600">{h.hotelName}</div>
                      <div className="text-muted text-sm">{h.address}</div>
                    </div>
                  </div>
                </td>
                <td>{[h.city, h.country].filter(Boolean).join(', ') || '—'}</td>
                <td>{h.phone || '—'}</td>
                <td><span className="badge badge-blue">{h.currency}</span></td>
                <td>
                  <span className={`badge ${h.isActive === false ? 'badge-yellow' : 'badge-green'}`}>
                    {h.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn-link" onClick={() => onManageStaff?.(h)}>Manage Staff</button>
                    <button className="btn-link" onClick={() => onEdit?.(h)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


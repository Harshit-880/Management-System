import { Bell, Search, Plus } from 'lucide-react';

export default function TopBar({ title, subtitle, actionLabel, onAction, showSearch = true }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && (
          <span className="topbar-status">
            <span className="status-dot" /> {subtitle}
          </span>
        )}
      </div>
      <div className="topbar-right">
        {showSearch && (
          <div className="search-box">
            <Search size={15} />
            <input type="text" placeholder="Search properties…" />
          </div>
        )}
        <button className="btn-icon-notif">
          <Bell size={18} />
        </button>
        {actionLabel && (
          <button className="btn-primary" onClick={onAction}>
            <Plus size={16} /> {actionLabel}
          </button>
        )}
      </div>
    </header>
  );
}

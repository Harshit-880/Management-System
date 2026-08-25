import { useState } from 'react';
import TopBar from './TopBar';
import HousekeepingDashboard from './Housekeeping/HousekeepingDashboard';
import CleaningTasks from './Housekeeping/CleaningTasks';
import ServiceRequests from './ServiceRequests/ServiceRequests';

const TABS = ['Dashboard', 'Cleaning Tasks', 'Guest Service Requests'];

// Manager's combined Housekeeping oversight page — reuses the same
// HousekeepingDashboard, CleaningTasks board (Housekeeping role) and
// ServiceRequests screen (Receptionist/shared role) so behavior stays
// identical across roles; only the surrounding tab chrome is Manager-specific.
//
// "Guest Service Requests" excludes the Housekeeping department, since those
// cleaning tasks are already fully managed in the "Cleaning Tasks" board —
// showing them in both places would mean the same task could be actioned
// from two different UIs.
export default function ManagerHousekeeping() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <>
      <TopBar title="Housekeeping" subtitle="Cleaning operations & guest service requests" />

      <div className="page-content" style={{ paddingBottom: 0 }}>
        <div className="mgr-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`mgr-tab${activeTab === t ? ' active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Dashboard' && <HousekeepingDashboard hideTopBar />}
      {activeTab === 'Cleaning Tasks' && <CleaningTasks hideTopBar />}
      {activeTab === 'Guest Service Requests' && <ServiceRequests hideTopBar excludeDepartments={['Housekeeping']} />}
    </>
  );
}

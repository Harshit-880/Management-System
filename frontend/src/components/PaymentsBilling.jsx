import { useState } from 'react';
import TopBar from './TopBar';
import Payments from './Payments/Payments';
import Billing from './Billing/Billing';

const TABS = ['Payments', 'Billing'];

// Admin's combined Payments & Billing page — reuses the same Payments
// (guest payments, refunds, outstanding balances, filter by hotel) and
// Billing (room/service charges, invoices, checkout settlement) screens
// used elsewhere, so behavior stays identical across roles; only the
// surrounding tab chrome is Admin-specific.
export default function PaymentsBilling() {
  const [activeTab, setActiveTab] = useState('Payments');

  return (
    <>
      <TopBar title="Payments & Billing" subtitle="Financial overview across all hotels" />

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

      {activeTab === 'Payments' && <Payments hideTopBar />}
      {activeTab === 'Billing' && <Billing hideTopBar />}
    </>
  );
}

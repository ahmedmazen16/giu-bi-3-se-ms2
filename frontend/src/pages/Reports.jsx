// src/pages/Reports.jsx — organizer post-event report (costs, attendance, outcomes).
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Reports() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/events').then((evs) => { setEvents(evs); if (evs[0]) setEventId(String(evs[0].id)); }).catch((e) => toast.error(e.message)); }, []);
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.get(`/reports/event/${eventId}`).then(setReport).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [eventId]);

  function exportReport() {
    if (!report) return;
    const text =
`PopEyez — Event Report
========================
Event: ${report.event.name}
Date:  ${report.event.start_date || '—'}

COSTS
  Planned budget : ${report.costs.planned} EGP
  Actual spend   : ${report.costs.actual} EGP
  Variance       : ${report.costs.variance} EGP
  Vendor invoices: ${report.costs.vendor_invoices} EGP

ATTENDANCE
  Invited        : ${report.attendance.invited}
  Attending      : ${report.attendance.attending}
  Checked in     : ${report.attendance.checked_in}
  Attendance rate: ${report.attendance.attendance_rate}%

FEEDBACK
  Responses      : ${report.feedback.responses}
  Avg overall    : ${report.feedback.avg_overall} / 5
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${report.event.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="topbar"><h1>Reports</h1><p>Post-event summary of costs, attendance and outcomes.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>Event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <button className="btn ghost" onClick={exportReport} disabled={!report}>Export report</button>
        </div>

        {loading || !report ? <Spinner label="Building report…" /> : (
          <>
            <h3 style={{ margin: '6px 0 16px' }}>{report.event.name}</h3>
            <div className="grid cols-3">
              <div className="card">
                <h3>Costs</h3>
                <table style={{ marginTop: 10 }}>
                  <tbody>
                    <tr><td>Planned</td><td style={{ textAlign: 'right' }}><b>{report.costs.planned.toLocaleString()}</b></td></tr>
                    <tr><td>Actual</td><td style={{ textAlign: 'right' }}><b>{report.costs.actual.toLocaleString()}</b></td></tr>
                    <tr><td>Variance</td><td style={{ textAlign: 'right', color: report.costs.variance >= 0 ? 'var(--good)' : 'var(--bad)' }}><b>{report.costs.variance.toLocaleString()}</b></td></tr>
                    <tr><td>Vendor invoices</td><td style={{ textAlign: 'right' }}>{report.costs.vendor_invoices.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h3>Attendance</h3>
                <table style={{ marginTop: 10 }}>
                  <tbody>
                    <tr><td>Invited</td><td style={{ textAlign: 'right' }}><b>{report.attendance.invited}</b></td></tr>
                    <tr><td>Attending</td><td style={{ textAlign: 'right' }}><b>{report.attendance.attending}</b></td></tr>
                    <tr><td>Checked in</td><td style={{ textAlign: 'right' }}><b>{report.attendance.checked_in}</b></td></tr>
                    <tr><td>Attendance rate</td><td style={{ textAlign: 'right' }}>{report.attendance.attendance_rate}%</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h3>Feedback</h3>
                <table style={{ marginTop: 10 }}>
                  <tbody>
                    <tr><td>Responses</td><td style={{ textAlign: 'right' }}><b>{report.feedback.responses}</b></td></tr>
                    <tr><td>Avg overall</td><td style={{ textAlign: 'right' }}><b>{report.feedback.avg_overall} / 5</b></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

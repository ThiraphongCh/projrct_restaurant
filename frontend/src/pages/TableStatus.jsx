import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { RESTAURANT, STICKER_CSS, buildStickerHtml } from '../constants';

const statusIcons = {
  pending: 'bi-hourglass-split',
  confirmed: 'bi-check2-circle',
  preparing: 'bi-fire',
  ready: 'bi-bell',
  completed: 'bi-check2-all',
  cancelled: 'bi-x-octagon',
};

const badgeTone = {
  pending: 'bg-warning text-dark',
  confirmed: 'bg-info text-dark',
  preparing: 'bg-primary text-white',
  ready: 'bg-success text-white',
};

const MAX_TABLES = 50;

export default function AdminTables() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [tables, setTables] = useState([]);
  const [totalTables, setTotalTables] = useState(12);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [confirmTable, setConfirmTable] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Table count management
  const [draftCount, setDraftCount] = useState(12);
  const [confirmShrink, setConfirmShrink] = useState(null);
  const [savingCount, setSavingCount] = useState(false);
  const [actionError, setActionError] = useState('');

  // QR printing
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('qrBaseUrl') || window.location.origin);
  const [selected, setSelected] = useState(new Set());
  const [qrCodes, setQrCodes] = useState({});
  const [generating, setGenerating] = useState(false);

  const fetchTables = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/orders/tables/status');
      setTables(response.data.tables);
      const total = response.data.totalTables;
      setTotalTables(total);
      setDraftCount((prev) => (prev < 1 || prev > MAX_TABLES ? total : prev));
      setLastUpdated(new Date());
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Prune QR selections when tables are removed so invalid tables can't be selected
  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(Array.from({ length: totalTables }, (_, i) => String(i + 1)));
      const next = new Set(Array.from(prev).filter((n) => valid.has(n)));
      if (next.size !== prev.size) return next;
      return prev;
    });
  }, [totalTables]);

  // Generate QR codes only for selected tables, as they are chosen
  useEffect(() => {
    localStorage.setItem('qrBaseUrl', baseUrl);
    const numbers = Array.from(selected);
    if (numbers.length === 0) {
      setGenerating(false);
      return;
    }
    const cleanBase = baseUrl.replace(/\/+$/, '');
    let cancelled = false;
    setGenerating(true);
    (async () => {
      const codes = {};
      for (const n of numbers) {
        try {
          codes[n] = await QRCode.toDataURL(`${cleanBase}/?table=${n}`, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 260,
          });
        } catch (err) {
          console.error('QR generate failed for table', n, err);
        }
      }
      if (!cancelled) {
        setQrCodes((prev) => ({ ...prev, ...codes }));
        setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, baseUrl]);

  const handleCancel = async (table) => {
    try {
      setCancelling(true);
      await api.put(`/orders/admin/${table.orderId}/status`, { status: 'cancelled' });
      setConfirmTable(null);
      setActionError('');
      await fetchTables();
    } catch (err) {
      alert(lang === 'th' ? 'ยกเลิกออเดอร์ไม่สำเร็จ' : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const requestSaveCount = () => {
    const next = parseInt(draftCount, 10);
    if (Number.isNaN(next) || next < 1 || next > MAX_TABLES) {
      setActionError(lang === 'th' ? `จำนวนโต๊ะต้องอยู่ระหว่าง 1-${MAX_TABLES}` : `Table count must be between 1-${MAX_TABLES}`);
      return;
    }
    if (next === totalTables) return;
    if (next < totalTables) {
      const willRemove = tables.filter((tb) => tb.busy && Number(tb.tableNumber) > next);
      if (willRemove.length > 0) {
        const nums = willRemove.map((tb) => tb.tableNumber).join(', ');
        setActionError(
          lang === 'th'
            ? `ไม่สามารถลดจำนวนโต๊ะได้ เพราะโต๊ะ ${nums} ยังมีออเดอร์ที่ยังไม่เสร็จ`
            : `Cannot remove table(s) ${nums}: they still have active orders`
        );
        return;
      }
      setConfirmShrink(next);
      return;
    }
    saveCount(next);
  };

  const saveCount = async (next) => {
    try {
      setSavingCount(true);
      setActionError('');
      await api.put('/orders/admin/tables', { totalTables: next });
      setConfirmShrink(null);
      await fetchTables();
    } catch (err) {
      setActionError(err.response?.data?.message || (lang === 'th' ? 'ปรับจำนวนโต๊ะไม่สำเร็จ' : 'Failed to update table count'));
      setConfirmShrink(null);
    } finally {
      setSavingCount(false);
    }
  };

  const busyCount = tables.filter((t) => t.busy).length;
  const freeCount = tables.length - busyCount;

  const statusLabel = (key) => t(`status${key.charAt(0).toUpperCase() + key.slice(1)}`);
  const sinceText = (dateStr) => {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return lang === 'th' ? 'เมื่อสักครู่' : 'just now';
    if (m < 60) return `${m} ${lang === 'th' ? 'นาที' : 'min'}`;
    const h = Math.floor(m / 60);
    return `${h} ${lang === 'th' ? 'ชม.' : 'h'}`;
  };

  const toggleTable = (n) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else {
        next.add(n);
      }
      return next;
    });
  };

  const selectAllQr = () => {
    setSelected(new Set(Array.from({ length: totalTables }, (_, i) => String(i + 1))));
  };

  const clearQr = () => setSelected(new Set());

  const busySet = new Set(tables.filter((tb) => tb.busy).map((tb) => String(tb.tableNumber)));

  const stickerProps = (n, qrDataUrl) => ({
    tableNumber: n,
    qrDataUrl,
    name: lang === 'th' ? RESTAURANT.nameTh : RESTAURANT.nameEn,
    tagline: lang === 'th' ? RESTAURANT.taglineTh : RESTAURANT.taglineEn,
    welcome: t('qrWelcome'),
    scanCta: t('qrScanCta'),
    scanCtaSub: t('qrScanCtaSub'),
    steps: [t('qrStepScan'), t('qrStepMenu'), t('qrStepOrder')],
    hours: t('qrHours'),
    url: `${baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}?table=${n}`,
  });

  const openPrintWindow = () => {
    if (selected.size === 0) {
      alert(lang === 'th' ? 'กรุณาเลือกโต๊ะอย่างน้อย 1 โต๊ะ' : 'Please select at least one table');
      return;
    }
    if (generating || Array.from(selected).some((n) => !qrCodes[n])) {
      alert(lang === 'th' ? 'QR code ยังสร้างไม่เสร็จ กรุณารอสักครู่' : 'QR codes are still being generated, please wait');
      return;
    }
    const cards = Array.from(selected)
      .sort((a, b) => a - b)
      .map((n) => buildStickerHtml(stickerProps(n, qrCodes[n])))
      .join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>${t('qrPageTitle')}</title>
<style>${STICKER_CSS}</style>
</head>
<body>
  <div class="flex">${cards}</div>
  <script>
    window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 300); };
  <\/script>
</body>
</html>`);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-1">
            <i className="bi bi-grid-3x3-gap text-primary me-2"></i>
            {t('manageTables')}
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success rounded-pill me-2">
              <i className="bi bi-check-circle me-1"></i>
              {freeCount} {t('freeTablesCount').toLowerCase()}
            </span>
            <span className="badge bg-danger-subtle text-danger rounded-pill">
              <i className="bi bi-x-circle me-1"></i>
              {busyCount} {t('occupiedTablesCount').toLowerCase()}
            </span>
          </div>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchTables} disabled={refreshing}>
          <i className={`bi ${refreshing ? 'bi-hourglass-split' : 'bi-arrow-clockwise'} me-1`}></i>
          {t('refreshTableStatus')}
        </button>
      </div>

      {/* Hint banner */}
      <div className="alert alert-primary d-flex align-items-center gap-2 py-2 mb-3" role="alert">
        <i className="bi bi-info-circle-fill"></i>
        <span className="small">{t('tableStatusHint')}</span>
      </div>

      {actionError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span className="small">{actionError}</span>
        </div>
      )}

      {/* Table count management */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className="mb-1">
                <i className="bi bi-plus-slash-minus me-1 text-primary"></i>
                {t('tableCountTitle')}
              </h5>
              <div className="text-muted small">{t('tableCountHint')}</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small text-nowrap">{t('tablesTotal')}:</span>
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: 80 }}
                min={1}
                max={MAX_TABLES}
                value={draftCount}
                onChange={(e) => setDraftCount(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" onClick={requestSaveCount} disabled={savingCount}>
                {savingCount ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-check-lg me-1"></i>
                )}
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3 p-3">
              <div className="bg-primary bg-gradient text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                <i className="bi bi-grid-3x3-gap"></i>
              </div>
              <div>
                <div className="text-muted small text-nowrap">{t('tablesTotal')}</div>
                <div className="fw-bold fs-5">{totalTables} {t('table')}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3 p-3">
              <div className="bg-success bg-gradient text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                <i className="bi bi-unlock-fill"></i>
              </div>
              <div>
                <div className="text-muted small text-nowrap">{t('freeTablesCount').toLowerCase()}</div>
                <div className="fw-bold fs-5 text-success">{freeCount} {t('table')}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3 p-3">
              <div className="bg-danger bg-gradient text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                <i className="bi bi-lock-fill"></i>
              </div>
              <div>
                <div className="text-muted small text-nowrap">{t('occupiedTablesCount').toLowerCase()}</div>
                <div className="fw-bold fs-5 text-danger">{busyCount} {t('table')}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3 p-3">
              <div className="bg-secondary bg-gradient text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                <i className="bi bi-clock"></i>
              </div>
              <div>
                <div className="text-muted small text-nowrap">{t('updatedAt')}</div>
                <div className="fw-bold fs-6">{lastUpdated ? lastUpdated.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US') : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3">
        {tables.map((table) => {
          const isBusy = table.busy;
          return (
            <div key={table.tableNumber} className="col">
              <div
                className={`card h-100 border-2 shadow-sm ${isBusy ? 'border-danger bg-danger-subtle' : 'border-success bg-success-subtle'}`}
              >
                <div className="card-body p-3 d-flex flex-column text-center">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <i className={`bi fs-4 ${isBusy ? 'text-danger bi-person-fill' : 'text-success bi-people'}`}></i>
                  </div>
                  <h4 className="fw-bold mb-1">{t('table')} {table.tableNumber}</h4>
                  {isBusy ? (
                    <div className="small flex-grow-1">
                      <span className="badge bg-danger mb-1">
                        <i className="bi bi-lock-fill me-1"></i>{t('tableOccupied')}
                      </span>
                      <div className="text-danger fw-semibold text-truncate" title={table.customerName}>{table.customerName}</div>
                      <div className="text-muted text-truncate">#{table.orderNumber}</div>
                      <div className="mt-1">
                        <span className={`badge ${badgeTone[table.status] || 'bg-white text-dark border border-dark'}`}>
                          <i className={`bi ${statusIcons[table.status] || 'bi-circle'} me-1`}></i>
                          {statusLabel(table.status)}
                        </span>
                      </div>
                      <div className="text-muted mt-1">
                        <i className="bi bi-clock me-1"></i>
                        {t('since')} {sinceText(table.since)}
                      </div>
                    </div>
                  ) : (
                    <div className="small flex-grow-1">
                      <span className="badge bg-success">
                        <i className="bi bi-unlock-fill me-1"></i>{t('tableAvailable')}
                      </span>
                    </div>
                  )}
                  {isBusy && (
                    <>
                      <hr className="my-2" />
                      <div className="d-flex flex-column gap-1">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => navigate(`/admin/payment/${table.orderId}`)}
                        >
                          <i className="bi bi-cash-coin me-1"></i>{t('checkBill')}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmTable(table)}
                        >
                          <i className="bi bi-x-circle me-1"></i>{t('cancelOrder')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR printing section */}
      <div className="card shadow-sm mt-4">
        <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="mb-0">
            <i className="bi bi-qr-code me-2 text-primary"></i>
            {t('qrPageTitle')}
          </h5>
          <button className="btn btn-sm btn-primary" onClick={openPrintWindow}>
            <i className="bi bi-printer me-1"></i>
            {t('printAllQR')}
            {selected.size > 0 && <span className="badge bg-white text-primary ms-2">{selected.size}</span>}
          </button>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-7">
              <label className="form-label fw-semibold">
                <i className="bi bi-geo-alt me-1"></i>
                {t('qrSelectTitle')}
              </label>
              <div className="d-flex flex-wrap gap-2">
                {Array.from({ length: totalTables }, (_, idx) => String(idx + 1)).map((n) => {
                  const isSel = selected.has(n);
                  const isBusy = busySet.has(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`btn btn-sm d-flex flex-column align-items-center border-2 ${
                        isSel
                          ? 'btn-primary text-white border-primary'
                          : isBusy
                            ? 'btn-outline-danger text-danger'
                            : 'btn-outline-success text-success'
                      }`}
                      onClick={() => toggleTable(n)}
                    >
                      <span className="fw-bold fs-6">{n}</span>
                      <small className={isSel ? 'opacity-75' : 'text-muted'}>
                        {isBusy ? t('tableOccupied') : t('tableFree')}
                      </small>
                    </button>
                  );
                })}
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button className="btn btn-sm btn-outline-primary" onClick={selectAllQr}>
                  <i className="bi bi-check-all me-1"></i>
                  {t('selectAllQr')}
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={clearQr}>
                  <i className="bi bi-x-lg me-1"></i>
                  {t('clearSelectionQr')}
                </button>
              </div>
              <div className="form-text mt-2">
                <i className="bi bi-info-circle me-1"></i>
                {t('qrSelectHint')}
              </div>
            </div>
            <div className="col-lg-5">
              <label className="form-label fw-semibold">
                <i className="bi bi-link-45deg me-1"></i>
                {t('qrBaseUrl')}
              </label>
              <div className="input-group">
                <input
                  className="form-control"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={window.location.origin}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setBaseUrl(window.location.origin)}
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
              <div className="form-text mt-1">
                <i className="bi bi-info-circle me-1"></i>
                {t('qrBaseHint')}
              </div>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="qr-print-area d-flex flex-wrap justify-content-center mt-4 pt-3 border-top">
              {Array.from(selected).sort((a, b) => a - b).map((n) => {
                const p = stickerProps(n, qrCodes[n]);
                return (
                  <div className="qr-card" key={n}>
                    <div className="qr-card-head">
                      <div className="qr-card-head-name">{p.name}</div>
                      <div className="qr-card-head-tagline">{p.tagline}</div>
                    </div>
                    <div className="qr-card-welcome">{p.welcome}</div>
                    <div className="qr-card-table">{n}</div>
                    <div className="qr-card-scan">{p.scanCta}</div>
                    <div className="qr-card-scan-sub">{p.scanCtaSub}</div>
                    <div className="qr-card-qr">
                      {generating || !qrCodes[n] ? (
                        <div className="d-flex align-items-center justify-content-center" style={{ width: 139, height: 139 }}>
                          <span className="spinner-border text-primary" role="status"></span>
                        </div>
                      ) : (
                        <img src={qrCodes[n]} alt={`Table ${n} QR`} />
                      )}
                    </div>
                    <div className="qr-card-steps">
                      <div className="qr-card-step">
                        <span className="qr-card-step-num">1</span>
                        <span className="qr-card-step-label">{p.steps[0]}</span>
                      </div>
                      <span className="qr-card-step-arrow">&#8250;</span>
                      <div className="qr-card-step">
                        <span className="qr-card-step-num">2</span>
                        <span className="qr-card-step-label">{p.steps[1]}</span>
                      </div>
                      <span className="qr-card-step-arrow">&#8250;</span>
                      <div className="qr-card-step">
                        <span className="qr-card-step-num">3</span>
                        <span className="qr-card-step-label">{p.steps[2]}</span>
                      </div>
                    </div>
                    <div className="qr-card-hours">{p.hours}</div>
                    <div className="qr-card-url">{p.url}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {confirmTable && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                  {t('cancelOrder')}
                </h5>
                <button className="btn-close" onClick={() => setConfirmTable(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {lang === 'th'
                    ? `ต้องการยกเลิกออเดอร์ #${confirmTable.orderNumber} ที่โต๊ะ ${confirmTable.tableNumber} หรือไม่? โต๊ะจะว่างทันที`
                    : `Cancel order #${confirmTable.orderNumber} at table ${confirmTable.tableNumber}? The table will free up.`}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmTable(null)}>
                  {t('cancel')}
                </button>
                <button className="btn btn-danger" onClick={() => handleCancel(confirmTable)} disabled={cancelling}>
                  {cancelling ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-x-circle me-1"></i>
                  )}
                  {t('deleteBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shrink table count confirmation modal */}
      {confirmShrink !== null && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                  {t('confirmRemoveTitle')}
                </h5>
                <button className="btn-close" onClick={() => setConfirmShrink(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {lang === 'th'
                    ? `คุณต้องการลดจำนวนโต๊ะจาก ${totalTables} เป็น ${confirmShrink} ใช่หรือไม่? โต๊ะ ${confirmShrink + 1}-${totalTables} จะไม่สามารถสั่งอาหารได้อีก`
                    : `Reduce table count from ${totalTables} to ${confirmShrink}? Tables ${confirmShrink + 1}-${totalTables} will no longer accept orders.`}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmShrink(null)}>
                  {t('cancel')}
                </button>
                <button className="btn btn-danger" onClick={() => saveCount(confirmShrink)} disabled={savingCount}>
                  {savingCount ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-check-lg me-1"></i>
                  )}
                  {t('deleteBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
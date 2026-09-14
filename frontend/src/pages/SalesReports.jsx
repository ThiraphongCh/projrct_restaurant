import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const PERIODS = ['daily', 'monthly', 'yearly'];

const PERIOD_ICONS = {
  daily: 'bi-calendar-day',
  monthly: 'bi-calendar-month',
  yearly: 'bi-calendar2-range',
};

const CATEGORY_COLORS = {
  appetizer: '#fd7e14',
  main: '#0d6efd',
  dessert: '#d63384',
  drink: '#0dcaf0',
  side: '#6f42c1',
  other: '#6c757d',
};

export default function SalesReports() {
  const navigate = useNavigate();
  const { t, lang, getName, categoryLabel, formatPrice } = useLanguage();
  const [period, setPeriod] = useState('daily');
  const [sales, setSales] = useState(null);
  const [popular, setPopular] = useState([]);
  const [unsold, setUnsold] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllUnsold, setShowAllUnsold] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [salesRes, popularRes, unsoldRes] = await Promise.all([
        api.get(`/admin/reports/sales?period=${period}`),
        api.get('/admin/reports/popular'),
        api.get('/admin/reports/unsold'),
      ]);
      setSales(salesRes.data);
      setPopular(popularRes.data);
      setUnsold(unsoldRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      } else {
        setError(t('menuError'));
      }
    } finally {
      setLoading(false);
    }
  }, [period, navigate, t]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, navigate]);

  const periodLabel = (value) => {
    const locale = lang === 'th' ? 'th-TH' : 'en-US';
    if (period === 'daily') {
      return new Date(value).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        weekday: 'short',
      });
    }
    if (period === 'monthly') {
      return new Date(`${value}-01`).toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric',
      });
    }
    return value;
  };

  const maxRevenue = sales?.results.length ? Math.max(...sales.results.map((r) => r.revenue), 1) : 1;
  const peak = sales?.results.length
    ? sales.results.reduce((best, r) => (r.revenue > best.revenue ? r : best), sales.results[0])
    : null;

  // % change between the two most recent periods
  const trend = useMemo(() => {
    if (!sales || sales.results.length < 2) return null;
    const [prev, latest] = sales.results.slice(-2);
    if (!prev.revenue) return null;
    return Math.round(((latest.revenue - prev.revenue) / prev.revenue) * 100);
  }, [sales]);

  const maxSold = popular.length ? Math.max(...popular.map((p) => p.soldQty), 1) : 1;
  const categoryBreakdown = sales?.categoryBreakdown || [];
  const maxCategoryRevenue = categoryBreakdown.length
    ? Math.max(...categoryBreakdown.map((c) => c.revenue), 1)
    : 1;
  const totalCategoryRevenue = categoryBreakdown.reduce((sum, c) => sum + c.revenue, 0);

  const unsoldVisible = showAllUnsold ? unsold : unsold.slice(0, 10);

  if (loading && !sales) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="mb-1">
            <i className="bi bi-bar-chart-line me-2 text-primary"></i>
            {t('salesReportTitle')}
          </h4>
          {sales?.results.length > 0 && (
            <div className="text-muted small">
              <i className="bi bi-calendar3 me-1"></i>
              {periodLabel(sales.results[0].period)} – {periodLabel(sales.results[sales.results.length - 1].period)}
            </div>
          )}
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/admin')}>
          <i className="bi bi-arrow-left me-1"></i>
          {t('backToDashboard')}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Period selector */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div className="btn-group period-group" role="group" aria-label="period">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPeriod(p)}
            >
              <i className={`bi ${PERIOD_ICONS[p]} me-1`}></i>
              {t(`period${cap(p)}`)}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchData} title="Refresh" disabled={loading}>
          <i className={`bi ${loading ? 'bi-hourglass-split' : 'bi-arrow-clockwise'}`}></i>
        </button>
      </div>

      {sales && (
        <>
          {/* Today strip (daily focus) */}
          {period === 'daily' && (
            <div className="alert alert-light border rounded-3 d-flex flex-wrap align-items-center gap-3 mb-4 py-2">
              <span className="fw-semibold">
                <i className="bi bi-activity text-danger me-1"></i>
                {t('todayStats')}
              </span>
              <span>
                <i className="bi bi-cash-coin text-success me-1"></i>
                {formatPrice(sales.today?.revenue || 0)}
              </span>
              <span>
                <i className="bi bi-receipt text-primary me-1"></i>
                {sales.today?.orders || 0} {t('totalOrdersLabel')}
              </span>
            </div>
          )}

          {/* Summary cards */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="rounded-3 bg-primary bg-gradient text-white d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>
                    <i className="bi bi-cash-stack"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted small text-nowrap">{t('totalRevenue')}</div>
                    <div className="fw-bold fs-5 text-nowrap">{formatPrice(sales.summary.totalRevenue)}</div>
                    {trend !== null && (
                      <span className={`small fw-semibold ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                        <i className={`bi ${trend >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}></i>
                        {Math.abs(trend)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="rounded-3 bg-info bg-gradient text-white d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>
                    <i className="bi bi-receipt-cutoff"></i>
                  </div>
                  <div>
                    <div className="text-muted small text-nowrap">{t('totalOrdersLabel')}</div>
                    <div className="fw-bold fs-5">{sales.summary.totalOrders}</div>
                    <div className="small text-muted">{sales.summary.periods} {t(`period${cap(period)}`).toLowerCase()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="rounded-3 bg-success bg-gradient text-white d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>
                    <i className="bi bi-graph-up-arrow"></i>
                  </div>
                  <div>
                    <div className="text-muted small text-nowrap">{t('avgOrderValue')}</div>
                    <div className="fw-bold fs-5">{formatPrice(sales.summary.avgOrderValue)}</div>
                    <div className="small text-muted">/ {t('orders').toLowerCase()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="rounded-3 bg-warning bg-gradient text-white d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>
                    <i className="bi bi-trophy-fill"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted small text-nowrap">{t('peakPeriod')}</div>
                    {peak ? (
                      <>
                        <div className="fw-bold fs-6">{peak ? formatPrice(peak.revenue) : '—'}</div>
                        <div className="small text-muted text-nowrap text-truncate">
                          {periodLabel(peak.period)} · {peak.orders} {t('orders')}
                        </div>
                      </>
                    ) : (
                      <div className="fw-bold fs-6">—</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart + category breakdown */}
          <div className="row g-4 mb-4">
            <div className="col-lg-7">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-graph-up text-primary me-2"></i>
                    {t('salesByPeriod')}
                  </h6>
                  <span className="badge bg-primary-subtle text-primary">
                    {sales.summary.periods} {t(`period${cap(period)}`).toLowerCase()}
                  </span>
                </div>
                <div className="card-body">
                  {sales.results.length === 0 ? (
                    <p className="text-muted text-center mb-0 py-4">{t('noSalesData')}</p>
                  ) : (
                    sales.results.map((r, i) => {
                      const isPeak = r.period === peak.period;
                      const width = r.revenue ? Math.max((r.revenue / maxRevenue) * 100, 2) : 0;
                      return (
                        <div key={i} className="mb-3" title={`${formatPrice(r.revenue)} · ${r.orders} ${t('orders')}`}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-muted">
                              {isPeak && <i className="bi bi-trophy-fill text-warning me-1"></i>}
                              {periodLabel(r.period)}
                              <span className="text-muted ms-2">
                                ({r.orders} {t('orders')})
                              </span>
                            </span>
                            <span className="fw-semibold">{formatPrice(r.revenue)}</span>
                          </div>
                          <div className="progress rounded-pill" style={{ height: '10px', backgroundColor: '#e9ecef' }}>
                            <div
                              className={`progress-bar rounded-pill ${isPeak ? 'bg-warning' : 'bg-primary bg-gradient'}`}
                              style={{ width: `${width}%`, transition: 'width .6s ease' }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-pie-chart-fill text-success me-2"></i>
                    {t('categoryBreakdown')}
                  </h6>
                  <span className="badge bg-success-subtle text-success">{formatPrice(totalCategoryRevenue)}</span>
                </div>
                <div className="card-body">
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-muted text-center mb-0 py-4">{t('noSalesData')}</p>
                  ) : (
                    categoryBreakdown.map((c) => {
                      const color = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other;
                      const share = totalCategoryRevenue ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0;
                      return (
                        <div key={c.category} className="mb-3" title={formatPrice(c.revenue)}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-muted">{categoryLabel(c.category)}</span>
                            <span className="text-muted">
                              {c.qty} <span className="ms-1">{t('quantity')}</span>
                              <span className="fw-semibold text-dark ms-2">{formatPrice(c.revenue)}</span>
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1 rounded-pill" style={{ height: '10px', backgroundColor: '#e9ecef' }}>
                              <div
                                className="progress-bar rounded-pill"
                                style={{ width: `${Math.max((c.revenue / maxCategoryRevenue) * 100, 4)}%`, backgroundColor: color, transition: 'width .6s ease' }}
                              />
                            </div>
                            <span className="small fw-semibold text-muted" style={{ minWidth: '2.5rem', textAlign: 'right' }}>
                              {share}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top sellers + unsold */}
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white">
                  <h6 className="mb-0">
                    <i className="bi bi-fire text-danger me-2"></i>
                    {t('topSellingItems')}
                  </h6>
                </div>
                <div className="card-body p-0">
                  {popular.length === 0 ? (
                    <div className="text-center py-4 text-muted">{t('noSalesData')}</div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {popular.map((item, i) => {
                        const soldBar = (item.soldQty / maxSold) * 100;
                        return (
                          <div key={item._id} className="list-group-item d-flex align-items-center gap-3 py-2">
                            <div className="text-center" style={{ width: 28 }}>
                              {i === 0 ? (
                                <i className="bi bi-trophy-fill text-warning fs-5"></i>
                              ) : i === 1 ? (
                                <i className="bi bi-award-fill text-secondary fs-5"></i>
                              ) : i === 2 ? (
                                <i className="bi bi-award-fill text-danger fs-5"></i>
                              ) : (
                                <span className="text-muted small">{i + 1}</span>
                              )}
                            </div>
                            <img
                              src={item.imageUrl}
                              alt={getName(item)}
                              loading="lazy"
                              className="rounded-2 border"
                              style={{ width: 46, height: 46, objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <div className="flex-grow-1 min-w-0">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-semibold text-truncate">{getName(item)}</span>
                                <span className="fw-bold small text-nowrap ms-2">{formatPrice(item.soldRevenue)}</span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1 rounded-pill" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-danger bg-gradient rounded-pill" style={{ width: `${soldBar}%` }} />
                                </div>
                                <span className="badge bg-secondary text-nowrap" style={{ fontSize: '0.7rem' }}>
                                  {categoryLabel(item.category)}
                                </span>
                                <span className="small text-muted text-nowrap">{item.soldQty} {t('unit')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-emoji-frown text-warning me-2"></i>
                    {t('unsoldItems')}
                  </h6>
                  {unsold.length > 0 && (
                    <span className="badge bg-danger-subtle text-danger">{unsold.length}</span>
                  )}
                </div>
                <div className="card-body p-0">
                  {unsold.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-emoji-laughing display-5 text-success"></i>
                      <p className="mt-2 mb-0 text-success fw-semibold">{t('allSold')}</p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {unsoldVisible.map((item) => (
                        <div key={item._id} className="list-group-item d-flex align-items-center gap-3 py-2">
                          <img
                            src={item.imageUrl}
                            alt={getName(item)}
                            loading="lazy"
                            className="rounded-2 border"
                            style={{ width: 46, height: 46, objectFit: 'cover', filter: 'grayscale(.3)' }}
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                          />
                          <div className="flex-grow-1 min-w-0">
                            <div className="text-truncate">{getName(item)}</div>
                            <div className="text-muted small">{categoryLabel(item.category)}</div>
                          </div>
                          <span className="fw-semibold text-nowrap">{formatPrice(item.price)}</span>
                        </div>
                      ))}
                      {unsold.length > 10 && (
                        <button
                          className="btn btn-sm btn-outline-secondary w-100 rounded-0"
                          onClick={() => setShowAllUnsold((v) => !v)}
                        >
                          <i className={`bi ${showAllUnsold ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                          {showAllUnsold ? t('showLess') : `${t('showMore')} (${unsold.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
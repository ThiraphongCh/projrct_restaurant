import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const statusKeys = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'success',
  completed: 'secondary',
  cancelled: 'danger',
};
const statusFlow = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
const statusPriority = { pending: 0, confirmed: 1, preparing: 2, ready: 3, completed: 4, cancelled: 5 };

const STATUS_ICONS = {
  pending: 'bi-hourglass-split',
  confirmed: 'bi-check2-circle',
  preparing: 'bi-fire',
  ready: 'bi-bell',
  completed: 'bi-check2-all',
  cancelled: 'bi-x-octagon',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, lang, getName, formatPrice } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, filterStatus]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const [ordersRes, statsRes] = await Promise.all([
        api.get(`/orders/admin${params}`),
        api.get('/orders/admin/stats'),
      ]);
      setOrders(ordersRes.data);
      setStats(statsRes.data);
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

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const p = statusPriority[a.status] - statusPriority[b.status];
        if (p !== 0) return p;
        return new Date(a.createdAt) - new Date(b.createdAt);
      }),
    [orders]
  );

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedOrders.filter((o) => {
      if (filterType && o.orderType !== filterType) return false;
      if (!q) return true;
      return (
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.orderNumber || '').toLowerCase().includes(q)
      );
    });
  }, [sortedOrders, search, filterType]);

  const typeCounts = useMemo(() => {
    const c = { dine_in: 0, delivery: 0 };
    sortedOrders.forEach((o) => {
      if (c[o.orderType] !== undefined) c[o.orderType] += 1;
    });
    return c;
  }, [sortedOrders]);

  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const pageOrders = visibleOrders.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search, filterType]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await api.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      await fetchData();
      if (selectedOrder?._id === orderId) {
        const updated = await api.get(`/orders/admin/${orderId}`);
        setSelectedOrder(updated.data);
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatus = (currentStatus) => {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx >= 0 && idx < statusFlow.length - 1) {
      return statusFlow[idx + 1];
    }
    return null;
  };

  const statusLabel = (key) => t(`status${cap(key)}`);
  const totalBar = stats?.totalOrders || 1;

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
            <i className="bi bi-speedometer2 text-primary me-2"></i>
            {t('dashboard')}
          </h4>
          <div className="text-muted small">
            <span className="badge bg-danger text-white rounded-pill me-2" style={{ fontSize: '0.65rem' }}>
              <i className="bi bi-broadcast"></i> {t('live')}
            </span>
            {t('updatedAt')}: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            <span className="ms-2 text-muted opacity-75">· {t('autoRefresh')}</span>
          </div>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchData} disabled={refreshing}>
          <i className={`bi ${refreshing ? 'bi-hourglass-split' : 'bi-arrow-clockwise'}`}></i>
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <StatCard
            icon="bi-receipt"
            color="primary"
            label={t('totalOrders')}
            value={String(stats.totalOrders).toLocaleString()}
            sub={`${stats.completedOrders} ${statusLabel('completed').toLowerCase()}`}
          />
          <StatCard
            icon="bi-lightning-charge"
            color="warning"
            label={t('ongoingOrders')}
            value={(
              stats.pendingOrders +
              (stats.statusCounts.confirmed || 0) +
              stats.preparingOrders +
              (stats.statusCounts.ready || 0)
            ).toLocaleString()}
            sub={`${stats.cancelledOrders} ${statusLabel('cancelled').toLowerCase()}`}
          />
          <StatCard
            icon="bi-calendar-day"
            color="info"
            label={t('todayOrders')}
            value={stats.today.orders.toLocaleString()}
            sub={t('todayRevenueShort')}
          />
          <StatCard
            icon="bi-cash-stack"
            color="success"
            label={t('revenue')}
            value={formatPrice(stats.totalRevenue)}
            sub={`${t('completedRevenue')} ${formatPrice(stats.completedRevenue)}`}
          />
        </div>
      )}

      {/* Type split */}
      {stats && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h6 className="mb-0">
                <i className="bi bi-diagram-3-fill text-primary me-2"></i>
                {t('typeSplitTitle')}
              </h6>
              <div className="d-flex gap-4 small text-muted">
                <span>
                  <i className="bi bi-calendar-day me-1"></i>
                  {t('typeSplitToday')}:{' '}
                  <strong>
                    {(stats.todayByType.dine_in.orders + stats.todayByType.delivery.orders).toLocaleString()}{' '}
                    {t('typeSplitOrders').toLowerCase()} · {formatPrice(stats.todayByType.dine_in.revenue + stats.todayByType.delivery.revenue)}
                  </strong>
                </span>
              </div>
            </div>
            <div className="row g-3">
              <TypeSplitCard
                icon="bi-shop"
                color="success"
                label={t('dineIn')}
                count={stats.byType.dine_in.orders}
                revenue={stats.byType.dine_in.revenue}
                todayCount={stats.todayByType.dine_in.orders}
                todayRevenue={stats.todayByType.dine_in.revenue}
              />
              <TypeSplitCard
                icon="bi-truck"
                color="info"
                label={t('delivery')}
                count={stats.byType.delivery.orders}
                revenue={stats.byType.delivery.revenue}
                todayCount={stats.todayByType.delivery.orders}
                todayRevenue={stats.todayByType.delivery.revenue}
              />
            </div>
          </div>
        </div>
      )}

      {/* Status overview + filter */}
      {stats && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h6 className="mb-0">
                <i className="bi bi-pie-chart-fill text-primary me-2"></i>
                {t('statusOverview')}
              </h6>
              <div className="d-flex align-items-center gap-2 text-muted small">
                <i className="bi bi-calendar-day me-1"></i>
                {t('todayOrders')}: <strong>{stats.today.orders}</strong>
                <span className="mx-1">·</span>
                {t('todayRevenueShort')}: <strong>{formatPrice(stats.today.revenue)}</strong>
              </div>
            </div>
            <div className="d-flex rounded-pill overflow-hidden mb-3" style={{ height: 14 }}>
              {statusKeys.map((k) =>
                stats.statusCounts[k] ? (
                  <div
                    key={k}
                    className={`bg-${statusColors[k]}`}
                    style={{ width: `${(stats.statusCounts[k] / totalBar) * 100}%` }}
                    title={`${statusLabel(k)}: ${stats.statusCounts[k]}`}
                  />
                ) : null
              )}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm rounded-pill ${filterStatus === '' ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => setFilterStatus('')}
              >
                {t('allStatuses')}
                <span className="badge ms-1 bg-white text-dark rounded-pill">{stats.totalOrders}</span>
              </button>
              {statusKeys.map((k) => (
                <button
                  key={k}
                  className={`btn btn-sm rounded-pill ${filterStatus === k ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilterStatus((prev) => (prev === k ? '' : k))}
                >
                  <i className={`bi ${STATUS_ICONS[k]} me-1`}></i>
                  {statusLabel(k)}
                  {(stats.statusCounts[k] || 0) > 0 && (
                    <span className="badge ms-1 bg-white text-dark rounded-pill">
                      {stats.statusCounts[k]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders + detail */}
      <div className="row g-4">
        <div className={selectedOrder ? 'col-lg-7' : 'col-12'}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h5 className="mb-0">
              <i className="bi bi-list-ul me-2"></i>
              {t('orders')}
              <span className="badge bg-primary-subtle text-primary ms-2">{visibleOrders.length}</span>
            </h5>
            <input
              className="form-control form-control-sm search-input-sm"
              placeholder={t('searchOrdersPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Order type tabs */}
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              className={`btn btn-sm rounded-pill ${filterType === '' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setFilterType('')}
            >
              <i className="bi bi-grid-3x3-gap me-1"></i>
              {t('allTypes')}
              <span className="badge ms-1 bg-white text-dark rounded-pill">{sortedOrders.length}</span>
            </button>
            <button
              className={`btn btn-sm rounded-pill ${filterType === 'dine_in' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilterType((prev) => (prev === 'dine_in' ? '' : 'dine_in'))}
            >
              <i className="bi bi-shop me-1"></i>
              {t('dineIn')}
              <span className="badge ms-1 bg-white text-dark rounded-pill">{typeCounts.dine_in}</span>
            </button>
            <button
              className={`btn btn-sm rounded-pill ${filterType === 'delivery' ? 'btn-info text-white' : 'btn-outline-info'}`}
              onClick={() => setFilterType((prev) => (prev === 'delivery' ? '' : 'delivery'))}
            >
              <i className="bi bi-truck me-1"></i>
              {t('delivery')}
              <span className="badge ms-1 bg-white text-dark rounded-pill">{typeCounts.delivery}</span>
            </button>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-3 text-muted">{search.trim() ? t('noMatchOrders') : t('noOrders')}</p>
            </div>
          ) : (
            <div className="list-group">
              {pageOrders.map((order) => {
                const isPending = order.status === 'pending';
                const itemNames = order.items.map((i) => getName(i));
                const firstItem = itemNames[0] || '';
                return (
                  <div
                    key={order._id}
                    className={`list-group-item list-group-item-action ${selectedOrder?._id === order._id ? 'active' : ''} ${isPending && selectedOrder?._id !== order._id ? 'bg-warning-subtle' : ''}`}
                    style={{
                      cursor: 'pointer',
                      ...(isPending && selectedOrder?._id !== order._id
                        ? { borderLeft: '4px solid #ffc107' }
                        : {}),
                    }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="min-w-0">
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <h6 className="mb-0">
                            <strong>#{order.orderNumber}</strong>
                          </h6>
                          <span className={`badge bg-${statusColors[order.status]}`}>
                            {statusLabel(order.status)}
                          </span>
                          {order.orderType === 'delivery' ? (
                            <span className="badge bg-info text-white">
                              <i className="bi bi-truck me-1"></i>{t('delivery')}
                            </span>
                          ) : (
                            <span className="badge bg-success text-white">
                              <i className="bi bi-shop me-1"></i>{t('dineIn')}
                            </span>
                          )}
                        </div>
                        <div className={`small text-truncate ${selectedOrder?._id === order._id ? '' : 'text-muted'}`}>
                          <i className="bi bi-person me-1"></i>
                          {order.customerName}
                          {order.orderType === 'delivery' ? (
                            order.address && (
                              <span className="ms-2">
                                <i className="bi bi-truck me-1"></i>{t('delivery')}
                              </span>
                            )
                          ) : order.tableNumber ? (
                            <span className="ms-2">
                              <i className="bi bi-geo-alt me-1"></i>{t('table')} {order.tableNumber}
                            </span>
                          ) : null}
                        </div>
                        <div className={`small ${selectedOrder?._id === order._id ? '' : 'text-muted'}`}>
                          <i className="bi bi-basket2 me-1"></i>
                          {firstItem}
                          {itemNames.length > 1 && (
                            <span className="text-muted"> · {t('moreItems').replace('%count%', itemNames.length - 1)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-end ms-2">
                        <strong>{formatPrice(order.totalPrice)}</strong>
                        <br />
                        <span className={`small ${selectedOrder?._id === order._id ? '' : 'text-muted'}`}>
                          {timeAgo(order.createdAt, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
              <div className="text-muted small">
                {t('showing')} {startIndex + 1}–{Math.min(visibleOrders.length, startIndex + pageSize)} {t('of')}{' '}
                {visibleOrders.length.toLocaleString()}
              </div>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="page size"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title={t('prevPage')}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <span className="btn btn-light" style={{ pointerEvents: 'none' }}>
                    {safePage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    title={t('nextPage')}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedOrder && (
          <div className="col-lg-5">
            <div className="card shadow-sm border-0 sticky-top detail-sticky">
              <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-receipt me-2"></i>#{selectedOrder.orderNumber}
                  {selectedOrder.orderType === 'delivery' ? (
                    <span className="badge bg-info ms-2">
                      <i className="bi bi-truck me-1"></i>{t('delivery')}
                    </span>
                  ) : (
                    <span className="badge bg-success ms-2">
                      <i className="bi bi-shop me-1"></i>{t('dineIn')}
                    </span>
                  )}
                </h5>
                <button className="btn btn-sm btn-outline-light" onClick={() => setSelectedOrder(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="card-body">
                {/* Status stepper */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center position-relative mb-1">
                    <div className="position-absolute top-50 start-0 end-0 border-top" style={{ transform: 'translateY(-50%)' }} />
                    {statusFlow.map((s, i) => {
                      const curIdx = statusFlow.indexOf(selectedOrder.status);
                      const done = selectedOrder.status === 'completed' || i < curIdx;
                      const current = selectedOrder.status === s;
                      const clickable = curIdx >= 0 && i > curIdx && selectedOrder.status !== 'cancelled';
                      return (
                        <button
                          key={s}
                          className={`position-relative d-flex align-items-center justify-content-center rounded-circle border-0 ${done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-secondary-subtle text-secondary'}`}
                          style={{ width: 30, height: 30, zIndex: 1 }}
                          disabled={!clickable || updatingId === selectedOrder._id}
                          title={statusLabel(s)}
                          onClick={() => clickable && handleStatusChange(selectedOrder._id, s)}
                        >
                          <i className={`bi ${done ? 'bi-check-lg' : current ? STATUS_ICONS[s] : 'bi-circle'}`}></i>
                        </button>
                      );
                    })}
                    {selectedOrder.status === 'cancelled' && (
                      <span className="position-relative ms-2 badge bg-danger">{statusLabel('cancelled')}</span>
                    )}
                  </div>
                  <div className="d-flex justify-content-between small mt-1">
                    {statusFlow.map((s) => (
                      <span key={s} className={`text-center ${selectedOrder.status === s ? 'fw-bold' : 'text-muted'}`} style={{ width: 36, fontSize: '0.65rem' }}>
                        {t(`step${cap(s)}`)}
                      </span>
                    ))}
                  </div>
                </div>

                <hr />

                {/* Customer info */}
                <div className="mb-3">
                  <p className="mb-1">
                    <i className="bi bi-person me-2 text-muted"></i>
                    {selectedOrder.customerName}
                  </p>
                  {selectedOrder.phone && (
                    <p className="mb-1">
                      <i className="bi bi-telephone me-2 text-muted"></i>
                      {selectedOrder.phone}
                    </p>
                  )}
                  {selectedOrder.orderType === 'delivery' ? (
                    selectedOrder.address && (
                      <p className="mb-1">
                        <i className="bi bi-truck me-2 text-muted"></i>
                        {selectedOrder.address}
                      </p>
                    )
                  ) : selectedOrder.tableNumber ? (
                    <p className="mb-1">
                      <i className="bi bi-geo-alt me-2 text-muted"></i>
                      {t('table')} {selectedOrder.tableNumber}
                    </p>
                  ) : null}
                  {selectedOrder.notes && (
                    <p className="mb-1">
                      <i className="bi bi-chat-left-text me-2 text-muted"></i>
                      {selectedOrder.notes}
                    </p>
                  )}
                  <p className="mb-0">
                    <i className="bi bi-clock me-2 text-muted"></i>
                    {new Date(selectedOrder.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
                    <span className="text-muted ms-2">({timeAgo(selectedOrder.createdAt, lang)})</span>
                  </p>
                </div>

                <hr />

                {/* Items */}
                <h6 className="mb-2">{t('orderItems')}</h6>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="d-flex align-items-center gap-2 mb-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={getName(item)}
                        loading="lazy"
                        className="rounded-2 border"
                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    )}
                    <div className="flex-grow-1 min-w-0">
                      <div className="text-truncate">{getName(item)}</div>
                      <div className="text-muted small">
                        {formatPrice(item.price)} × {item.quantity}
                      </div>
                    </div>
                    <span className="fw-bold text-nowrap">{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
                  </div>
                ))}
                <hr />
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{t('total')}</h5>
                  <h4 className="text-primary mb-0">{formatPrice(selectedOrder.totalPrice)}</h4>
                </div>

                <hr />

                {/* Actions */}
                <div className="d-flex flex-wrap gap-2">
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/admin/payment/${selectedOrder._id}`)}
                    >
                      <i className="bi bi-cash-coin me-1"></i>
                      {t('checkBill')}
                    </button>
                  )}
                  {getNextStatus(selectedOrder.status) && (
                    <button
                      className="btn btn-success"
                      disabled={updatingId === selectedOrder._id}
                      onClick={() => handleStatusChange(selectedOrder._id, getNextStatus(selectedOrder.status))}
                    >
                      {updatingId === selectedOrder._id ? (
                        <span className="spinner-border spinner-border-sm me-1"></span>
                      ) : (
                        <i className="bi bi-arrow-right-circle me-1"></i>
                      )}
                      {t('markAs')} {statusLabel(getNextStatus(selectedOrder.status))}
                    </button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                    <button
                      className="btn btn-outline-danger ms-auto"
                      disabled={updatingId === selectedOrder._id}
                      onClick={() => handleStatusChange(selectedOrder._id, 'cancelled')}
                    >
                      <i className="bi bi-x-circle me-1"></i>{t('cancelOrder')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeSplitCard({ icon, color, label, count, revenue, todayCount, todayRevenue }) {
  const { t, formatPrice } = useLanguage();
  const bgMap = {
    success: 'bg-success',
    info: 'bg-info',
  };
  return (
    <div className="col-md-6">
      <div className="card border-0 h-100" style={{ background: '#f8f9fa' }}>
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div
              className={`${bgMap[color] || bgMap.info} bg-gradient text-white d-flex align-items-center justify-content-center rounded-3`}
              style={{ width: 34, height: 34, fontSize: '1rem' }}
            >
              <i className={`bi ${icon}`}></i>
            </div>
            <strong className="flex-grow-1">{label}</strong>
          </div>
          <div className="d-flex justify-content-between align-items-end gap-2">
            <div>
              <div className="fs-4 fw-bold">
                {count.toLocaleString()}{' '}
                <span className="fs-6 fw-normal text-muted">{t('typeSplitOrders').toLowerCase()}</span>
              </div>
              <div className="small text-muted">{t('revenue')}</div>
              <div className="fw-bold text-nowrap">{formatPrice(revenue)}</div>
            </div>
            <div className="text-end small">
              <div className="text-muted">{t('typeSplitToday')}</div>
              <div>
                <i className="bi bi-calendar-day me-1"></i>
                <strong>{todayCount.toLocaleString()}</strong> · {formatPrice(todayRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value, sub }) {
  const bgMap = {
    primary: 'bg-primary',
    warning: 'bg-warning',
    info: 'bg-info',
    success: 'bg-success',
    danger: 'bg-danger',
  };
  return (
    <div className="col-6 col-xl-3">
      <div className="card shadow-sm border-0 h-100 overflow-hidden">
        <div className="card-body d-flex align-items-center gap-3">
          <div
            className={`${bgMap[color] || bgMap.primary} bg-gradient text-white d-flex align-items-center justify-content-center rounded-3`}
            style={{ width: 46, height: 46, fontSize: '1.3rem' }}
          >
            <i className={`bi ${icon}`}></i>
          </div>
          <div className="min-w-0">
            <div className="text-muted small text-nowrap">{label}</div>
            <div className="fw-bold fs-5 text-nowrap">{value}</div>
            {sub && <div className="text-muted small text-truncate">{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr, lang) {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return lang === 'th' ? 'เมื่อสักครู่' : 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return lang === 'th' ? `${m} นาทีที่แล้ว` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'th' ? `${h} ชั่วโมงที่แล้ว` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === 'th' ? `${d} วันที่แล้ว` : `${d}d ago`;
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
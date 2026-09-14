import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function Checkout() {
  const { items, totalPrice, clearCart, changeDineTable } = useCart();
  const { t, getName, formatPrice } = useLanguage();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState('dine_in');
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({
    tableNumber: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch table availability so busy tables can't be selected
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await api.get('/orders/tables/status');
        setTables(response.data.tables);
      } catch {
        /* keep last known table state */
      }
    };
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
}, []);

  const changeOrderType = (type) => {
    setOrderType(type);
    if (type === 'delivery') {
      changeDineTable('');
    }
  };

  const selectTable = (tableNumber) => {
    setForm((prev) => ({ ...prev, tableNumber }));
    setError('');
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (orderType === 'dine_in' && !form.tableNumber) {
      setError(t('tableRequired'));
      return;
    }
    if (items.length === 0) {
      setError(t('cartEmptyCheckout'));
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        items: items.map((item) => ({
          menuItemId: item._id,
          quantity: item.quantity,
        })),
        orderType,
        tableNumber: orderType === 'dine_in' ? form.tableNumber : '',
        address: orderType === 'delivery' ? form.address.trim() : '',
        notes: form.notes.trim(),
      };

      const response = await api.post('/orders', orderData);
      clearCart();
      changeDineTable('');
      navigate('/order-confirmation', { state: { order: response.data } });
    } catch (err) {
      const message = err.response?.data?.message || t('menuError');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !loading) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-cart-x display-1 text-muted"></i>
        <h3 className="mt-3 text-muted">{t('cartEmptyCheckout')}</h3>
        <p className="text-muted">{t('cartEmptyHintCheckout')}</p>
        <Link to="/" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>{t('browseMenu')}
        </Link>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <h2 className="mb-4">
          <i className="bi bi-credit-card me-2"></i>{t('checkoutTitle')}
        </h2>

        {error && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="row">
          {/* Order summary */}
          <div className="col-md-5 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-receipt me-2"></i>{t('orderSummary')}
                </h5>
              </div>
              <div className="card-body">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="d-flex justify-content-between align-items-center py-2 border-bottom"
                  >
                    <div>
                      <strong>{getName(item)}</strong>
                      <br />
                      <small className="text-muted">
                        {item.quantity} x {formatPrice(item.price)}
                      </small>
                    </div>
                    <span className="fw-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="d-flex justify-content-between align-items-center pt-3 mt-2 border-top">
                  <h5 className="mb-0">{t('total')}</h5>
                  <h4 className="mb-0 text-primary">{formatPrice(totalPrice)}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout form */}
          <div className="col-md-7 mb-4">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-bag-check me-2"></i>{t('orderTypeTitle')}
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <button
                      type="button"
                      className={`btn w-100 h-100 d-flex flex-column align-items-center gap-1 p-3 border-2 ${
                        orderType === 'dine_in'
                          ? 'btn-primary text-white border-primary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => changeOrderType('dine_in')}
                    >
                      <i className={`bi bi-shop fs-2 ${orderType === 'dine_in' ? '' : 'text-muted'}`}></i>
                      <strong>{t('dineIn')}</strong>
                      <small className={orderType === 'dine_in' ? 'opacity-75' : 'text-muted'}>
                        {t('dineInHint')}
                      </small>
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      type="button"
                      className={`btn w-100 h-100 d-flex flex-column align-items-center gap-1 p-3 border-2 ${
                        orderType === 'delivery'
                          ? 'btn-primary text-white border-primary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => changeOrderType('delivery')}
                    >
                      <i className={`bi bi-truck fs-2 ${orderType === 'delivery' ? '' : 'text-muted'}`}></i>
                      <strong>{t('delivery')}</strong>
                      <small className={orderType === 'delivery' ? 'opacity-75' : 'text-muted'}>
                        {t('deliveryHint')}
                      </small>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Table selector (dine-in) */}
                  {orderType === 'dine_in' && (
                    <div className="mb-4">
                      <label className="form-label">
                        <i className="bi bi-geo-alt me-1"></i>
                        {t('tableSelection')} <span className="text-danger">*</span>
                      </label>
                      <div className="row g-2">
                        {tables.map((table) => {
                          const disabled = table.busy;
                          const selected = form.tableNumber === table.tableNumber;
                          return (
                            <div className="col-3 col-sm-2" key={table.tableNumber}>
                              <button
                                type="button"
                                className={`btn btn-sm w-100 d-flex flex-column align-items-center border-2 ${
                                  selected
                                    ? 'btn-primary text-white border-primary'
                                    : disabled
                                      ? 'btn-outline-danger text-danger opacity-50'
                                      : 'btn-outline-success text-success'
                                }`}
                                disabled={disabled}
                                onClick={() => selectTable(table.tableNumber)}
                              >
                                <i className={`bi ${selected ? 'bi-check-circle-fill' : disabled ? 'bi-lock-fill' : 'bi-circle'}`}></i>
                                <span className="fw-bold fs-6">{table.tableNumber}</span>
                                <small>
                                  {disabled
                                    ? t('tableOccupied')
                                    : selected
                                      ? t('tableAvailable')
                                      : t('tableAvailable')}
                                </small>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="form-text mt-2">
                        <i className="bi bi-info-circle me-1"></i>
                        {t('tableStatusHint')}
                      </div>
                    </div>
                  )}

                  {/* Delivery address */}
                  {orderType === 'delivery' && (
                    <div className="alert alert-secondary py-2 small">
                      <i className="bi bi-info-circle me-1"></i>
                      {t('deliveryNoAddressHint')}
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="form-label">{t('specialRequests')}</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows="2"
                      placeholder={t('specialRequests')}
                    ></textarea>
                  </div>
                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {t('placingOrder')}
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          {t('placeOrder')} ({formatPrice(totalPrice)})
                        </>
                      )}
                    </button>
                    <Link to="/cart" className="btn btn-outline-secondary">
                      <i className="bi bi-arrow-left me-2"></i>{t('backToCart')}
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
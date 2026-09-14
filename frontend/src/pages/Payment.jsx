import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import promptpayQR from 'promptpay-qr';
import QRCode from 'qrcode';
import { RESTAURANT } from '../constants';

const methodKeys = {
  cash: 'methodCash',
  transfer: 'methodTransfer',
  card: 'methodCard',
};

export default function Payment() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { t, lang, getName, formatPrice } = useLanguage();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState('');
  const [paid, setPaid] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, navigate]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/admin/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const total = order ? Number(order.totalPrice) : 0;
  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;

  // Generate PromptPay QR when transfer is selected
  useEffect(() => {
    if (order && method === 'transfer') {
      let cancelled = false;
      const payload = promptpayQR(RESTAURANT.promptpay, { amount: total });
      QRCode.toDataURL(payload, { width: 240, margin: 1 })
        .then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [order, method, total]);

  const handleMethod = (m) => {
    setMethod(m);
    setError('');
  };

  const setReceivedQuick = (value) => {
    setReceived(String(value));
    setError('');
  };

  // Round up to the next ten baht
  const roundUpTen = () => {
    const v = Math.ceil(total / 10) * 10;
    setReceived(String(v));
    setError('');
  };

  const handlePay = async () => {
    setError('');
    if (method === 'cash' && receivedNum < total) {
      setError(t('cashInsufficient'));
      return;
    }
    try {
      setPaying(true);
      const changeValue = method === 'cash' ? Math.max(0, receivedNum - total) : 0;
      const res = await api.post(`/orders/admin/${orderId}/pay`, {
        paymentMethod: method,
        paidAmount: method === 'cash' ? receivedNum : total,
        changeAmount: changeValue,
      });
      setPaid(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t('menuError'));
    } finally {
      setPaying(false);
    }
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

  if (notFound || !order) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-exclamation-circle display-1 text-muted"></i>
        <h3 className="mt-3 text-muted">{t('noOrderInfo')}</h3>
        <Link to="/admin/tables" className="btn btn-primary mt-2">
          <i className="bi bi-arrow-left me-2"></i>{t('backToTables')}
        </Link>
      </div>
    );
  }

  const isPaid = !!paid;
  const isAlreadyPaid = !isPaid && order.status === 'completed';
  const isCancelled = !isPaid && order.status === 'cancelled';
  const display = paid || order;

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        {/* Pay header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">
            <i className="bi bi-cash-coin text-primary me-2"></i>
            {t('paymentTitle')}
            {display.orderType === 'delivery' ? (
              <span className="badge bg-info ms-2">
                <i className="bi bi-truck me-1"></i>{t('delivery')}
              </span>
            ) : display.tableNumber ? (
              <span className="badge bg-primary ms-2">{t('table')} {display.tableNumber}</span>
            ) : null}
          </h4>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/admin/tables')}>
              <i className="bi bi-grid-3x3-gap me-1"></i>{t('backToTables')}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/admin')}>
              <i className="bi bi-speedometer2 me-1"></i>{t('dashboard')}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {isCancelled && (
          <div className="alert alert-danger">
            <i className="bi bi-x-octagon me-2"></i>
            {t('receiptClosed')}
          </div>
        )}
        {isAlreadyPaid && (
          <div className="alert alert-info">
            <i className="bi bi-check2-circle me-2"></i>
            {t('receiptAlreadyPaid')} — {t('paymentDate')}: {new Date(display.paidAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
          </div>
        )}
        {error && !isPaid && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>{error}
          </div>
        )}

        {isPaid ? (
          <PaymentSuccess
            order={display}
            total={total}
            restaurant={RESTAURANT}
            t={t}
            lang={lang}
            getName={getName}
            formatPrice={formatPrice}
          />
        ) : (
          <div className="row g-4">
            {/* Order summary */}
            <div className="col-md-6 no-print">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-dark text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-receipt me-2"></i>#{display.orderNumber} · {t('billFor')} {display.customerName || t('orderCustomer')}
                  </h6>
                </div>
                <div className="card-body py-2">
                  {display.items.map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom small">
                      <div className="min-w-0">
                        <div className="text-truncate">{getName(item)}</div>
                        <div className="text-muted">{formatPrice(item.price)} × {item.quantity}</div>
                      </div>
                      <span className="fw-bold">{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between align-items-center pt-3">
                    <strong>{t('total')}</strong>
                    <h4 className="text-primary mb-0">{formatPrice(total)}</h4>
                  </div>
                  {display.orderType === 'delivery' && display.address && (
                    <p className="text-muted small mb-0 mt-2">
                      <i className="bi bi-house-door me-1"></i>{display.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment actions */}
            <div className="col-md-6 no-print">
              <div className="card shadow-sm border-0">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-wallet2 me-2"></i>
                    {t('paymentMethod')}
                  </h6>
                </div>
                <div className="card-body">
                  {/* Method selection */}
                  <div className="row g-2 mb-3">
                    {Object.keys(methodKeys).map((m) => (
                      <div className="col-4" key={m}>
                        <button
                          type="button"
                          className={`btn w-100 d-flex flex-column align-items-center gap-1 py-2 border-2 ${
                            method === m ? 'btn-primary text-white' : 'btn-outline-secondary'
                          }`}
                          onClick={() => handleMethod(m)}
                        >
                          <i className={`bi fs-4 ${m === 'cash' ? 'bi-cash-stack' : m === 'transfer' ? 'bi-qr-code-scan' : 'bi-credit-card'}`}></i>
                          <small>{t(methodKeys[m])}</small>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Cash */}
                  {method === 'cash' && (
                    <div className="mb-3">
                      <label className="form-label">
                        <i className="bi bi-cash me-1"></i>{t('cashReceived')}
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-lg"
                        value={received}
                        min="0"
                        onChange={(e) => { setReceived(e.target.value); setError(''); }}
                        placeholder={String(total)}
                      />
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={roundUpTen}>
                          {lang === 'th' ? 'ปัดขึ้นหลักสิบ' : 'Round up ×10'}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setReceivedQuick(500)}>500</button>
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setReceivedQuick(1000)}>1,000</button>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setReceivedQuick(total)}>
                          {lang === 'th' ? 'พอดี' : 'Exact'}
                        </button>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-3 p-2 bg-light rounded">
                        <span>{t('total')}</span>
                        <strong>{formatPrice(total)}</strong>
                      </div>
                      <div className={`d-flex justify-content-between align-items-center p-2 rounded mt-1 ${receivedNum >= total ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                        <span>{t('cashChange')}</span>
                        <strong>{formatPrice(Math.max(0, change))}</strong>
                      </div>
                    </div>
                  )}

                  {/* Bank transfer */}
                  {method === 'transfer' && (
                    <div className="text-center mb-3">
                      <h6 className="mb-1">{t('transferInfoTitle')}</h6>
                      <p className="text-muted small mb-2">
                        {t('promptpayLabel')}: {RESTAURANT.promptpay}
                      </p>
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="PromptPay QR"
                          className="border rounded mb-2"
                          style={{ width: 200, height: 200 }}
                        />
                      ) : (
                        <div className="border rounded d-flex align-items-center justify-content-center mb-2" style={{ width: 200, height: 200, margin: '0 auto' }}>
                          <div className="spinner-border text-primary"></div>
                        </div>
                      )}
                      <p className="small text-muted mb-0">
                        <i className="bi bi-info-circle me-1"></i>
                        {t('scanPromptpay')} <strong>{formatPrice(total)}</strong>
                      </p>
                      <hr />
                      <div className="small text-start">
                        <p className="mb-1"><i className="bi bi-bank me-1"></i>{t('bankLabel')}: <strong>{RESTAURANT.bank}</strong></p>
                        <p className="mb-1"><i className="bi bi-hash me-1"></i>{t('accountNo')}: <strong>{RESTAURANT.account}</strong></p>
                        <p className="mb-0"><i className="bi bi-person-badge me-1"></i>{t('accountNameLabel')}: <strong>{RESTAURANT.accountName}</strong></p>
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  {method === 'card' && (
                    <div className="text-center text-muted small mb-3 py-2">
                      <i className="bi bi-credit-card-2-front fs-2 d-block mb-2"></i>
                      {lang === 'th'
                        ? 'รูดบัตรผ่านเครื่อง EDC แล้วกดยืนยันชำระเงิน'
                        : 'Charge via card terminal, then confirm payment'}
                    </div>
                  )}

                  <div className="d-grid">
                    <button className="btn btn-success btn-lg" onClick={handlePay} disabled={paying || isCancelled || isAlreadyPaid}>
                      {paying ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {t('paying')}
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cash-coin me-2"></i>
                          {t('confirmPayment')} ({formatPrice(method === 'cash' ? Math.max(receivedNum, total) : total)})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentSuccess({ order, total, restaurant, t, lang, getName, formatPrice }) {
  const methodLabel = t(methodKeys[order.paymentMethod] || order.paymentMethod);
  const print = () => window.print();

  return (
    <div>
      <div className="alert alert-success d-flex align-items-center gap-2 no-print">
        <i className="bi bi-check-circle-fill"></i>
        <div>
          <strong>{t('paymentSuccess')}</strong> — {t('paymentSuccessHint')}
        </div>
      </div>

      <div className="text-center mb-3 no-print">
        <button className="btn btn-primary btn-lg" onClick={print}>
          <i className="bi bi-printer me-2"></i>
          {t('printReceipt')}
        </button>
      </div>

      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: '80mm' }}>
        <div className="card-body p-3">
          <div id="receipt-print-area" className="receipt-print-area small">
            <div className="text-center mb-2">
              <h4 className="mb-0 fw-bold">{lang === 'th' ? restaurant.nameTh : restaurant.nameEn}</h4>
              <div className="text-muted">{restaurant.address}</div>
              <div className="text-muted">Tel: {restaurant.phone}</div>
            </div>
            <hr className="my-2" />
            <div className="text-center mt-1 mb-2">
              <strong>{t('receiptTitle')}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>#{order.orderNumber}</span>
              <span>{new Date(order.paidAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}</span>
            </div>
            <div>
              {order.orderType === 'delivery' ? (
                <>
                  <span className="me-2"><i className="bi bi-truck"></i> {t('delivery')}</span>
                  {order.address}
                </>
              ) : (
                <span>{t('table')} {order.tableNumber}</span>
              )}
            </div>
            <hr className="my-2" />
            {order.items.map((item, index) => (
              <div key={index} className="d-flex justify-content-between mb-1">
                <div>
                  <div>{item.nameTh || item.name}</div>
                  {item.name && item.nameTh && item.name !== item.nameTh && (
                    <div className="text-muted">{item.name}</div>
                  )}
                  <div className="text-muted">{item.quantity} × {Number(item.price).toLocaleString()}</div>
                </div>
                <span className="text-nowrap">{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="d-flex justify-content-between fw-bold">
              <span>{t('total')}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>{methodLabel}</span>
              <span>{formatPrice(order.paidAmount)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="ps-3 text-muted">{t('cashChange')}</span>
              <span className="text-muted">{formatPrice(order.changeAmount)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">{t('paymentDate')}</span>
              <span className="text-muted">{new Date(order.paidAt).toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US')}</span>
            </div>
            <hr className="my-2" />
            <div className="text-center mt-2">
              <i className="bi bi-shop me-1"></i>
              {t('receiptFooterThanks')} — {lang === 'th' ? restaurant.nameTh : restaurant.nameEn}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-3 no-print">
        <Link className="btn btn-outline-primary me-2" to="/admin/tables">
          <i className="bi bi-grid-3x3-gap me-1"></i>{t('backToTables')}
        </Link>
        <Link className="btn btn-outline-secondary" to="/admin">
          <i className="bi bi-speedometer2 me-1"></i>{t('dashboard')}
        </Link>
      </div>
    </div>
  );
}
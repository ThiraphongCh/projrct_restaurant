import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function OrderConfirmation() {
  const location = useLocation();
  const order = location.state?.order;
  const { t, getName, formatPrice } = useLanguage();

  if (!order) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-exclamation-circle display-1 text-muted"></i>
        <h3 className="mt-3 text-muted">{t('noOrderInfo')}</h3>
        <p className="text-muted">{t('noOrderInfoHint')}</p>
        <Link to="/" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>{t('browseMenu')}
        </Link>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6">
        <div className="card shadow-sm border-success">
          <div className="card-body text-center py-5">
            <div className="mb-4">
              <i className="bi bi-check-circle-fill text-success display-1"></i>
            </div>
            <h2 className="text-success mb-3">{t('orderSuccess')}</h2>
            <p className="text-muted mb-4">{t('orderSuccessHint')}</p>

            <div className="bg-light rounded p-4 mb-4">
              <h5 className="text-muted mb-2">{t('orderNumber')}</h5>
              <h2 className="text-primary mb-2">#{order.orderNumber}</h2>
              <span className={`badge ${order.orderType === 'delivery' ? 'bg-info' : 'bg-primary'}`}>
                <i className={`bi ${order.orderType === 'delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                {order.orderType === 'delivery' ? t('delivery') : t('dineIn')}
              </span>
              {order.orderType === 'delivery' && order.address && (
                <span className="badge bg-secondary ms-2">
                  <i className="bi bi-house-door me-1"></i>{order.address}
                </span>
              )}
              {order.orderType !== 'delivery' && order.tableNumber && (
                <span className="badge bg-secondary ms-2">
                  <i className="bi bi-geo-alt me-1"></i>{t('table')} {order.tableNumber}
                </span>
              )}
            </div>

            <div className="text-start mb-4">
              <h6 className="text-muted mb-3">{t('orderDetails')}</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td>{getName(item)}</td>
                        <td className="text-center">x{item.quantity}</td>
                        <td className="text-end">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                    <tr className="table-light">
                      <td colSpan="2">
                        <strong>{t('total')}</strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-primary">{formatPrice(order.totalPrice)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {order.customerName && order.customerName !== 'Guest' && (
                <p className="mb-1">
                  <i className="bi bi-person me-2 text-muted"></i>
                  {order.customerName}
                </p>
              )}
              {order.orderType === 'delivery' ? (
                order.address && (
                  <p className="mb-1">
                    <i className="bi bi-house-door me-2 text-muted"></i>
                    {order.address}
                  </p>
                )
              ) : (
                order.tableNumber && (
                  <p className="mb-1">
                    <i className="bi bi-geo-alt me-2 text-muted"></i>
                    {t('table')} {order.tableNumber}
                  </p>
                )
              )}
              {order.phone && (
                <p className="mb-0">
                  <i className="bi bi-telephone me-2 text-muted"></i>
                  {order.phone}
                </p>
              )}
            </div>

            <div className="d-grid gap-2">
              <Link to="/" className="btn btn-primary btn-lg">
                <i className="bi bi-arrow-left me-2"></i>{t('browseMenu')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
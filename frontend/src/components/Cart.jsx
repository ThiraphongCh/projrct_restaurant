import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { t, getName, formatPrice } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-cart-x display-1 text-muted"></i>
        <h3 className="mt-3 text-muted">{t('cartEmpty')}</h3>
        <p className="text-muted">{t('cartEmptyHint')}</p>
        <Link to="/" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>{t('browseMenu')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-cart3 me-2"></i>{t('cartTitle')}
        </h2>
        <button className="btn btn-outline-danger btn-sm" onClick={clearCart}>
          <i className="bi bi-trash me-1"></i>{t('clearAll')}
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('item')}</th>
                  <th style={{ width: '150px' }}>{t('qtyHeader')}</th>
                  <th className="text-end">{t('priceHeader')}</th>
                  <th className="text-end">{t('subtotalHeader')}</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={getName(item)}
                            className="rounded me-3"
                            style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <strong>{getName(item)}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="input-group input-group-sm" style={{ width: '120px' }}>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        >
                          <i className="bi bi-dash"></i>
                        </button>
                        <span className="form-control text-center">{item.quantity}</span>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    </td>
                    <td className="text-end">{formatPrice(item.price)}</td>
                    <td className="text-end fw-bold">
                      {formatPrice(item.price * item.quantity)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFromCart(item._id)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mt-4 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">{t('total')}</h4>
            <h3 className="mb-0 text-primary">{formatPrice(totalPrice)}</h3>
          </div>
          <div className="d-grid gap-2">
            <Link to="/checkout" className="btn btn-primary btn-lg">
              <i className="bi bi-credit-card me-2"></i>{t('proceedToCheckout')}
            </Link>
            <Link to="/" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-2"></i>{t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants';

const RANK_COLORS = { 1: '#ffc107', 2: '#adb5bd', 3: '#cd7f32' };

const TONE_CLASS = {
  featured: 'bg-warning text-dark',
  best: 'bg-danger text-white',
};

export default function MenuItem({ item, badge = '', badgeTone = 'best', rank = 0 }) {
  const { addToCart } = useCart();
  const { t, getName, getDesc, categoryLabel, formatPrice } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(item, quantity);
    setQuantity(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const catColor = CATEGORY_COLORS[item.category] || '#6c757d';
  const catIcon = CATEGORY_ICONS[item.category] || 'bi-tag';

  return (
    <div className="card h-100 shadow-sm menu-item-card border-0">
      <div className="position-relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            className="card-img-top"
            alt={getName(item)}
            loading="lazy"
            style={{ height: '180px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="menu-img-fallback" style={{ background: `${catColor}22` }}>
            <i className={`bi ${catIcon}`} style={{ color: catColor }}></i>
          </div>
        )}
        {badge && (
          <span className={`position-absolute top-0 start-0 m-2 badge shadow-sm ${TONE_CLASS[badgeTone] || TONE_CLASS.best}`}>
            <i className={`bi ${badgeTone === 'featured' ? 'bi-star-fill' : 'bi-fire'} me-1`}></i>
            {badge}
          </span>
        )}
        {rank > 0 && (
          <span
            className="rank-badge"
            style={{ backgroundColor: RANK_COLORS[rank] || RANK_COLORS[3] }}
            title={`#${rank}`}
          >
            {rank}
          </span>
        )}
      </div>
      <div className="card-body d-flex flex-column pt-3">
        <div className="mb-1">
          <span className="cat-dot" style={{ backgroundColor: catColor }}></span>
          <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.7rem' }}>
            <i className={`bi ${catIcon} me-1`}></i>
            {categoryLabel(item.category)}
          </span>
        </div>
        <h6 className="card-title fw-bold clamp-1 mb-1" title={getName(item)}>
          {getName(item)}
        </h6>
        <p className="card-text text-muted small clamp-2 mb-2">{getDesc(item)}</p>

        <div className="mt-auto">
          <div className="d-flex justify-content-between align-items-end mb-2">
            <span className="fw-bold price-text" style={{ color: catColor }}>
              <span className="currency-symbol">฿</span>
              {formatPrice(item.price)}
            </span>
            {quantity > 1 && (
              <span className="text-muted small">
                × {quantity} = <span className="fw-semibold text-dark">{formatPrice(item.price * quantity)}</span>
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: '104px' }}>
              <button
                className="btn btn-outline-primary"
                style={{ zIndex: 0 }}
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="decrease"
              >
                <i className="bi bi-dash-lg"></i>
              </button>
              <span
                className="input-group-text justify-content-center px-0"
                style={{ minWidth: '36px', backgroundColor: '#f8f9fa' }}
              >
                {quantity}
              </span>
              <button
                className="btn btn-outline-primary"
                style={{ zIndex: 0 }}
                disabled={quantity >= 10}
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                aria-label="increase"
              >
                <i className="bi bi-plus-lg"></i>
              </button>
            </div>
            <button
              className={`btn btn-sm flex-grow-1 ${added ? 'btn-success' : 'btn-primary'}`}
              onClick={handleAdd}
            >
              {added ? (
                <>
                  <i className="bi bi-check-lg me-1"></i>{t('added')}
                </>
              ) : (
                <>
                  <i className="bi bi-cart-plus me-1"></i>{t('addToCart')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
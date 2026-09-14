import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import MenuItem from '../components/MenuItem';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { RESTAURANT, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_ORDER } from '../constants';

const HERO_IMAGE =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Phat_Thai_kung_Chang_Khien_street_stall.jpg/960px-Phat_Thai_kung_Chang_Khien_street_stall.jpg';

const CATEGORIES = ['', ...CATEGORY_ORDER];

export default function CustomerMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const { t, lang } = useLanguage();
  const { dineTable, changeDineTable, totalItems } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const table = searchParams.get('table');
    if (table && /^\d+$/.test(table) && Number(table) > 0) {
      changeDineTable(table);
      const next = new URLSearchParams(searchParams);
      next.delete('table');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const [menuRes, featuredRes, popularRes] = await Promise.all([
        api.get('/menu'),
        api.get('/menu/featured'),
        api.get('/menu/popular'),
      ]);
      setMenuItems(menuRes.data);
      setFeaturedItems(featuredRes.data);
      setPopularItems(popularRes.data);
    } catch (err) {
      setError(t('menuError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const m = {};
    menuItems.forEach((i) => {
      m[i.category] = (m[i.category] || 0) + 1;
      m[''] = (m[''] || 0) + 1;
    });
    return m;
  }, [menuItems]);

  const normalized = search.trim().toLowerCase();

  const gridItems = useMemo(() => {
    let list = activeCategory ? menuItems.filter((i) => i.category === activeCategory) : menuItems;
    if (normalized) {
      list = list.filter((i) =>
        `${i.name || ''} ${i.nameTh || ''} ${i.description || ''} ${i.descriptionTh || ''}`
          .toLowerCase()
          .includes(normalized)
      );
    }
    return list;
  }, [menuItems, activeCategory, normalized]);

  const searching = normalized.length > 0;

  // When showing the full menu, group items by category (in the display order)
  const groupedMenu = useMemo(() => {
    if (searching || activeCategory) return null;
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: menuItems.filter((i) => i.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [menuItems, searching, activeCategory]);

  const scrollToMenu = () => {
    document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pickCategory = (cat) => {
    setActiveCategory(cat);
    setSearch('');
    scrollToMenu();
  };

  return (
    <div>
      {dineTable && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 mb-4 shadow-sm">
          <span className="fw-semibold">
            <i className="bi bi-qr-code-scan me-2"></i>
            {t('qrBannerTitle')}
            <span className="badge bg-warning text-dark ms-2">
              {t('tableSeat')} {dineTable}
            </span>
          </span>
          <button className="btn btn-sm btn-outline-warning" onClick={() => changeDineTable('')}>
            <i className="bi bi-x-lg me-1"></i>
            {t('qrBannerClear')}
          </button>
        </div>
      )}

      {/* Hero */}
      <section
        className="position-relative text-white overflow-hidden mb-4 hero-section"
        style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="hero-overlay" />
        <div className="hero-overlay-veil" />
        <div className="position-relative container py-5 text-center">
          <span className="badge bg-warning text-dark mb-3 px-3 py-2 rounded-pill fw-semibold hero-chip shadow-sm">
            <i className="bi bi-stars me-1"></i>
            {lang === 'th' ? 'อาหารไทยต้นตำรับแท้ๆ' : 'Authentic Thai Street Food'}
          </span>
          <h1 className="display-4 fw-bold hero-title mb-2">
            <i className="bi bi-shop me-2 hero-shop-icon"></i>
            {lang === 'th' ? RESTAURANT.nameTh : RESTAURANT.nameEn}
          </h1>
          <p className="lead hero-tagline mx-auto mb-4">
            {lang === 'th'
              ? 'สั่งผ่านเว็บได้เลย — เลือกเมนู เพิ่มลงตะกร้า แล้วยืนยันออเดอร์ รอเสิร์ฟถึงโต๊ะ'
              : 'Order online in seconds — pick your dishes, add to cart, and confirm. We take care of the rest.'}
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
            <button className="btn btn-warning btn-lg fw-semibold hero-cta" onClick={scrollToMenu}>
              <i className="bi bi-basket2 me-2"></i>
              {t('heroCtaMenu')}
            </button>
            <button className="btn btn-outline-light btn-lg hero-cta" onClick={scrollToMenu}>
              <i className="bi bi-arrow-down me-2"></i>
              {t('heroCtaHow')}
            </button>
          </div>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <span className="hero-content">
              <i className="bi bi-truck me-1"></i>{t('heroMenuTag')}
            </span>
            <span className="hero-content">
              <i className="bi bi-fire me-1"></i>{t('heroFreshTag')}
            </span>
          </div>
          <div className="mx-auto mt-4" style={{ maxWidth: '520px' }}>
            <div className="input-group input-group-lg hero-search shadow">
              <span className="input-group-text bg-white border-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                className="form-control form-control-lg border-0"
                style={{ boxShadow: 'none' }}
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="btn btn-light border-0" onClick={() => setSearch('')} aria-label={t('clearSearch')}>
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How to order */}
      <section className="mb-5">
        <div className="text-center mb-4">
          <h4 className="fw-bold mb-1">
            <i className="bi bi-lightbulb text-warning me-2"></i>
            {t('howToTitle')}
          </h4>
          <div className="text-muted small">{t('howToSubtitle')}</div>
        </div>
        <div className="row g-3 justify-content-center">
          {[
            { icon: 'bi-hand-index-thumb', title: t('howTo1'), note: t('howTo1Note') },
            { icon: 'bi-bag-check', title: t('howTo2'), note: t('howTo2Note') },
            { icon: 'bi-bell', title: t('howTo3'), note: t('howTo3Note') },
          ].map((step, i) => (
            <div className="col-6 col-md-4 col-lg-3" key={i}>
              <div className="howto-card h-100 text-center">
                <div className="howto-num">{i + 1}</div>
                <div className="howto-icon">
                  <i className={`bi ${step.icon}`}></i>
                </div>
                <div className="fw-bold">{step.title}</div>
                <div className="text-muted small">{step.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      {!loading && !error && !activeCategory && !searching && (
        <div className="mb-5">
          {featuredItems.length > 0 && (
            <HighlightSection
              title={t('featuredMenu')}
              subtitle={t('featuredSubtitle')}
              icon="bi-stars text-warning"
              items={featuredItems}
              badge={t('featuredBadge')}
              badgeTone="featured"
            />
          )}
          {popularItems.length > 0 && (
            <HighlightSection
              title={t('bestSellers')}
              subtitle={t('bestSellersSubtitle')}
              icon="bi-fire text-danger"
              items={popularItems}
              badge={t('bestSellerBadge')}
              badgeTone="best"
              ranked
            />
          )}
        </div>
      )}

      {/* Category showcase */}
      <div id="menu-section" className="menu-anchor">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div>
            <h4 className="fw-bold mb-0">
              <i className="bi bi-bookmark-star text-primary me-2"></i>
              {t('menuSectionTitle')}
              <span className="badge bg-primary-subtle text-primary ms-2">{counts[''] || 0}</span>
            </h4>
            <div className="text-muted small">{t('menuSectionSubtitle')}</div>
          </div>
          {activeCategory && (
            <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => pickCategory('')}>
              <i className="bi bi-grid-3x3-gap-fill me-1"></i>
              {t('categoryAll')}
            </button>
          )}
        </div>

        <div className="cat-scroll d-flex flex-nowrap gap-3 pb-3 mb-4 overflow-auto">
          {CATEGORIES.map((cat) => {
            const color = CATEGORY_COLORS[cat];
            const active = activeCategory === cat;
            const count = counts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                className={`cat-card ${active ? 'active' : ''}`}
                style={active ? { borderColor: color, background: `${color}1a` } : {}}
                onClick={() => pickCategory(cat)}
              >
                <span className="cat-card-icon" style={{ color: active ? color : '#495057', backgroundColor: active ? '#fff' : '#f1f3f5' }}>
                  <i className={`bi ${CATEGORY_ICONS[cat]}`}></i>
                </span>
                <span className="cat-card-label">{cat === '' ? t('categoryAll') : t(`category${cap(cat)}`)}</span>
                <span className="cat-card-count" style={active ? { background: color, color: '#fff' } : {}}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search result header */}
        {searching && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 className="mb-0">
              <i className="bi bi-search me-2 text-primary"></i>
              {t('searchResults')}
              <span className="text-muted fs-6"> “{search.trim()}”</span>
              <span className="badge bg-primary-subtle text-primary ms-2">{gridItems.length}</span>
            </h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSearch('')}>
              <i className="bi bi-x-lg me-1"></i>
              {t('clearSearch')}
            </button>
          </div>
        )}

        {/* Menu grid */}
        <div>
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">{t('loadingMenu')}</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger text-center">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {!loading && !error && gridItems.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-3 text-muted">{searching ? t('noSearchResults') : t('noItems')}</p>
            </div>
          )}

          {groupedMenu && menuItems.length > 0 ? (
            groupedMenu.map(({ cat, items }) => {
              const color = CATEGORY_COLORS[cat];
              return (
                <div key={cat} className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span
                      className="cat-dot"
                      style={{ backgroundColor: color, width: 12, height: 12 }}
                    ></span>
                    <h5 className="mb-0 fw-bold">
                      <i className={`bi ${CATEGORY_ICONS[cat]} me-2`} style={{ color }}></i>
                      {t(`category${cap(cat)}`)}
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">{items.length}</span>
                  </div>
                  <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4 g-3 g-lg-4">
                    {items.map((item) => (
                      <div key={item._id} className="col">
                        <MenuItem item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            !loading &&
            !error &&
            gridItems.length > 0 && (
              <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4 g-3 g-lg-4">
                {gridItems.map((item) => (
                  <div key={item._id} className="col">
                    <MenuItem item={item} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-5 pt-4 border-top">
        <div className="row g-4">
          <div className="col-md-4">
            <h6 className="fw-bold mb-2">
              <i className="bi bi-shop me-2 text-danger"></i>
              {lang === 'th' ? RESTAURANT.nameTh : RESTAURANT.nameEn}
            </h6>
            <p className="text-muted small mb-0">
              {lang === 'th' ? RESTAURANT.taglineTh : RESTAURANT.taglineEn}
            </p>
          </div>
          <div className="col-md-4">
            <h6 className="fw-bold mb-2">
              <i className="bi bi-geo-alt me-2 text-danger"></i>
              {t('footerAboutTitle')}
            </h6>
            <p className="mb-1 small">
              <span className="text-muted">{t('footerAddressLabel')}:</span>{' '}
              {RESTAURANT.address}
            </p>
            <p className="mb-0 small">
              <span className="text-muted">{t('footerPhoneLabel')}:</span>{' '}
              <a className="text-decoration-none" href={`tel:${RESTAURANT.phone.replace(/\s/g, '')}`}>
                {RESTAURANT.phone}
              </a>
            </p>
          </div>
          <div className="col-md-2">
            <h6 className="fw-bold mb-2">
              <i className="bi bi-clock me-2 text-danger"></i>
              {t('footerHoursTitle')}
            </h6>
            <p className="small mb-0">
              {lang === 'th' ? RESTAURANT.hoursTh : RESTAURANT.hoursEn}
            </p>
          </div>
          <div className="col-md-2">
            <h6 className="fw-bold mb-2">{t('footerMenuTitle')}</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={scrollToMenu}
                >
                  {t('footerNavOrder')}
                </button>
              </li>
              <li>
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={scrollToMenu}
                >
                  {t('footerNavHow')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-muted small mt-4 border-top pt-3">
          {t('footerCopyright').replace('{year}', String(new Date().getFullYear()))}
        </div>
      </footer>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <Link to="/cart" className="cart-fab" title={t('navCart')}>
          <i className="bi bi-cart3"></i>
          <span className="cart-fab-badge">{totalItems}</span>
        </Link>
      )}
    </div>
  );
}

function HighlightSection({ title, subtitle, icon, items, badge, badgeTone, ranked = false }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  return (
    <section className="mb-4">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <h4 className="mb-0">
            <i className={`bi ${icon} me-2`}></i>
            {title}
          </h4>
          {subtitle && <div className="text-muted small">{subtitle}</div>}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => scroll(-1)} aria-label="scroll left">
            <i className="bi bi-chevron-left"></i>
          </button>
          <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => scroll(1)} aria-label="scroll right">
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
      <div ref={ref} className="d-flex flex-nowrap overflow-auto hl-scroll pb-2 gap-3">
        {items.map((item, i) => (
          <div key={item._id} className="flex-shrink-0" style={{ width: '260px' }}>
            <MenuItem item={item} badge={badge} badgeTone={badgeTone} rank={ranked ? i + 1 : 0} />
          </div>
        ))}
      </div>
    </section>
  );
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { t, lang, toggleLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.startsWith('/admin');
  const isLoggedIn = Boolean(localStorage.getItem('adminToken'));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  if (isAdmin) {
    const [open, setOpen] = useState(false);
    useEffect(() => setOpen(false), [location.pathname]);
    const close = () => setOpen(false);

    const adminLinks = [
      { to: '/admin', icon: 'bi-speedometer2', label: t('dashboard') },
      { to: '/admin/menu', icon: 'bi-card-list', label: t('menuManagement') },
      { to: '/admin/reports', icon: 'bi-bar-chart-line', label: t('salesReports') },
      { to: '/admin/tables', icon: 'bi-grid-3x3-gap', label: t('navTables') },
    ];
    const linkClass = (to) =>
      location.pathname === to ? 'btn-light' : 'btn-outline-light';

    return (
      <nav className="navbar navbar-dark bg-dark sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/admin">
            <i className="bi bi-shop me-2"></i>
            {t('adminName')}
          </Link>

          {/* Hamburger (mobile only) */}
          <button
            className="navbar-toggler d-lg-none border-0"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Desktop inline actions */}
          <div className="d-none d-lg-flex gap-2 align-items-center flex-wrap nav-actions">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={toggleLanguage}
              title={lang === 'th' ? 'English' : 'ภาษาไทย'}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <div className="vr bg-light opacity-25 d-none d-sm-block"></div>
            {adminLinks.map((l) => (
              <Link key={l.to} to={l.to} className={`btn btn-sm ${linkClass(l.to)}`}>
                <i className={`bi ${l.icon} me-1`}></i>
                {l.label}
              </Link>
            ))}
            <Link to="/" className="btn btn-sm btn-outline-warning">
              <i className="bi bi-arrow-left me-1"></i>
              {t('customerView')}
            </Link>
            {isLoggedIn && location.pathname !== '/admin/login' && (
              <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>
                {t('logout')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile collapsible menu */}
        <div className={`d-lg-none ${open ? 'show' : 'collapse'}`}>
          <div className="container d-flex flex-column gap-2 pb-3 pt-2">
            <button
              className="btn btn-sm btn-outline-light align-self-end"
              onClick={toggleLanguage}
              title={lang === 'th' ? 'English' : 'ภาษาไทย'}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            {adminLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`btn d-flex align-items-center text-start ${linkClass(l.to)}`}
                onClick={close}
              >
                <i className={`bi ${l.icon} me-2`}></i>
                {l.label}
              </Link>
            ))}
            <hr className="my-1 border-secondary" />
            <Link
              to="/"
              className="btn btn-outline-warning d-flex align-items-center text-start"
              onClick={close}
            >
              <i className="bi bi-arrow-left me-2"></i>
              {t('customerView')}
            </Link>
            {isLoggedIn && location.pathname !== '/admin/login' && (
              <button
                className="btn btn-outline-danger d-flex align-items-center text-start"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-2"></i>
                {t('logout')}
              </button>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-dark bg-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-shop me-2"></i>
          {t('appName')}
        </Link>
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-sm btn-outline-light ms-auto"
            onClick={toggleLanguage}
            title={lang === 'th' ? 'English' : 'ภาษาไทย'}
          >
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <Link
            to="/cart"
            className={`btn btn-sm position-relative ${
              location.pathname === '/cart' ? 'btn-light' : 'btn-outline-light'
            }`}
          >
            <i className="bi bi-cart3"></i>
            {totalItems > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
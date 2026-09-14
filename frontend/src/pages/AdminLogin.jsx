import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t, lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
      api
        .get('/admin/verify')
        .then(() => navigate('/admin'))
        .catch(() => {
          localStorage.removeItem('adminToken');
        });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError(t('adminPassword'));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/admin/login', { password });
      localStorage.setItem('adminToken', response.data.token);
      navigate('/admin');
    } catch (err) {
      const message = err.response?.data?.message || t('login');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-5 col-lg-4">
        <div className="text-end mb-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={toggleLanguage}>
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
        </div>
        <div className="card shadow-sm mt-1">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <i className="bi bi-shield-lock display-1 text-dark"></i>
              <h3 className="mt-2">{t('adminLogin')}</h3>
              <p className="text-muted">{t('adminLoginHint')}</p>
            </div>

            {error && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label">{t('adminPassword')}</label>
                <input
                  type="password"
                  className="form-control form-control-lg text-center"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'th' ? 'ป้อนรหัสผ่าน' : 'Enter password'}
                  autoFocus
                />
                <small className="text-muted">Demo password: admin123</small>
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-dark btn-lg" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {t('loggingIn')}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      {t('login')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
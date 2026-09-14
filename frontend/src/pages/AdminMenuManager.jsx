import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const categoryOptions = [
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'main', label: 'Main Course' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
  { value: 'side', label: 'Side' },
];

const CATEGORY_ICONS = {
  appetizer: 'bi-egg-fried',
  main: 'bi-basket3',
  dessert: 'bi-cake2',
  drink: 'bi-cup-straw',
  side: 'bi-nut',
};

const CATEGORY_COLORS = {
  appetizer: '#fd7e14',
  main: '#0d6efd',
  dessert: '#d63384',
  drink: '#0dcaf0',
  side: '#6f42c1',
};

const emptyForm = {
  name: '',
  nameTh: '',
  description: '',
  descriptionTh: '',
  price: '',
  category: 'main',
  imageUrl: '',
  available: true,
  featured: false,
};

export default function AdminMenuManager() {
  const navigate = useNavigate();
  const { t, lang, getName, getDesc, categoryLabel, formatPrice } = useLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // List controls
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('table');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.get('/menu/admin/all');
      setMenuItems(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    clearFileState();
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      nameTh: item.nameTh || '',
      description: item.description || '',
      descriptionTh: item.descriptionTh || '',
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || '',
      available: item.available,
      featured: item.featured,
    });
    clearFileState();
    setError('');
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError(t('imageInvalid'));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
  };

  const clearFileState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if ((!form.name.trim() && !form.nameTh.trim()) || !form.price || form.price <= 0) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อและราคาให้ถูกต้อง' : 'Please fill in valid name and price');
      return;
    }

    try {
      setSaving(true);

      if (selectedFile) {
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('nameTh', form.nameTh.trim());
        fd.append('description', form.description.trim());
        fd.append('descriptionTh', form.descriptionTh.trim());
        fd.append('price', Number(form.price));
        fd.append('category', form.category);
        fd.append('available', form.available);
        fd.append('featured', form.featured);
        fd.append('image', selectedFile);

        if (editingItem) {
          await api.put(`/menu/admin/${editingItem._id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/menu/admin', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        const data = {
          name: form.name.trim(),
          nameTh: form.nameTh.trim(),
          description: form.description.trim(),
          descriptionTh: form.descriptionTh.trim(),
          price: Number(form.price),
          category: form.category,
          imageUrl: removeImage ? '' : form.imageUrl.trim(),
          available: form.available,
          featured: form.featured,
        };

        if (editingItem) {
          await api.put(`/menu/admin/${editingItem._id}`, data);
        } else {
          await api.post('/menu/admin', data);
        }
      }

      setShowModal(false);
      clearFileState();
      await fetchMenu();
      showToast(t('toastSavedMenu'));
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.join(', ') ||
        (lang === 'th' ? 'ไม่สามารถบันทึกเมนูได้' : 'Failed to save menu item');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/menu/admin/${confirmDelete._id}`);
      await fetchMenu();
      setConfirmDelete(null);
      showToast(t('toastDeletedMenu'));
    } catch (err) {
      alert(lang === 'th' ? 'ลบเมนูไม่สำเร็จ' : 'Failed to delete menu item');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.put(`/menu/admin/${item._id}`, { available: !item.available });
      await fetchMenu();
      showToast(t('toastToggleStatus'));
    } catch (err) {
      alert(lang === 'th' ? 'อัปเดตสถานะไม่สำเร็จ' : 'Failed to update availability');
    }
  };

  const handleToggleFeatured = async (item) => {
    try {
      await api.put(`/menu/admin/${item._id}`, { featured: !item.featured });
      await fetchMenu();
      showToast(t('toastToggleFeature'));
    } catch (err) {
      alert(lang === 'th' ? 'อัปเดตเมนูแนะนำไม่สำเร็จ' : 'Failed to update featured');
    }
  };

  // ---- Derived lists ----------------------------------------------------
  const counts = useMemo(() => {
    const m = {};
    const f = { featured: 0, available: 0 };
    menuItems.forEach((i) => {
      m[i.category] = (m[i.category] || 0) + 1;
      m[''] = (m[''] || 0) + 1;
      if (i.featured) f.featured += 1;
      if (i.available) f.available += 1;
    });
    return { byCategory: m, flags: f };
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((i) => {
      if (filterCat && i.category !== filterCat) return false;
      if (filterStatus === 'available' && !i.available) return false;
      if (filterStatus === 'unavailable' && i.available) return false;
      if (q && !`${i.name || ''} ${i.nameTh || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, filterCat, filterStatus, search]);

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
            <i className="bi bi-card-list text-primary me-2"></i>
            {t('menuManagement')}
          </h4>
          <div className="text-muted small">
            <span className="badge bg-primary-subtle text-primary rounded-pill me-2">
              <i className="bi bi-basket2 me-1"></i>
              {menuItems.length} {t('itemsCount')}
            </span>
            <span className="badge bg-warning-subtle text-warning rounded-pill me-2">
              <i className="bi bi-star-fill me-1"></i>
              {counts.flags.featured} {t('featuredBadge')}
            </span>
            <span className="badge bg-success-subtle text-success rounded-pill">
              <i className="bi bi-check-circle me-1"></i>
              {counts.flags.available} {t('available')}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg me-2"></i>
          {t('addNewItem')}
        </button>
      </div>

      {/* Toolbar: search + filters + view toggle */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="input-group input-group-sm toolbar-search">
          <span className="input-group-text bg-white">
            <i className="bi bi-search"></i>
          </span>
          <input
            className="form-control"
            style={{ boxShadow: 'none' }}
            placeholder={t('searchMenu')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group btn-group-sm" role="group">
            <button
              className={`btn ${filterStatus === '' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterStatus('')}
            >
              {t('categoryAll')}
            </button>
            <button
              className={`btn ${filterStatus === 'available' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterStatus((s) => (s === 'available' ? '' : 'available'))}
            >
              {t('available')}
            </button>
            <button
              className={`btn ${filterStatus === 'unavailable' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterStatus((s) => (s === 'unavailable' ? '' : 'unavailable'))}
            >
              {t('unavailable')}
            </button>
          </div>

          <div className="btn-group btn-group-sm" role="group" aria-label="view">
            <button
              className={`btn ${view === 'table' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setView('table')}
              title={t('viewTable')}
            >
              <i className="bi bi-list-ul"></i>
            </button>
            <button
              className={`btn ${view === 'grid' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setView('grid')}
              title={t('viewGrid')}
            >
              <i className="bi bi-grid-3x3-gap-fill"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {['', ...categoryOptions.map((c) => c.value)].map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm rounded-pill ${filterCat === cat ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilterCat((c) => (c === cat ? '' : cat))}
          >
            <i className={`bi ${CATEGORY_ICONS[cat] || 'bi-grid-3x3-gap-fill'} me-1`}></i>
            {cat === '' ? t('categoryAll') : categoryLabel(cat)}
            <span className={`badge ms-1 ${filterCat === cat ? 'bg-white text-primary' : 'bg-primary-subtle text-primary'}`}>
              {counts.byCategory[cat] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Result count */}
      <div className="text-muted small mb-2">
        <i className="bi bi-info-circle me-1"></i>
        {t('itemsFound').replace('%count%', filteredItems.length)}
      </div>

      {/* List / grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-1 text-muted"></i>
          <p className="mt-3 text-muted">
            {lang === 'th' ? 'ไม่พบเมนูที่ตรงกับเงื่อนไข' : 'No menu items match your filters'}
          </p>
        </div>
      ) : view === 'table' ? (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '70px' }}>{t('image')}</th>
                <th>{t('name')}</th>
                <th>{t('category')}</th>
                <th className="text-end">{t('price')}</th>
                <th className="text-center" style={{ width: '70px' }}>{t('featured')}</th>
                <th className="text-center" style={{ width: '70px' }}>{t('status')}</th>
                <th className="text-end" style={{ width: '150px' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id} className={item.available ? '' : 'table-light opacity-75'}>
                  <td>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={getName(item)}
                        loading="lazy"
                        className="rounded"
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <div
                        className="bg-light rounded d-flex align-items-center justify-content-center"
                        style={{ width: '50px', height: '50px' }}
                      >
                        <i className="bi bi-image text-muted"></i>
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{item.nameTh || item.name}</strong>
                    <div className="text-muted small">{item.nameTh && item.name && item.nameTh !== item.name ? item.name : ''}</div>
                    {getDesc(item) && (
                      <div className="text-muted small">
                        {getDesc(item).substring(0, 50)}
                        {getDesc(item).length > 50 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[item.category]}22`,
                        color: CATEGORY_COLORS[item.category] || '#6c757d',
                        fontWeight: 600,
                      }}
                    >
                      {categoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="text-end fw-bold">{formatPrice(item.price)}</td>
                  <td className="text-center">
                    <button
                      className={`btn btn-sm ${item.featured ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => handleToggleFeatured(item)}
                      title={t('featured')}
                    >
                      <i className="bi bi-star-fill"></i>
                    </button>
                  </td>
                  <td className="text-center">
                    <div className="form-check form-switch d-inline-block">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={item.available}
                        onChange={() => handleToggleAvailability(item)}
                        title={item.available ? t('available') : t('unavailable')}
                      />
                    </div>
                    <div className={`small ${item.available ? 'text-success' : 'text-danger'}`}>
                      {item.available ? t('available') : t('unavailable')}
                    </div>
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={() => handleOpenEdit(item)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-outline-danger" onClick={() => setConfirmDelete(item)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-3">
          {filteredItems.map((item) => (
            <div key={item._id} className="col">
              <div className={`card h-100 shadow-sm menu-item-card border-0 ${item.available ? '' : 'opacity-75'}`}>
                <div className="position-relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={getName(item)}
                      loading="lazy"
                      className="card-img-top"
                      style={{ height: '130px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <div
                      className="bg-light d-flex align-items-center justify-content-center text-muted"
                      style={{ height: '130px' }}
                    >
                      <i className="bi bi-image fs-3"></i>
                    </div>
                  )}
                  <span
                    className={`position-absolute top-0 start-0 m-2 badge ${item.available ? 'bg-success' : 'bg-danger'}`}
                  >
                    {item.available ? t('available') : t('unavailable')}
                  </span>
                  {item.featured && (
                    <span className="position-absolute top-0 end-0 m-2 badge bg-warning text-dark">
                      <i className="bi bi-star-fill me-1"></i>{t('featuredBadge')}
                    </span>
                  )}
                </div>
                <div className="card-body d-flex flex-column py-2">
                  <h6 className="card-title mb-1 clamp-1">{item.nameTh || item.name}</h6>
                  <div className="small text-muted clamp-1 mb-2">
                    {item.nameTh && item.name && item.nameTh !== item.name ? item.name : (getDesc(item) || '')}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <span className="fw-bold text-primary">{formatPrice(item.price)}</span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[item.category]}22`,
                        color: CATEGORY_COLORS[item.category] || '#6c757d',
                        fontWeight: 600,
                      }}
                    >
                      {categoryLabel(item.category)}
                    </span>
                  </div>
                </div>
                <div className="card-footer bg-white d-flex gap-2 border-top-0 pt-0">
                  <button className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => handleOpenEdit(item)}>
                    <i className="bi bi-pencil me-1"></i>{t('editItem')}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete(item)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingItem ? t('editItem') : t('addItem')}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          {t('nameTH')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.nameTh}
                          onChange={(e) => setForm((prev) => ({ ...prev, nameTh: e.target.value }))}
                          placeholder={lang === 'th' ? 'ชื่อเมนูภาษาไทย' : 'Thai name'}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">{t('nameEN')}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="English name"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">{t('descTH')}</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={form.descriptionTh}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, descriptionTh: e.target.value }))
                          }
                        ></textarea>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">{t('descEN')}</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={form.description}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          {t('price')} (THB) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.price}
                          onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                          min="0"
                          step="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">{t('category')}</label>
                        <select
                          className="form-select"
                          value={form.category}
                          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        >
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {categoryLabel(opt.value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Image upload */}
                  <div className="mb-3">
                    <label className="form-label">{t('uploadImage')}</label>
                    <div className="d-flex align-items-start gap-3 flex-wrap">
                      {selectedFile || (!removeImage && form.imageUrl) ? (
                        <div className="position-relative">
                          <img
                            src={selectedFile ? previewUrl : form.imageUrl}
                            alt="Preview"
                            className="rounded border"
                            style={{ width: 120, height: 120, objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.visibility = 'hidden';
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger rounded-circle position-absolute top-0 end-0"
                            style={{ transform: 'translate(30%, -30%)' }}
                            onClick={handleRemoveImage}
                            title={t('removeImage')}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="bg-light border rounded d-flex align-items-center justify-content-center text-muted"
                          style={{ width: 120, height: 120 }}
                        >
                          <i className="bi bi-image fs-3"></i>
                        </div>
                      )}
                      <div>
                        <label className="btn btn-outline-primary mb-1" style={{ cursor: 'pointer' }}>
                          <i className="bi bi-upload me-1"></i>
                          {selectedFile ? t('replaceImage') : t('chooseImage')}
                          <input type="file" accept="image/*" className="d-none" onChange={handleFileChange} />
                        </label>
                        <div className="small text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          {t('imageHint')}
                        </div>
                        {selectedFile && (
                          <div className="small fw-semibold text-primary">
                            <i className="bi bi-file-earmark-image me-1"></i>
                            {selectedFile.name}
                          </div>
                        )}
                        {!selectedFile && form.imageUrl && !removeImage && (
                          <div className="small text-muted">
                            <i className="bi bi-check2-circle me-1 text-success"></i>
                            {t('keepImage')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={form.available}
                        onChange={(e) => setForm((prev) => ({ ...prev, available: e.target.checked }))}
                      />
                      <label className="form-check-label">{t('availableForOrder')}</label>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                      />
                      <label className="form-check-label">
                        <i className="bi bi-star-fill text-warning me-1"></i>
                        {t('featured')}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {t('saving')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        {editingItem ? t('updateItem') : t('createItem')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                  {t('confirmDeleteTitle')}
                </h5>
                <button className="btn-close" onClick={() => setConfirmDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {t('deleteConfirm').replace('{{name}}', getName(confirmDelete))}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                  {t('cancel')}
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash me-2"></i>
                  {t('deleteBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className={`toast show align-items-center border-0 text-bg-${toast.type}`} role="alert">
            <div className="d-flex">
              <div className="toast-body">
                <i className={`bi ${toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
                {toast.message}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToast(null)}></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
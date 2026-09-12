import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api-client';
import PinRouteMap, { geocode, isWithinMindanao } from './PinRouteMap';
import { validatePhoneNumber, formatPhoneInput } from '../../utils/validation';

export default function CreateRequestModal({
  showCreateModal,
  setShowCreateModal,
  EMPTY_FORM,
  loadData,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [pricingRates, setPricingRates] = useState({
    base_labor_fee: 800,
    distance_rate: 80,
    weight_rate: 1,
  });

  useEffect(() => {
    if (showCreateModal) {
      setForm(EMPTY_FORM);
      setFormError('');
      setErrors({});
      setReceiptPreview(null);

      api.get('/system-settings')
        .then((res) => {
          if (res.data) {
            setPricingRates({
              base_labor_fee: Number(res.data.base_labor_fee) || 800,
              distance_rate: Number(res.data.distance_rate) || 80,
              weight_rate: Number(res.data.weight_rate) || 1,
            });
          }
        })
        .catch((err) => {
          console.error('Failed to fetch pricing rates:', err);
        });
    }
  }, [showCreateModal, EMPTY_FORM]);

  // Auto-calculate Total Price using configured pricing settings
  useEffect(() => {
    const dist = parseFloat(form.distance_km) || 0;
    const wt = parseFloat(form.weight) || 0;
    const labor = Number(pricingRates.base_labor_fee) || 800;
    const distRate = Number(pricingRates.distance_rate) || 80;
    const wtRate = Number(pricingRates.weight_rate) || 1;

    const calcPrice = Math.round((dist * distRate) + labor + (wt * wtRate));
    setForm((prev) => ({ ...prev, total_price: calcPrice }));
  }, [form.distance_km, form.weight, pricingRates]);

  // Auto-dismiss popup error message
  useEffect(() => {
    if (!formError) return;
    const timer = setTimeout(() => {
      setFormError('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [formError]);

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const locateAddress = async (which) => {
    const address = which === 'pickup' ? form.pickup?.address : form.dropoff?.address;
    if (!address || !address.trim()) {
      setErrors((prev) => ({ ...prev, [which]: 'Missing output' }));
      return;
    }
    setLocating(which);
    const coords = await geocode(address);
    setLocating('');
    if (!coords) {
      setFormError(`Couldn't locate "${address}" in Mindanao. Please enter a valid location in Mindanao or click directly on the map.`);
      setErrors((prev) => ({ ...prev, [which]: 'Must be in Mindanao' }));
      return;
    }
    if (!isWithinMindanao(coords.lat, coords.lng)) {
      setFormError(`"${address}" is outside Mindanao! HJY Logistics operates exclusively within the Mindanao region.`);
      setErrors((prev) => ({ ...prev, [which]: 'Outside Mindanao' }));
      return;
    }
    clearFieldError(which);
    setFormError('');
    const point = { ...coords, address };
    if (which === 'pickup') setForm((prev) => ({ ...prev, pickup: point }));
    else setForm((prev) => ({ ...prev, dropoff: point }));
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('Receipt image size exceeds the 10MB limit.');
        return;
      }
      setForm((prev) => ({ ...prev, payment_receipt: file }));
      setReceiptPreview(URL.createObjectURL(file));
      setFormError('');
      clearFieldError('payment_receipt');
    }
  };

  const removeReceipt = () => {
    setForm((prev) => ({ ...prev, payment_receipt: null }));
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  const handlePickupChange = useCallback((point) => {
    setForm((prev) => ({ ...prev, pickup: point }));
    if (point && isWithinMindanao(point.lat, point.lng)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.pickup;
        return next;
      });
    }
  }, []);

  const handleDropoffChange = useCallback((point) => {
    setForm((prev) => ({ ...prev, dropoff: point }));
    if (point && isWithinMindanao(point.lat, point.lng)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.dropoff;
        return next;
      });
    }
  }, []);

  const handleDistanceChange = useCallback((km) => {
    setForm((prev) => (prev.distance_km === km ? prev : { ...prev, distance_km: km }));
  }, []);

  const validateForm = (asDraft) => {
    const newErrors = {};

    // Customer Information
    if (!form.first_name?.trim()) newErrors.first_name = 'Missing output';
    if (!form.last_name?.trim()) newErrors.last_name = 'Missing output';

    if (!form.phone?.trim()) {
      newErrors.phone = 'Missing output';
    } else if (!validatePhoneNumber(form.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!form.email?.trim()) newErrors.email = 'Missing output';
    if (!form.username?.trim()) newErrors.username = 'Missing output';
    if (!form.password?.trim()) newErrors.password = 'Missing output';

    if (!form.confirmPassword?.trim()) {
      newErrors.confirmPassword = 'Missing output';
    } else if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Cargo Information
    if (!form.item_name?.trim()) newErrors.item_name = 'Missing output';
    if (!form.weight || Number(form.weight) <= 0) newErrors.weight = 'Missing output';

    // Location Information
    if (!form.pickup?.address?.trim()) {
      newErrors.pickup = 'Missing output';
    } else if (form.pickup?.lat != null && !isWithinMindanao(form.pickup.lat, form.pickup.lng)) {
      newErrors.pickup = 'Location outside Mindanao';
    }

    if (!form.dropoff?.address?.trim()) {
      newErrors.dropoff = 'Missing output';
    } else if (form.dropoff?.lat != null && !isWithinMindanao(form.dropoff.lat, form.dropoff.lng)) {
      newErrors.dropoff = 'Location outside Mindanao';
    }

    // Bank Details if bank transfer and not a draft
    if (!asDraft && form.payment_method === 'bank_transfer') {
      if (!form.bank_name?.trim()) newErrors.bank_name = 'Missing output';
      if (!form.account_name?.trim()) newErrors.account_name = 'Missing output';
      if (!form.account_number?.trim()) newErrors.account_number = 'Missing output';
      if (!form.payment_receipt) newErrors.payment_receipt = 'Missing output';
    }

    return newErrors;
  };

  const submitRequest = async (asDraft) => {
    const validationErrors = validateForm(asDraft);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.pickup?.includes('Mindanao') || validationErrors.dropoff?.includes('Mindanao')) {
        setFormError('Pick-up and Drop-off locations must be strictly within Mindanao only.');
      } else if (validationErrors.phone === 'Invalid phone number') {
        setFormError('Contact number must start with "09" and be exactly 11 digits (e.g. 09123456789).');
      } else if (validationErrors.confirmPassword === 'Passwords do not match') {
        setFormError('Passwords do not match.');
      } else {
        setFormError('Please fill in all highlighted required fields (missing output).');
      }
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name);
      formData.append('last_name', form.last_name);
      formData.append('phone', form.phone);
      formData.append('email', form.email);
      if (form.username) formData.append('username', form.username);
      formData.append('password', form.password);
      if (form.item_name) formData.append('item_name', form.item_name);
      formData.append('cargo_type', form.cargo_type);
      formData.append('fragility', form.fragility);
      if (form.weight) formData.append('weight', form.weight);
      if (form.pickup?.address) formData.append('pickup_address', form.pickup.address);
      if (form.pickup?.lat != null) formData.append('pickup_lat', form.pickup.lat);
      if (form.pickup?.lng != null) formData.append('pickup_lng', form.pickup.lng);
      if (form.dropoff?.address) formData.append('dropoff_address', form.dropoff.address);
      if (form.dropoff?.lat != null) formData.append('dropoff_lat', form.dropoff.lat);
      if (form.dropoff?.lng != null) formData.append('dropoff_lng', form.dropoff.lng);
      if (form.distance_km) formData.append('distance_km', form.distance_km);
      formData.append('total_price', form.total_price || 0);
      formData.append('payment_term', form.payment_term);
      formData.append('payment_method', form.payment_method);
      if (form.bank_name) formData.append('bank_name', form.bank_name);
      if (form.account_name) formData.append('account_name', form.account_name);
      if (form.account_number) formData.append('account_number', form.account_number);
      if (form.payment_receipt) formData.append('payment_receipt', form.payment_receipt);
      formData.append('is_draft', asDraft ? '1' : '0');

      await api.post('/delivery-requests/create-with-customer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.error('Create request failed:', err.response?.data || err);
      const backendErrors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(backendErrors ? Object.values(backendErrors)[0][0] : message || 'Failed to create request.');
    } finally {
      setSaving(false);
    }
  };

  if (!showCreateModal) return null;

  return (
    <div className="modal create-request-modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}>
      <div className="modal-content create-request-modal-content" style={{ width: '100%', maxWidth: 950, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
        <div className="create-request-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="create-request-title"><i className="fas fa-cube"></i><h2>Create Delivery Request & Customer Setup</h2></div>
          <button className="btn-return" onClick={() => setShowCreateModal(false)}>Return <i className="fas fa-reply"></i></button>
        </div>

        <div className="create-request-body" style={{ padding: 20 }}>
          {/* SweetAlert-style Pop-up Toast */}
          {formError && (
            <div className="sweet-alert-popup">
              <div className="sweet-alert-icon">
                <i className="fas fa-exclamation"></i>
              </div>
              <div className="sweet-alert-body">
                <h4 className="sweet-alert-title">Incomplete Required Fields</h4>
                <p className="sweet-alert-desc">{formError}</p>
              </div>
              <button
                type="button"
                className="sweet-alert-close"
                onClick={() => setFormError('')}
                aria-label="Dismiss alert"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Customer Information */}
          <div className="form-section">
            <h3 className="section-title-form">Customer Information</h3>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>First Name<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input ${errors.first_name ? 'input-error' : ''}`}
                    placeholder={errors.first_name ? 'Missing output' : 'Enter first name'}
                    value={form.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                  {errors.first_name && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.first_name && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.first_name}</div>}
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label>Contact Number<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className={`form-input ${errors.phone ? 'input-error' : ''}`}
                    placeholder={errors.phone ? 'Missing output' : '09xxxxxxxxx'}
                    value={form.phone}
                    maxLength={11}
                    inputMode="numeric"
                    onChange={(e) => {
                      handleInputChange('phone', formatPhoneInput(e.target.value));
                    }}
                    onKeyDown={(e) => {
                      if (
                        !/^\d$/.test(e.key) &&
                        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                        !e.ctrlKey &&
                        !e.metaKey
                      ) {
                        e.preventDefault();
                      }
                    }}
                  />
                  {errors.phone && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.phone && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.phone}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Last Name<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input ${errors.last_name ? 'input-error' : ''}`}
                    placeholder={errors.last_name ? 'Missing output' : 'Enter last name'}
                    value={form.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                  {errors.last_name && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.last_name && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.last_name}</div>}
              </div>
            </div>
          </div>

          {/* Account Setup */}
          <div className="form-section">
            <h3 className="section-title-form">Account Setup</h3>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Email Address<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    placeholder={errors.email ? 'Missing output' : 'name@example.com'}
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                  {errors.email && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.email && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.email}</div>}
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label>Username<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input ${errors.username ? 'input-error' : ''}`}
                    placeholder={errors.username ? 'Missing output' : 'Enter username'}
                    value={form.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                  />
                  {errors.username && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.username && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.username}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group password-group" style={{ position: 'relative' }}>
                <label>Password<span className="required">*</span></label>
                <div className="password-input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                    placeholder={errors.password ? 'Missing output' : 'Enter password'}
                    value={form.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  {errors.password && <span className="input-missing-tag" style={{ right: 38 }}>Missing output</span>}
                  <button type="button" className="btn-toggle-password" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: 10, top: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  </button>
                </div>
                {errors.password && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.password}</div>}
              </div>

              <div className="form-group password-group" style={{ position: 'relative' }}>
                <label>Confirm Password<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder={errors.confirmPassword ? 'Missing output' : 'Confirm password'}
                    value={form.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                  {errors.confirmPassword && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.confirmPassword && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.confirmPassword}</div>}
              </div>
            </div>
          </div>

          <div className="form-row two-column">
            {/* Cargo & Location (Left Column) */}
            <div className="form-section half-width">
              <h3 className="section-title-form">Cargo Information:</h3>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Item Name<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input ${errors.item_name ? 'input-error' : ''}`}
                    placeholder={errors.item_name ? 'Missing output' : 'e.g. Steel Bars, Commercial Rice'}
                    value={form.item_name}
                    onChange={(e) => handleInputChange('item_name', e.target.value)}
                  />
                  {errors.item_name && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.item_name && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.item_name}</div>}
              </div>

              <div className="form-group">
                <label>Cargo Type:</label>
                <select className="form-select" value={form.cargo_type} onChange={(e) => handleInputChange('cargo_type', e.target.value)}>
                  <option>Construction</option><option>Electronics</option><option>Furniture</option><option>Food</option><option>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cargo Fragility:</label>
                <select className="form-select" value={form.fragility} onChange={(e) => handleInputChange('fragility', e.target.value)}>
                  <option value="low">Standard</option><option value="medium">Fragile</option><option value="high">Extremely Fragile</option>
                </select>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label>Cargo Weight (kg)<span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className={`form-input ${errors.weight ? 'input-error' : ''}`}
                    placeholder={errors.weight ? 'Missing output' : 'e.g. 100'}
                    value={form.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  />
                  {errors.weight && <span className="input-missing-tag">Missing output</span>}
                </div>
                {errors.weight && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.weight}</div>}
              </div>

              <h3 className="section-title-form" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Delivery Location:</span>
                <span className="mindanao-lock-badge" style={{ fontSize: 10 }}>
                  <i className="fas fa-lock"></i> Mindanao Only
                </span>
              </h3>

              <div className="form-group location-group" style={{ position: 'relative' }}>
                <label>Pick-up Location (Mindanao)<span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      className={`form-input ${errors.pickup ? 'input-error' : ''}`}
                      placeholder={errors.pickup ? 'Missing output' : 'e.g. Port Area, Cagayan de Oro City'}
                      value={form.pickup?.address || ''}
                      onChange={(e) => {
                        const nextAddr = e.target.value;
                        setForm((prev) => ({ ...prev, pickup: { ...(prev.pickup || {}), address: nextAddr } }));
                        clearFieldError('pickup');
                      }}
                    />
                    {errors.pickup && <span className="input-missing-tag">Missing output</span>}
                  </div>
                  <button type="button" onClick={() => locateAddress('pickup')} disabled={locating === 'pickup'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    {locating === 'pickup' ? '...' : 'Locate'}
                  </button>
                </div>
                {errors.pickup && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.pickup}</div>}
              </div>

              <div className="form-group location-group" style={{ position: 'relative' }}>
                <label>Drop-off Location (Mindanao)<span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      className={`form-input ${errors.dropoff ? 'input-error' : ''}`}
                      placeholder={errors.dropoff ? 'Missing output' : 'e.g. Malaybalay City, Bukidnon'}
                      value={form.dropoff?.address || ''}
                      onChange={(e) => {
                        const nextAddr = e.target.value;
                        setForm((prev) => ({ ...prev, dropoff: { ...(prev.dropoff || {}), address: nextAddr } }));
                        clearFieldError('dropoff');
                      }}
                    />
                    {errors.dropoff && <span className="input-missing-tag">Missing output</span>}
                  </div>
                  <button type="button" onClick={() => locateAddress('dropoff')} disabled={locating === 'dropoff'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    {locating === 'dropoff' ? '...' : 'Locate'}
                  </button>
                </div>
                {errors.dropoff && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.dropoff}</div>}
              </div>

              <PinRouteMap
                pickup={form.pickup}
                dropoff={form.dropoff}
                onPickupChange={handlePickupChange}
                onDropoffChange={handleDropoffChange}
                onDistanceChange={handleDistanceChange}
              />

              <div className="form-group">
                <label>Distance (km)</label>
                <input type="number" className="form-input" value={form.distance_km} onChange={(e) => handleInputChange('distance_km', e.target.value)} placeholder="Auto-calculated from map" />
              </div>
            </div>

            {/* Pricing & Payment (Right Column) */}
            <div className="form-section half-width">
              <h3 className="section-title-form">Pricing:</h3>
              <div className="form-group">
                <label>Total Price (₱)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.total_price ? `₱${Number(form.total_price).toLocaleString('en-PH')}` : `₱${pricingRates.base_labor_fee}`}
                  readOnly
                  style={{ background: '#FFFFFF', fontWeight: 'bold', color: '#1F2937' }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 3, display: 'block' }}>
                  Auto-calculated: ₱{pricingRates.distance_rate}/km + ₱{pricingRates.base_labor_fee} labor fee + ₱{pricingRates.weight_rate}/kg
                </span>
              </div>

              <h3 className="section-title-form">Payment Terms:</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="paymentTerm" checked={form.payment_term === 'downpayment'} onChange={() => handleInputChange('payment_term', 'downpayment')} />
                  <span className="radio-text">Pay Down-payment (50%)</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="paymentTerm" checked={form.payment_term === 'full'} onChange={() => handleInputChange('payment_term', 'full')} />
                  <span className="radio-text">Pay Full-payment</span>
                </label>
              </div>

              <h3 className="section-title-form">Payment Methods:</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="paymentMethod" checked={form.payment_method === 'bank_transfer'} onChange={() => handleInputChange('payment_method', 'bank_transfer')} />
                  <span className="radio-text">Pay Through Bank Transfer</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="paymentMethod" checked={form.payment_method === 'cash'} onChange={() => handleInputChange('payment_method', 'cash')} />
                  <span className="radio-text">Pay in Cash</span>
                </label>
              </div>

              {/* Bank Details Section */}
              {form.payment_method === 'bank_transfer' && (
                <div className="bank-transfer-details" style={{ marginTop: 20, padding: 16, background: '#F4F5F8', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <h4 style={{ color: '#DC2626', fontSize: 15, fontWeight: 700, margin: '0 0 14px 0' }}>
                    Bank Details <span style={{ color: '#DC2626' }}>*</span>
                  </h4>

                  <div className="form-group" style={{ marginBottom: 12, position: 'relative' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Bank Name<span className="required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className={`form-input ${errors.bank_name ? 'input-error' : ''}`}
                        placeholder={errors.bank_name ? 'Missing output' : 'e.g. BDO, BPI, Landbank, GCash'}
                        value={form.bank_name}
                        onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      />
                      {errors.bank_name && <span className="input-missing-tag">Missing output</span>}
                    </div>
                    {errors.bank_name && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.bank_name}</div>}
                  </div>

                  <div className="form-group" style={{ marginBottom: 12, position: 'relative' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Account Name<span className="required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className={`form-input ${errors.account_name ? 'input-error' : ''}`}
                        placeholder={errors.account_name ? 'Missing output' : 'e.g. HJY Trucking Services'}
                        value={form.account_name}
                        onChange={(e) => handleInputChange('account_name', e.target.value)}
                      />
                      {errors.account_name && <span className="input-missing-tag">Missing output</span>}
                    </div>
                    {errors.account_name && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.account_name}</div>}
                  </div>

                  <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Account Number<span className="required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className={`form-input ${errors.account_number ? 'input-error' : ''}`}
                        placeholder={errors.account_number ? 'Missing output' : 'e.g. 1234-5678-9012'}
                        value={form.account_number}
                        onChange={(e) => handleInputChange('account_number', e.target.value)}
                      />
                      {errors.account_number && <span className="input-missing-tag">Missing output</span>}
                    </div>
                    {errors.account_number && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> {errors.account_number}</div>}
                  </div>

                  <div className="form-group" style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Upload Bank Transfer Photo<span className="required">*</span></label>
                    <input type="file" id="bank-receipt-file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />
                    <label
                      htmlFor="bank-receipt-file"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: errors.payment_receipt ? '#FEE2E2' : '#DCE1EB',
                        border: errors.payment_receipt ? '1.5px solid #EF4444' : '1px solid transparent',
                        padding: '10px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        color: errors.payment_receipt ? '#991B1B' : '#273342',
                        boxShadow: errors.payment_receipt ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : 'none',
                      }}
                    >
                      <i className="fas fa-camera"></i> {errors.payment_receipt ? 'Missing output: Upload Bank Receipt' : 'Upload Bank Receipt'}
                    </label>
                    {errors.payment_receipt && <div className="input-error-msg"><i className="fas fa-circle-exclamation"></i> Missing output</div>}

                    {receiptPreview && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                        <img src={receiptPreview} alt="Receipt preview" style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover' }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{form.payment_receipt?.name || 'Receipt image'}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{form.payment_receipt?.size ? `${(form.payment_receipt.size / (1024 * 1024)).toFixed(2)} MB` : 'Attached'}</div>
                        </div>
                        <button type="button" onClick={removeReceipt} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 }} title="Remove receipt">
                          <i className="fas fa-times-circle"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-save-drafts" onClick={() => submitRequest(true)} disabled={saving}>Save to Drafts</button>
            <button className="btn-confirm-request" onClick={() => submitRequest(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

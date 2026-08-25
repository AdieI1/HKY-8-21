import React, { useState, useEffect } from 'react';
import api from '../../api/api-client';
import PinRouteMap, { geocode } from './PinRouteMap';

export default function CreateRequestModal({
  showCreateModal,
  setShowCreateModal,
  EMPTY_FORM,
  loadData,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);

  useEffect(() => {
    if (showCreateModal) {
      setForm(EMPTY_FORM);
      setFormError('');
      setReceiptPreview(null);
    }
  }, [showCreateModal, EMPTY_FORM]);

  // Auto-calculate Total Price: 80 PHP/km + 800 PHP labor + 1 PHP/kg
  useEffect(() => {
    const dist = parseFloat(form.distance_km) || 0;
    const wt = parseFloat(form.weight) || 0;
    const calcPrice = Math.round((dist * 80) + 800 + (wt * 1));
    setForm((prev) => ({ ...prev, total_price: calcPrice }));
  }, [form.distance_km, form.weight]);

  const locateAddress = async (which) => {
    const address = which === 'pickup' ? form.pickup?.address : form.dropoff?.address;
    if (!address) return;
    setLocating(which);
    const coords = await geocode(address);
    setLocating('');
    if (!coords) {
      setFormError(`Couldn't find "${address}" on the map. Try a more specific address, or click the map directly.`);
      return;
    }
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
    }
  };

  const removeReceipt = () => {
    setForm((prev) => ({ ...prev, payment_receipt: null }));
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  const submitRequest = async (asDraft) => {
    if (!form.first_name || !form.last_name || !form.phone || !form.email || !form.password) {
      setFormError('Please fill in all required customer fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!asDraft && form.payment_method === 'bank_transfer') {
      if (!form.bank_name?.trim() || !form.account_name?.trim() || !form.account_number?.trim()) {
        setFormError('Please fill in all Bank Details (Bank Name, Account Name, and Account Number).');
        return;
      }
      if (!form.payment_receipt) {
        setFormError('Please upload the Bank Transfer Receipt photo.');
        return;
      }
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
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(errors ? Object.values(errors)[0][0] : message || 'Failed to create request.');
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
          {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12, background: '#FEE2E2', padding: '10px 14px', borderRadius: 6 }}>{formError}</div>}

          {/* Customer Information */}
          <div className="form-section">
            <h3 className="section-title-form">Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name<span className="required">*</span></label>
                <input type="text" className="form-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contact Number<span className="required">*</span></label>
                <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Last Name<span className="required">*</span></label>
                <input type="text" className="form-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Account Setup */}
          <div className="form-section">
            <h3 className="section-title-form">Account Setup</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address<span className="required">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group password-group">
                <label>Password<span className="required">*</span></label>
                <div className="password-input-wrapper" style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="btn-toggle-password" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: 10, top: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  </button>
                </div>
              </div>
              <div className="form-group password-group">
                <label>Confirm Password<span className="required">*</span></label>
                <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="form-row two-column">
            {/* Cargo & Location (Left Column) */}
            <div className="form-section half-width">
              <h3 className="section-title-form">Cargo Information:</h3>
              <div className="form-group">
                <label>Item Name:</label>
                <input type="text" className="form-input" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Cargo Type:</label>
                <select className="form-select" value={form.cargo_type} onChange={(e) => setForm({ ...form, cargo_type: e.target.value })}>
                  <option>Construction</option><option>Electronics</option><option>Furniture</option><option>Food</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cargo Fragility:</label>
                <select className="form-select" value={form.fragility} onChange={(e) => setForm({ ...form, fragility: e.target.value })}>
                  <option value="low">Standard</option><option value="medium">Fragile</option><option value="high">Extremely Fragile</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cargo Weight (kg):</label>
                <input type="number" className="form-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 100" />
              </div>

              <h3 className="section-title-form">Delivery Location:</h3>
              <div className="form-group location-group">
                <label>Pick-up Location</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" className="form-input" placeholder="e.g. Port Area, Cagayan de Oro City" value={form.pickup?.address || ''} onChange={(e) => setForm({ ...form, pickup: { ...(form.pickup || {}), address: e.target.value } })} />
                  <button type="button" onClick={() => locateAddress('pickup')} disabled={locating === 'pickup'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>{locating === 'pickup' ? '...' : 'Locate'}</button>
                </div>
              </div>
              <div className="form-group location-group">
                <label>Drop-off Location</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" className="form-input" placeholder="e.g. Malaybalay City, Bukidnon" value={form.dropoff?.address || ''} onChange={(e) => setForm({ ...form, dropoff: { ...(form.dropoff || {}), address: e.target.value } })} />
                  <button type="button" onClick={() => locateAddress('dropoff')} disabled={locating === 'dropoff'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>{locating === 'dropoff' ? '...' : 'Locate'}</button>
                </div>
              </div>

              <PinRouteMap
                pickup={form.pickup}
                dropoff={form.dropoff}
                onPickupChange={(point) => setForm((prev) => ({ ...prev, pickup: point }))}
                onDropoffChange={(point) => setForm((prev) => ({ ...prev, dropoff: point }))}
                onDistanceChange={(km) => setForm((prev) => ({ ...prev, distance_km: km }))}
              />

              <div className="form-group">
                <label>Distance (km)</label>
                <input type="number" className="form-input" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} placeholder="Auto-calculated from map" />
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
                  value={form.total_price ? `₱${Number(form.total_price).toLocaleString('en-PH')}` : '₱800'}
                  readOnly
                  style={{ background: '#D9DDE5', fontWeight: 'bold', color: '#1F2937' }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 3, display: 'block' }}>
                  Auto-calculated: ₱80/km + ₱800 labor fee + ₱1/kg
                </span>
              </div>

              <h3 className="section-title-form">Payment Terms:</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="paymentTerm" checked={form.payment_term === 'downpayment'} onChange={() => setForm({ ...form, payment_term: 'downpayment' })} />
                  <span className="radio-text">Pay Down-payment (50%)</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="paymentTerm" checked={form.payment_term === 'full'} onChange={() => setForm({ ...form, payment_term: 'full' })} />
                  <span className="radio-text">Pay Full-payment</span>
                </label>
              </div>

              <h3 className="section-title-form">Payment Methods:</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="paymentMethod" checked={form.payment_method === 'bank_transfer'} onChange={() => setForm({ ...form, payment_method: 'bank_transfer' })} />
                  <span className="radio-text">Pay Through Bank Transfer</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="paymentMethod" checked={form.payment_method === 'cash'} onChange={() => setForm({ ...form, payment_method: 'cash' })} />
                  <span className="radio-text">Pay in Cash</span>
                </label>
              </div>

              {/* Bank Details Section in Blank Area Below Payment Methods */}
              {form.payment_method === 'bank_transfer' && (
                <div className="bank-transfer-details" style={{ marginTop: 20, padding: 16, background: '#F4F5F8', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <h4 style={{ color: '#DC2626', fontSize: 15, fontWeight: 700, margin: '0 0 14px 0' }}>
                    Bank Details <span style={{ color: '#DC2626' }}>*</span>
                  </h4>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Bank Name<span className="required">*</span></label>
                    <input type="text" className="form-input" placeholder="e.g. BDO, BPI, Landbank, GCash" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Account Name<span className="required">*</span></label>
                    <input type="text" className="form-input" placeholder="e.g. HJY Trucking Services" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Account Number<span className="required">*</span></label>
                    <input type="text" className="form-input" placeholder="e.g. 1234-5678-9012" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Upload Bank Transfer Photo<span className="required">*</span></label>
                    <input type="file" id="bank-receipt-file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />
                    <label htmlFor="bank-receipt-file" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#DCE1EB', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#273342' }}>
                      <i className="fas fa-camera"></i> Upload Bank Receipt
                    </label>

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

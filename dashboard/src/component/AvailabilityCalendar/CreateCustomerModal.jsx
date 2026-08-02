import React, { useState, useEffect } from "react";
import { createCustomer } from "../../services/api";

const CreateCustomerModal = ({ isOpen, onClose, onCustomerCreated, addToast, initialName = "" }) => {
  const [formData, setFormData] = useState({
    customer_name: initialName,
    customer_type: "Individual",
    mobile_no: "",
    email_id: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, customer_name: initialName }));
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.mobile_no || !formData.customer_type) {
      addToast("Please fill all required fields", "warning");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newCustomer = await createCustomer(formData);
      addToast("Customer created successfully!", "success");
      onCustomerCreated(newCustomer);
    } catch (error) {
      const msg = error.message || "Failed to create customer";
      // Ensure error is a string
      const displayMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;
      addToast(displayMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-[60]">
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5 border-b pb-3 border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Create Customer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Customer Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                  <select name="customer_type" value={formData.customer_type} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="Individual">Individual</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
                  <input required type="text" name="mobile_no" value={formData.mobile_no} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email_id" value={formData.email_id} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Address (Optional)</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                  <input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                  <input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              {isSubmitting ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomerModal;

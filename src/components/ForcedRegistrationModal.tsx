import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';

export default function ForcedRegistrationModal() {
  const { user, updateUserProfile } = useApp();
  const [formData, setFormData] = useState({
    realName: '',
    lastName: '',
    fiscalCode: '',
    country: '',
    day: '',
    month: '',
    year: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is not loaded, or they already have these filled.
  if (!user || (user.realName && user.lastName && user.fiscalCode && user.country && user.birthDate)) {
    return null;
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (!formData.day || !formData.month || !formData.year) {
      setError('Please select your complete date of birth.');
      return;
    }

    const today = new Date();
    const birthDate = new Date(Number(formData.year), Number(formData.month) - 1, Number(formData.day));
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('You must be at least 18 years old to register.');
      return;
    }

    if (formData.realName && formData.lastName && formData.fiscalCode && formData.country) {
      setIsSubmitting(true);
      try {
        await updateUserProfile({
          realName: formData.realName,
          lastName: formData.lastName,
          fiscalCode: formData.fiscalCode,
          country: formData.country,
          birthDate: `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
        });
        // On success, the state updates and the component will unmount
      } catch (err: any) {
        setError(err.message || 'Failed to update profile. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      setError('Please fill in all required fields.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
      <div className="relative glass p-8 rounded-3xl w-full max-w-md border-white/10 z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="mb-8">
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-2">Registration Required</h2>
          <p className="text-sm text-slate-400">Please provide your real identity details. These will be permanently locked after submission.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">First Name *</label>
            <input 
              required
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
              value={formData.realName}
              onChange={e => setFormData({...formData, realName: e.target.value})}
              placeholder="e.g. John"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Last Name *</label>
            <input 
              required
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
              value={formData.lastName}
              onChange={e => setFormData({...formData, lastName: e.target.value})}
              placeholder="e.g. Doe"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">International Fiscal Code *</label>
            <input 
              required
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
              value={formData.fiscalCode}
              onChange={e => setFormData({...formData, fiscalCode: e.target.value})}
              placeholder="Your fiscal identification"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Country *</label>
            <input 
              required
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
              value={formData.country}
              onChange={e => setFormData({...formData, country: e.target.value})}
              placeholder="e.g. United Kingdom"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Date of Birth *</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                required
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors appearance-none"
                value={formData.day}
                onChange={e => setFormData({...formData, day: e.target.value})}
              >
                <option value="" disabled>Day</option>
                {days.map(d => <option key={d} value={String(d)}>{d}</option>)}
              </select>
              <select
                required
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors appearance-none"
                value={formData.month}
                onChange={e => setFormData({...formData, month: e.target.value})}
              >
                <option value="" disabled>Month</option>
                {months.map(m => <option key={m.value} value={String(m.value)}>{m.label}</option>)}
              </select>
              <select
                required
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors appearance-none"
                value={formData.year}
                onChange={e => setFormData({...formData, year: e.target.value})}
              >
                <option value="" disabled>Year</option>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-6 py-4 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-azure/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Securing...' : 'Secure Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

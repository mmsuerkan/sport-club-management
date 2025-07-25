'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, DollarSign } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { RecurringExpenseService, RecurringExpense } from '@/lib/firebase/recurring-expense-service';
import { recurringExpenseCategories } from '@/lib/categories';
import BasicModal from '@/components/modal';
import ModalTitle from '@/components/modal-title';

interface Branch {
  id: string;
  name: string;
}

interface RecurringExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: RecurringExpense | null;
  onSave: () => void;
}

export default function RecurringExpenseForm({ 
  isOpen, 
  onClose, 
  editingExpense, 
  onSave 
}: RecurringExpenseFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: 0,
    frequency: 'monthly' as 'monthly' | 'yearly',
    startDate: '',
    endDate: '',
    branchId: '',
    description: '',
    isActive: true,
    hasEndDate: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        name: editingExpense.name,
        category: editingExpense.category,
        amount: editingExpense.amount,
        frequency: editingExpense.frequency,
        startDate: editingExpense.startDate.toISOString().split('T')[0],
        endDate: editingExpense.endDate ? editingExpense.endDate.toISOString().split('T')[0] : '',
        branchId: editingExpense.branchId,
        description: editingExpense.description,
        isActive: editingExpense.isActive,
        hasEndDate: !!editingExpense.endDate
      });
    } else {
      resetForm();
    }
  }, [editingExpense, isOpen]);

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Branch[];
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      amount: 0,
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      branchId: '',
      description: '',
      isActive: true,
      hasEndDate: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category || !formData.branchId || formData.amount <= 0) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      
      const expenseData = {
        name: formData.name.trim(),
        category: formData.category,
        amount: formData.amount,
        frequency: formData.frequency,
        startDate: new Date(formData.startDate),
        endDate: formData.hasEndDate && formData.endDate ? new Date(formData.endDate) : undefined,
        branchId: formData.branchId,
        branchName: selectedBranch?.name || '',
        description: formData.description.trim(),
        isActive: formData.isActive
      };

      if (editingExpense) {
        await RecurringExpenseService.updateRecurringExpense(editingExpense.id!, expenseData);
      } else {
        await RecurringExpenseService.createRecurringExpense(expenseData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving recurring expense:', error);
      alert('Sabit gider kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getYearlyEquivalent = () => {
    if (formData.frequency === 'monthly') {
      return formData.amount * 12;
    }
    return formData.amount;
  };

  const getMonthlyEquivalent = () => {
    if (formData.frequency === 'yearly') {
      return formData.amount / 12;
    }
    return formData.amount;
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <BasicModal className='max-w-2xl' open={isOpen} onClose={onClose}>
      <ModalTitle
        modalTitle={editingExpense ? 'Sabit Gider Düzenle' : 'Yeni Sabit Gider Ekle'}
        onClose={onClose}
      />
      
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gider Adı */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gider Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="örn: Antrenör Maaşı - Ahmet Hoca"
              required
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Kategori seçiniz</option>
              {recurringExpenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Şube */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şube *
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Şube seçiniz</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tutar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tutar (₺) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Frekans */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frekans *
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'monthly' | 'yearly' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="monthly">Aylık</option>
              <option value="yearly">Yıllık</option>
            </select>
          </div>

          {/* Başlangıç Tarihi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Bitiş Tarihi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasEndDate"
                  checked={formData.hasEndDate}
                  onChange={(e) => setFormData({ ...formData, hasEndDate: e.target.checked, endDate: e.target.checked ? formData.endDate : '' })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="hasEndDate" className="ml-2 block text-sm text-gray-700">
                  Bitiş tarihi belirle
                </label>
              </div>
              {formData.hasEndDate && (
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  min={formData.startDate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={2}
            placeholder="Gider hakkında ek bilgiler..."
          />
        </div>

        {/* Durum */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
            Aktif (Otomatik işlemler için)
          </label>
        </div>

        {/* Özet Bilgiler */}
        {formData.amount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">💰 Maliyet Özeti</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">
                  {formData.frequency === 'monthly' ? 'Aylık' : 'Yıllık'} Tutar:
                </span>
                <div className="font-semibold text-green-700">
                  {formatCurrency(formData.amount)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">
                  {formData.frequency === 'monthly' ? 'Yıllık' : 'Aylık'} Karşılığı:
                </span>
                <div className="font-semibold text-green-700">
                  {formatCurrency(formData.frequency === 'monthly' ? getYearlyEquivalent() : getMonthlyEquivalent())}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Kaydediliyor...' : (editingExpense ? 'Güncelle' : 'Kaydet')}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            İptal
          </button>
        </div>
      </form>
    </BasicModal>,
    document.body
  ) : null;
}
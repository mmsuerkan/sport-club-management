'use client';

import { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { FinancialTransaction, FinancialCategory } from '@/lib/firebase/finance-service';
import { paymentMethods, transactionStatuses, transactionTypes } from '@/lib/firebase/finance-categories';
import { Timestamp } from 'firebase/firestore';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'clubId' | 'createdBy'>) => Promise<{ success: boolean; error?: string }>;
  categories: FinancialCategory[];
  editTransaction?: FinancialTransaction | null;
  loading?: boolean;
}

export function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  categories,
  editTransaction,
  loading = false
}: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer' | 'check',
    status: 'completed' as 'pending' | 'completed' | 'cancelled',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    tags: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes or edit transaction changes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        // Convert Timestamp to date string
        const dateStr = editTransaction.date instanceof Timestamp 
          ? editTransaction.date.toDate().toISOString().split('T')[0]
          : new Date(editTransaction.date).toISOString().split('T')[0];

        setFormData({
          type: editTransaction.type,
          amount: editTransaction.amount.toString(),
          description: editTransaction.description,
          category: editTransaction.category,
          paymentMethod: editTransaction.paymentMethod,
          status: editTransaction.status,
          date: dateStr,
          reference: editTransaction.reference || '',
          tags: editTransaction.tags?.join(', ') || ''
        });
      } else {
        setFormData({
          type: 'income',
          amount: '',
          description: '',
          category: '',
          paymentMethod: 'cash',
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          reference: '',
          tags: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editTransaction]);

  // Get filtered categories based on selected type
  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Geçerli bir tutar giriniz';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama zorunludur';
    }

    if (!formData.category) {
      newErrors.category = 'Kategori seçiniz';
    }

    if (!formData.date) {
      newErrors.date = 'Tarih seçiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const transactionData: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'clubId' | 'createdBy'> = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        date: Timestamp.fromDate(new Date(formData.date)),
        reference: formData.reference.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      const result = await onSubmit(transactionData);
      
      if (result.success) {
        onClose();
      } else {
        setErrors({ submit: result.error || 'İşlem kaydedilemedi' });
      }
    } catch (error) {
      setErrors({ submit: 'Beklenmeyen bir hata oluştu' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşlem Türü
            </label>
            <div className="grid grid-cols-2 gap-3">
              {transactionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value as 'income' | 'expense', category: '' }))}
                  className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                    formData.type === type.value
                      ? type.color === 'green'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tutar (₺)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="İşlem açıklaması"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Kategori seçiniz</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ödeme Yöntemi
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {transactionStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarih
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          </div>

          {/* Reference & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referans No (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Fatura no, referans vb."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiketler (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="etiket1, etiket2"
              />
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
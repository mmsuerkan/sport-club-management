'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { BudgetService, Budget } from '@/lib/firebase/budget-service';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budget?: Budget | null;
  mode: 'create' | 'edit';
}

export default function BudgetForm({ isOpen, onClose, onSuccess, budget, mode }: BudgetFormProps) {
  const [formData, setFormData] = useState({
    category: budget?.category || '',
    plannedAmount: budget?.plannedAmount || 0,
    period: budget?.period || 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: budget?.startDate ? budget.startDate.toISOString().split('T')[0] : '',
    endDate: budget?.endDate ? budget.endDate.toISOString().split('T')[0] : '',
    description: budget?.description || '',
    tags: budget?.tags?.join(', ') || ''
  });

  const [useCustomDates, setUseCustomDates] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Kategori gereklidir';
    }

    if (formData.plannedAmount <= 0) {
      newErrors.plannedAmount = 'Planlanan tutar 0\'dan büyük olmalıdır';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Başlangıç tarihi gereklidir';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi gereklidir';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const budgetData = {
        category: formData.category.trim(),
        plannedAmount: formData.plannedAmount,
        period: formData.period,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        description: formData.description.trim(),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        createdBy: 'current-user' // TODO: Replace with actual user ID
      };

      if (mode === 'create') {
        // Check for overlapping budgets
        const existingBudgets = await BudgetService.getBudgets();
        const overlappingBudget = existingBudgets.find(existing => 
          existing.category === budgetData.category &&
          existing.status !== 'completed' &&
          (
            // New budget starts during existing budget period
            (budgetData.startDate >= existing.startDate && budgetData.startDate <= existing.endDate) ||
            // New budget ends during existing budget period
            (budgetData.endDate >= existing.startDate && budgetData.endDate <= existing.endDate) ||
            // New budget completely contains existing budget
            (budgetData.startDate <= existing.startDate && budgetData.endDate >= existing.endDate)
          )
        );

        if (overlappingBudget) {
          const confirm = window.confirm(
            `Dikkat! ${budgetData.category} kategorisinde \u00e7akışan bir bütçe var:\n\n` +
            `Mevcut Bütçe: ${overlappingBudget.startDate.toLocaleDateString('tr-TR')} - ${overlappingBudget.endDate.toLocaleDateString('tr-TR')}\n` +
            `Planlanan: ${overlappingBudget.plannedAmount.toLocaleString('tr-TR')} ₺\n` +
            `Harcanan: ${overlappingBudget.spentAmount.toLocaleString('tr-TR')} ₺\n\n` +
            `Yine de devam etmek istiyor musunuz?`
          );

          if (!confirm) {
            setLoading(false);
            return;
          }
        }

        await BudgetService.createBudget(budgetData);
      } else if (mode === 'edit' && budget?.id) {
        await BudgetService.updateBudget(budget.id, budgetData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving budget:', error);
      setErrors({ submit: 'Bütçe kaydedilirken hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate dates based on period
  const calculateDatesFromPeriod = (period: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'monthly':
        // Current month
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth + 1, 0); // Last day of month
        break;
      case 'quarterly':
        // Current quarter
        const currentQuarter = Math.floor(currentMonth / 3);
        startDate = new Date(currentYear, currentQuarter * 3, 1);
        endDate = new Date(currentYear, (currentQuarter + 1) * 3, 0);
        break;
      case 'yearly':
        // Current year
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31);
        break;
      default:
        startDate = today;
        endDate = today;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Update dates when period changes (only if not using custom dates)
  useEffect(() => {
    if (!useCustomDates && !budget) {
      const dates = calculateDatesFromPeriod(formData.period);
      setFormData(prev => ({ ...prev, ...dates }));
    }
  }, [formData.period, useCustomDates, budget]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const predefinedCategories = [
    'Antrenör Ücretleri',
    'Ekipman',
    'Tesis Bakım',
    'Utilities',
    'Marketing',
    'Turnuva/Organizasyon',
    'Sağlık/Sigorta',
    'Ulaşım',
    'Beslenme',
    'Diğer'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center mt-0 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Yeni Bütçe Oluştur' : 'Bütçe Düzenle'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} className="inline mr-1" />
              Kategori *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Kategori seçin</option>
              {predefinedCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Planned Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign size={16} className="inline mr-1" />
              Planlanan Tutar (₺) *
            </label>
            <input
              type="number"
              value={formData.plannedAmount}
              onChange={(e) => handleInputChange('plannedAmount', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.plannedAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.plannedAmount && (
              <p className="text-red-500 text-sm mt-1">{errors.plannedAmount}</p>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Dönem *
            </label>
            <select
              value={formData.period}
              onChange={(e) => handleInputChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={useCustomDates}
            >
              <option value="monthly">Aylık</option>
              <option value="quarterly">Üç Aylık</option>
              <option value="yearly">Yıllık</option>
            </select>
          </div>

          {/* Custom Date Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="customDates"
              checked={useCustomDates}
              onChange={(e) => setUseCustomDates(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="customDates" className="ml-2 block text-sm text-gray-700">
              Özel tarih aralığı kullan
            </label>
          </div>

          {/* Date Range - Show calculated dates or allow editing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                } ${!useCustomDates ? 'bg-gray-50' : ''}`}
                readOnly={!useCustomDates}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                } ${!useCustomDates ? 'bg-gray-50' : ''}`}
                readOnly={!useCustomDates}
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>
          {!useCustomDates && (
            <p className="text-sm text-gray-500 -mt-2">
              Tarihler seçilen döneme göre otomatik hesaplanır
            </p>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="inline mr-1" />
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
              placeholder="Bütçe hakkında açıklama..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiketler
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="etiket1, etiket2, etiket3"
            />
            <p className="text-gray-500 text-sm mt-1">Etiketleri virgülle ayırın</p>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : mode === 'create' ? 'Oluştur' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
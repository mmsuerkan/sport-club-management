'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { X, DollarSign, Calendar, Tag, FileText } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
}

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction | null;
}

const categories = [
  'Üyelik Aidatı',
  'Antrenman Ücreti',
  'Turnuva Katılımı',
  'Ekipman',
  'Tesis Kirası',
  'Personel Maaşı',
  'Elektrik/Su',
  'Temizlik',
  'Diğer'
];

export default function TransactionForm({ isOpen, onClose, onSuccess, editTransaction }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        type: editTransaction.type,
        amount: editTransaction.amount.toString(),
        category: editTransaction.category,
        description: editTransaction.description,
        date: editTransaction.date.toISOString().split('T')[0]
      });
    } else {
      setFormData({
        type: 'income',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [editTransaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category || !formData.description) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);
      
      if (editTransaction) {
        // Update existing transaction
        await updateDoc(doc(db, 'transactions', editTransaction.id), {
          type: formData.type,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: Timestamp.fromDate(new Date(formData.date)),
          updatedAt: Timestamp.now()
        });
      } else {
        // Create new transaction
        await addDoc(collection(db, 'transactions'), {
          type: formData.type,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: Timestamp.fromDate(new Date(formData.date)),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Transaction save error:', error);
      alert('İşlem kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editTransaction ? 'İşlem Düzenle' : 'Yeni İşlem Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşlem Türü
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'income'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Gelir</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'expense'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Gider</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tutar (₺)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Kategori seçin</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="İşlem açıklaması"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarih
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Kaydediliyor...' : (editTransaction ? 'Güncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
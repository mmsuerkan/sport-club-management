'use client';

import { useState } from 'react';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { useFinance } from '@/hooks/useFinance';
import { TransactionForm } from './TransactionForm';
import { FinancialTransaction } from '@/lib/firebase/finance-service';
import { paymentMethods, transactionStatuses } from '@/lib/firebase/finance-categories';
import { Timestamp } from 'firebase/firestore';

export function TransactionsTab() {
  const {
    transactions,
    categories,
    loading,
    categoriesLoading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    formatCurrency,
    getStatusColor,
    getTypeColor,
    loadTransactions
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<FinancialTransaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    status: '',
    paymentMethod: ''
  });

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filters.type || transaction.type === filters.type;
    const matchesCategory = !filters.category || transaction.category === filters.category;
    const matchesStatus = !filters.status || transaction.status === filters.status;
    const matchesPaymentMethod = !filters.paymentMethod || transaction.paymentMethod === filters.paymentMethod;
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesPaymentMethod;
  });

  const handleCreateTransaction = async (transactionData: any) => {
    const result = await createTransaction(transactionData);
    if (result.success) {
      setShowForm(false);
    }
    return result;
  };

  const handleUpdateTransaction = async (transactionData: any) => {
    if (!editTransaction?.id) return { success: false, error: 'Transaction ID missing' };
    
    const result = await updateTransaction(editTransaction.id, transactionData);
    if (result.success) {
      setShowForm(false);
      setEditTransaction(null);
    }
    return result;
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      const result = await deleteTransaction(id);
      if (!result.success) {
        alert('İşlem silinirken hata oluştu: ' + result.error);
      }
    }
  };

  const handleViewTransaction = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const formatDate = (date: Timestamp | string) => {
    const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('tr-TR');
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(pm => pm.value === method)?.label || method;
  };

  const getStatusLabel = (status: string) => {
    return transactionStatuses.find(s => s.value === status)?.label || status;
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Hata: {error}</p>
        <button 
          onClick={() => loadTransactions()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Debug: Check if user data is loading
  if (loading && transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Finansal veriler yükleniyor...</p>
        <p className="mt-1 text-xs text-gray-500">
          Kategoriler: {categoriesLoading ? 'Yükleniyor...' : `${categories.length} kategori`}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {error && `Hata: ${error}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Finansal İşlemler</h3>
          <p className="text-sm text-gray-600">Gelir ve gider işlemlerinizi yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download size={16} />
            Rapor İndir
          </button>
          <button 
            onClick={() => setShowForm(true)}
            disabled={categoriesLoading || categories.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            title={categoriesLoading ? 'Kategoriler yükleniyor...' : categories.length === 0 ? 'Kategoriler yüklenemedi' : 'İşlem ekle'}
          >
            <Plus size={16} />
            {categoriesLoading ? 'Kategoriler Yükleniyor...' : 'İşlem Ekle'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="İşlem ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Türler</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Durumlar</option>
              {transactionStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Ödeme Yöntemleri</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Yükleniyor...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Henüz işlem bulunmuyor.</p>
            <button 
              onClick={() => setShowForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              İlk işleminizi ekleyin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentMethodLabel(transaction.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={getTypeColor(transaction.type)}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewTransaction(transaction)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(transaction.id!)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditTransaction(null);
        }}
        onSubmit={editTransaction ? handleUpdateTransaction : handleCreateTransaction}
        categories={categories}
        editTransaction={editTransaction}
      />

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">İşlem Detayları</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tarih</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tür</label>
                  <p className={`text-sm font-medium ${getTypeColor(selectedTransaction.type)}`}>
                    {selectedTransaction.type === 'income' ? 'Gelir' : 'Gider'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tutar</label>
                  <p className={`text-lg font-semibold ${getTypeColor(selectedTransaction.type)}`}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Durum</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                    {getStatusLabel(selectedTransaction.status)}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ödeme Yöntemi</label>
                  <p className="text-sm text-gray-900">{getPaymentMethodLabel(selectedTransaction.paymentMethod)}</p>
                </div>
                {selectedTransaction.reference && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Referans</label>
                    <p className="text-sm text-gray-900">{selectedTransaction.reference}</p>
                  </div>
                )}
                {selectedTransaction.tags && selectedTransaction.tags.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Etiketler</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTransaction.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
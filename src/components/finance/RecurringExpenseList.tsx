'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Building, 
  DollarSign,
  CheckCircle, 
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Power,
  TrendingUp,
  Clock,
  Plus
} from 'lucide-react';
import { RecurringExpenseService, RecurringExpense } from '@/lib/firebase/recurring-expense-service';
import RecurringExpenseForm from './RecurringExpenseForm';

export default function RecurringExpenseList() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [stats, setStats] = useState({
    totalActiveExpenses: 0,
    totalMonthlyAmount: 0,
    totalYearlyAmount: 0,
    nextDueExpenses: 0,
    overdueExpenses: 0
  });

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const allExpenses = await RecurringExpenseService.getAllRecurringExpenses();
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statistics = await RecurringExpenseService.getRecurringExpenseStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    try {
      await RecurringExpenseService.toggleActiveStatus(expense.id!, !expense.isActive);
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (confirm('Bu sabit gideri silmek istediğinizden emin misiniz?')) {
      try {
        await RecurringExpenseService.deleteRecurringExpense(expenseId);
        fetchExpenses();
        fetchStats();
      } catch (error) {
        console.error('Error deleting recurring expense:', error);
      }
    }
  };

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleSave = () => {
    fetchExpenses();
    fetchStats();
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && expense.isActive) || 
                         (filter === 'inactive' && !expense.isActive);
    const matchesBranch = selectedBranch === 'all' || expense.branchId === selectedBranch;
    
    return matchesFilter && matchesBranch;
  });

  // Şube listesini oluştur (unique)
  const branchesMap = new Map();
  expenses.forEach(expense => {
    if (!branchesMap.has(expense.branchId)) {
      branchesMap.set(expense.branchId, { id: expense.branchId, name: expense.branchName });
    }
  });
  const branches = Array.from(branchesMap.values());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFrequencyText = (frequency: string) => {
    return frequency === 'monthly' ? 'Aylık' : 'Yıllık';
  };

  const getStatusColor = (expense: RecurringExpense) => {
    if (!expense.isActive) return 'text-gray-500 bg-gray-100';
    
    const today = new Date();
    const daysUntilDue = Math.ceil((expense.nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'text-red-600 bg-red-100';
    if (daysUntilDue <= 7) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (expense: RecurringExpense) => {
    if (!expense.isActive) return <XCircle size={16} />;
    
    const today = new Date();
    const daysUntilDue = Math.ceil((expense.nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return <AlertCircle size={16} />;
    if (daysUntilDue <= 7) return <Clock size={16} />;
    return <CheckCircle size={16} />;
  };

  const getStatusText = (expense: RecurringExpense) => {
    if (!expense.isActive) return 'Pasif';
    
    const today = new Date();
    const daysUntilDue = Math.ceil((expense.nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} gün gecikmiş`;
    if (daysUntilDue === 0) return 'Bugün vadesi geliyor';
    if (daysUntilDue <= 7) return `${daysUntilDue} gün kaldı`;
    return 'Zamanında';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Sabit Gider Yönetimi</h2>
        <button 
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Yeni Sabit Gider
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif Giderler</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalActiveExpenses}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aylık Toplam</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalMonthlyAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bu Hafta Vadesi Gelen</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.nextDueExpenses}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vadesi Geçen</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.overdueExpenses}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tüm Şubeler</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' && 'Tümü'}
              {status === 'active' && 'Aktif'}
              {status === 'inactive' && 'Pasif'}
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sabit Gider Bulunamadı</h3>
            <p className="text-gray-500">Filtreleme kriterlerinize uygun sabit gider bulunamadı.</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !expense.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    expense.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Calendar size={20} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{expense.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building size={14} />
                        {expense.branchName}
                      </div>
                      <span>•</span>
                      <span>{expense.category}</span>
                      <span>•</span>
                      <span>{getFrequencyText(expense.frequency)}</span>
                      <span>•</span>
                      <span>Sonraki Vade: {formatDate(expense.nextDueDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </span>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense)}`}>
                        {getStatusIcon(expense)}
                        {getStatusText(expense)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(expense)}
                      className={`p-2 rounded-md transition-colors ${
                        expense.isActive
                          ? 'text-green-600 hover:bg-green-100'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={expense.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-400 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id!)}
                      className="text-red-400 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {expense.description && (
                <div className="mt-3 text-sm text-gray-600 pl-13">
                  {expense.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      <RecurringExpenseForm
        isOpen={showModal}
        onClose={handleModalClose}
        editingExpense={editingExpense}
        onSave={handleSave}
      />
    </div>
  );
}
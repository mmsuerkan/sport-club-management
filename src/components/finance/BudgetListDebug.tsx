'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  PieChart
} from 'lucide-react';
import { BudgetService, Budget } from '@/lib/firebase/budget-service-simple';
import BudgetForm from './BudgetForm';

export default function BudgetListDebug() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    console.log('BudgetList: Loading budgets with period:', selectedPeriod);
    
    const loadBudgets = async () => {
      try {
        setLoading(true);
        const fetchedBudgets = await BudgetService.getBudgets(selectedPeriod === 'all' ? undefined : selectedPeriod);
        console.log('BudgetList: Fetched budgets:', fetchedBudgets);
        setBudgets(fetchedBudgets);
      } catch (error) {
        console.error('BudgetList: Error loading budgets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBudgets();
  }, [selectedPeriod]);

  const handleCreateBudget = () => {
    setFormMode('create');
    setEditingBudget(null);
    setShowForm(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setFormMode('edit');
    setEditingBudget(budget);
    setShowForm(true);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (window.confirm('Bu bütçeyi silmek istediğinizden emin misiniz?')) {
      try {
        await BudgetService.deleteBudget(budgetId);
        setBudgets(prev => prev.filter(b => b.id !== budgetId));
      } catch (error) {
        console.error('Error deleting budget:', error);
        alert('Bütçe silinirken hata oluştu');
      }
    }
  };

  const handleFormSuccess = () => {
    console.log('BudgetList: Form success, reloading budgets');
    
    const loadBudgets = async () => {
      try {
        const fetchedBudgets = await BudgetService.getBudgets(selectedPeriod === 'all' ? undefined : selectedPeriod);
        console.log('BudgetList: Reloaded budgets:', fetchedBudgets);
        setBudgets(fetchedBudgets);
      } catch (error) {
        console.error('BudgetList: Error reloading budgets:', error);
      }
    };
    loadBudgets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'exceeded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <TrendingUp size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      case 'exceeded': return <AlertCircle size={16} />;
      default: return <PieChart size={16} />;
    }
  };

  const getUsagePercentage = (spent: number, planned: number) => {
    return Math.round((spent / planned) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Bütçe Yönetimi (Debug)</h2>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tüm Dönemler</option>
            <option value="monthly">Aylık</option>
            <option value="quarterly">Üç Aylık</option>
            <option value="yearly">Yıllık</option>
          </select>
        </div>
        <button 
          onClick={handleCreateBudget}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Yeni Bütçe
        </button>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Planlanan</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budgets.reduce((sum, b) => sum + b.plannedAmount, 0))}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Harcanan</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budgets.reduce((sum, b) => sum + b.spentAmount, 0))}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kalan Bütçe</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  budgets.reduce((sum, b) => sum + b.plannedAmount, 0) - 
                  budgets.reduce((sum, b) => sum + b.spentAmount, 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        {budgets.length === 0 ? (
          <div className="text-center py-8">
            <PieChart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz bütçe bulunmuyor</h3>
            <p className="text-gray-500">İlk bütçenizi oluşturmak için "Yeni Bütçe" butonuna tıklayın.</p>
          </div>
        ) : (
          budgets.map((budget) => {
            const usagePercentage = getUsagePercentage(budget.spentAmount, budget.plannedAmount);
            const isOverBudget = budget.spentAmount > budget.plannedAmount;
            
            return (
              <div key={budget.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{budget.category}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}>
                        {getStatusIcon(budget.status)}
                        {budget.status === 'active' && 'Aktif'}
                        {budget.status === 'completed' && 'Tamamlandı'}
                        {budget.status === 'exceeded' && 'Aşıldı'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Dönem: {budget.period === 'monthly' ? 'Aylık' : budget.period === 'quarterly' ? 'Üç Aylık' : 'Yıllık'}</span>
                      <span>•</span>
                      <span>{new Date(budget.startDate).toLocaleDateString('tr-TR')} - {new Date(budget.endDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditBudget(budget)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBudget(budget.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Bütçe Kullanımı</span>
                    <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {usagePercentage}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isOverBudget ? 'bg-red-500' : usagePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-gray-600">Harcanan: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(budget.spentAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Planlanan: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(budget.plannedAmount)}</span>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <AlertCircle size={16} />
                      <span>Bütçe {formatCurrency(budget.spentAmount - budget.plannedAmount)} aşıldı</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Budget Form Modal */}
      <BudgetForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        budget={editingBudget}
        mode={formMode}
      />
    </div>
  );
}
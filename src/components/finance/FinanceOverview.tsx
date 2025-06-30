'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BudgetService, Budget } from '@/lib/firebase/budget-service';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  Calendar
} from 'lucide-react';

interface OverviewStats {
  totalIncome: number;
  totalExpense: number;
  totalBudget: number;
  budgetSpent: number;
  transactionCount: number;
  activeBudgets: number;
}

export default function FinanceOverview() {
  const [stats, setStats] = useState<OverviewStats>({
    totalIncome: 0,
    totalExpense: 0,
    totalBudget: 0,
    budgetSpent: 0,
    transactionCount: 0,
    activeBudgets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get transactions data
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      let totalIncome = 0;
      let totalExpense = 0;
      let transactionCount = transactionsSnapshot.size;

      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'income') {
          totalIncome += data.amount;
        } else if (data.type === 'expense') {
          totalExpense += data.amount;
        }
      });

      // Get budgets data
      const budgets = await BudgetService.getBudgets();
      const totalBudget = budgets.reduce((sum, budget) => sum + budget.plannedAmount, 0);
      const budgetSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
      const activeBudgets = budgets.filter(budget => budget.status === 'active').length;

      setStats({
        totalIncome,
        totalExpense,
        totalBudget,
        budgetSpent,
        transactionCount,
        activeBudgets
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const netIncome = stats.totalIncome - stats.totalExpense;
  const budgetUsagePercentage = stats.totalBudget > 0 ? (stats.budgetSpent / stats.totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Finansal Genel Bakış</h2>
      
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Gelir</p>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netIncome)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`h-6 w-6 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        {/* Budget Usage */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bütçe Kullanımı</p>
              <p className="text-2xl font-bold text-blue-600">
                {budgetUsagePercentage.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <PieChart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Toplam İşlem</p>
              <p className="text-lg font-semibold text-gray-900">{stats.transactionCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <PieChart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aktif Bütçe</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activeBudgets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Kalan Bütçe</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalBudget - stats.budgetSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      {stats.totalBudget > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Bütçe Kullanımı</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {formatCurrency(stats.budgetSpent)} / {formatCurrency(stats.totalBudget)}
              </span>
              <span className={`font-medium ${
                budgetUsagePercentage > 90 ? 'text-red-600' : 
                budgetUsagePercentage > 70 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {budgetUsagePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  budgetUsagePercentage > 90 ? 'bg-red-500' : 
                  budgetUsagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsagePercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
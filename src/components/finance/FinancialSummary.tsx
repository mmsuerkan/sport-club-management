'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Building, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  PieChart
} from 'lucide-react';
import { StudentDebtService } from '@/lib/firebase/student-debt-service';
import { RecurringExpenseService } from '@/lib/firebase/recurring-expense-service';
import { TransactionService } from '@/lib/firebase/transaction-service';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface FinancialData {
  // Gelirler
  tuitionIncome: {
    thisMonth: number;
    pending: number;
    overdue: number;
    total: number;
  };
  manualIncome: {
    thisMonth: number;
    total: number;
  };
  totalIncome: number;

  // Giderler
  recurringExpenses: {
    thisMonth: number;
    pending: number;
    total: number;
  };
  manualExpenses: {
    thisMonth: number;
    total: number;
  };
  totalExpenses: number;

  // Net Durum
  netIncome: number;
  profitMargin: number;
}

interface BranchSummary {
  branchId: string;
  branchName: string;
  income: number;
  expenses: number;
  netIncome: number;
  studentCount: number;
}

export default function FinancialSummary() {
  const [financialData, setFinancialData] = useState<FinancialData>({
    tuitionIncome: { thisMonth: 0, pending: 0, overdue: 0, total: 0 },
    manualIncome: { thisMonth: 0, total: 0 },
    totalIncome: 0,
    recurringExpenses: { thisMonth: 0, pending: 0, total: 0 },
    manualExpenses: { thisMonth: 0, total: 0 },
    totalExpenses: 0,
    netIncome: 0,
    profitMargin: 0
  });
  const [branchSummaries, setBranchSummaries] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last3' | 'last6' | 'year'>('current');

  useEffect(() => {
    fetchFinancialData();
    fetchBranchSummaries();
  }, [selectedPeriod]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Aidat gelirleri
      const tuitionStats = await StudentDebtService.getTuitionStats();
      const tuitionThisMonth = await getThisMonthTuitionIncome();

      // Sabit giderler
      const recurringStats = await RecurringExpenseService.getRecurringExpenseStats();
      const recurringThisMonth = await getThisMonthRecurringExpenses();

      // Manuel işlemler - TransactionService kullan
      const transactionStats = await TransactionService.getTransactionStats();
      const manualIncomeThisMonth = transactionStats.thisMonthIncome;
      const manualExpensesThisMonth = transactionStats.thisMonthExpenses;
      const totalManualIncome = transactionStats.totalIncome;
      const totalManualExpenses = transactionStats.totalExpenses;

      const totalIncome = tuitionStats.totalPaid + totalManualIncome;
      const totalExpenses = (recurringStats.totalMonthlyAmount * 12) + totalManualExpenses;
      const netIncome = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

      setFinancialData({
        tuitionIncome: {
          thisMonth: tuitionThisMonth,
          pending: tuitionStats.totalPending,
          overdue: tuitionStats.totalOverdue,
          total: tuitionStats.totalPaid
        },
        manualIncome: {
          thisMonth: manualIncomeThisMonth,
          total: totalManualIncome
        },
        totalIncome,
        recurringExpenses: {
          thisMonth: recurringThisMonth,
          pending: 0, // TODO: Bu ay tahakkuk edecek
          total: recurringStats.totalMonthlyAmount * 12
        },
        manualExpenses: {
          thisMonth: manualExpensesThisMonth,
          total: totalManualExpenses
        },
        totalExpenses,
        netIncome,
        profitMargin
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchSummaries = async () => {
    try {
      // Şube bilgilerini al
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));

      const summaries: BranchSummary[] = [];

      for (const branch of branches) {
        // Şube bazlı aidat gelirleri
        const branchTuitions = await StudentDebtService.getAllDebts();
        const branchTuitionIncome = branchTuitions
          .filter(debt => debt.branchId === branch.id && debt.status === 'paid')
          .reduce((sum, debt) => sum + debt.amount, 0);

        // Şube bazlı sabit giderler
        const branchRecurringExpenses = await RecurringExpenseService.getRecurringExpensesByBranch(branch.id);
        const branchExpenseTotal = branchRecurringExpenses
          .filter(expense => expense.isActive)
          .reduce((sum, expense) => {
            return sum + (expense.frequency === 'monthly' ? expense.amount * 12 : expense.amount);
          }, 0);

        // Şube bazlı manuel işlemler
        const branchManualIncome = await TransactionService.getBranchAmountByType(branch.id, 'income');
        const branchManualExpenses = await TransactionService.getBranchAmountByType(branch.id, 'expense');

        // Öğrenci sayısı
        const studentsSnapshot = await getDocs(
          query(collection(db, 'students'), where('branchId', '==', branch.id))
        );

        const totalIncome = branchTuitionIncome + branchManualIncome;
        const totalExpenses = branchExpenseTotal + branchManualExpenses;

        summaries.push({
          branchId: branch.id,
          branchName: branch.name,
          income: totalIncome,
          expenses: totalExpenses,
          netIncome: totalIncome - totalExpenses,
          studentCount: studentsSnapshot.docs.length
        });
      }

      setBranchSummaries(summaries);
    } catch (error) {
      console.error('Error fetching branch summaries:', error);
    }
  };

  // Helper functions
  const getThisMonthTuitionIncome = async (): Promise<number> => {
    const today = new Date();
    const allDebts = await StudentDebtService.getAllDebts();
    return allDebts
      .filter(debt => 
        debt.status === 'paid' && 
        debt.paymentDate &&
        debt.paymentDate.getMonth() === today.getMonth() &&
        debt.paymentDate.getFullYear() === today.getFullYear()
      )
      .reduce((sum, debt) => sum + debt.amount, 0);
  };

  const getThisMonthRecurringExpenses = async (): Promise<number> => {
    const recurringExpenses = await RecurringExpenseService.getAllRecurringExpenses();
    return recurringExpenses
      .filter(expense => expense.isActive && expense.frequency === 'monthly')
      .reduce((sum, expense) => sum + expense.amount, 0);
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getProfitColor = (netIncome: number) => {
    if (netIncome > 0) return 'text-green-600';
    if (netIncome < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProfitIcon = (netIncome: number) => {
    if (netIncome > 0) return <TrendingUp size={20} />;
    if (netIncome < 0) return <TrendingDown size={20} />;
    return <BarChart3 size={20} />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Finansal Özet</h2>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="current">Bu Ay</option>
          <option value="last3">Son 3 Ay</option>
          <option value="last6">Son 6 Ay</option>
          <option value="year">Bu Yıl</option>
        </select>
      </div>

      {/* Main Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Toplam Gelir */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(financialData.totalIncome)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Bu ay: {formatCurrency(financialData.tuitionIncome.thisMonth + financialData.manualIncome.thisMonth)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Toplam Gider */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(financialData.totalExpenses)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Bu ay: {formatCurrency(financialData.recurringExpenses.thisMonth + financialData.manualExpenses.thisMonth)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Net Kâr/Zarar */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Durum</p>
              <p className={`text-2xl font-bold ${getProfitColor(financialData.netIncome)}`}>
                {formatCurrency(financialData.netIncome)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Kâr Marjı: %{financialData.profitMargin.toFixed(1)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              financialData.netIncome > 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={getProfitColor(financialData.netIncome)}>
                {getProfitIcon(financialData.netIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Bekleyen Aidatlar */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bekleyen Aidatlar</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(financialData.tuitionIncome.pending)}
              </p>
              <p className="text-sm text-red-500 mt-1">
                Vadesi Geçen: {formatCurrency(financialData.tuitionIncome.overdue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gelir/Gider Detayları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gelir Detayı */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            Gelir Detayları
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Aidat Gelirleri</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(financialData.tuitionIncome.total)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Diğer Gelirler</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(financialData.manualIncome.total)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t-2 border-green-200 font-semibold">
              <span className="text-gray-900">Toplam Gelir</span>
              <span className="text-green-600">
                {formatCurrency(financialData.totalIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Gider Detayı */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={20} />
            Gider Detayları
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Sabit Giderler (Yıllık)</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(financialData.recurringExpenses.total)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Diğer Giderler</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(financialData.manualExpenses.total)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t-2 border-red-200 font-semibold">
              <span className="text-gray-900">Toplam Gider</span>
              <span className="text-red-600">
                {formatCurrency(financialData.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Şube Bazlı Özet */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building className="text-blue-600" size={20} />
          Şube Bazlı Finansal Durum
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğrenci Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gelir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Durum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branchSummaries.map((branch) => (
                <tr key={branch.branchId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">
                        {branch.branchName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{branch.studentCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {formatCurrency(branch.income)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatCurrency(branch.expenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getProfitColor(branch.netIncome)}`}>
                      {formatCurrency(branch.netIncome)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
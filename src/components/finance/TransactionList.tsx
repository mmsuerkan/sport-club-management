'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BudgetService } from '@/lib/firebase/budget-service';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Search,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import TransactionForm from './TransactionForm';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  trainerId?: string;
  trainerName?: string;
  branchId?: string;
  branchName?: string;
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);


  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'transactions'),
        orderBy('date', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const transactionData: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionData.push({
          id: doc.id,
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          groupId: data.groupId,
          groupName: data.groupName,
          studentId: data.studentId,
          studentName: data.studentName,
          trainerId: data.trainerId,
          trainerName: data.trainerName,
          branchId: data.branchId,
          branchName: data.branchName
        });
      });
      
      setTransactions(transactionData);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      // Önce işlem detaylarını al (bütçe güncellemesi için)
      const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
      if (!transactionDoc.exists()) {
        alert('İşlem bulunamadı');
        return;
      }

      const transactionData = transactionDoc.data();
      
      // İşlemi sil
      await deleteDoc(doc(db, 'transactions', transactionId));

      // Eğer gider işlemiyse, bütçeyi geri artır
      if (transactionData.type === 'expense') {
        await updateBudgetForDeletedExpense(
          transactionData.category,
          transactionData.amount,
          transactionData.date instanceof Timestamp ? transactionData.date.toDate() : new Date(transactionData.date),
          transactionData.branchId
        );
      }

      fetchTransactions();
    } catch (error) {
      console.error('Transaction delete error:', error);
      alert('İşlem silinirken bir hata oluştu');
    }
  };

  const updateBudgetForDeletedExpense = async (category: string, amount: number, transactionDate: Date, branchId?: string) => {
    try {
      // Get all budgets
      const budgets = await BudgetService.getBudgets();
      
      // Find matching budget by category, date range, and branch
      const matchingBudgets = budgets.filter(budget => 
        budget.category === category &&
        budget.status !== 'completed' &&
        transactionDate >= budget.startDate &&
        transactionDate <= budget.endDate &&
        (branchId ? (budget as any).branchId === branchId : true)
      );

      if (matchingBudgets.length === 0) {
        console.warn(`No active budget found for category: ${category} on date: ${transactionDate} for branch: ${branchId}`);
        return;
      }

      if (matchingBudgets.length > 1) {
        console.warn(`Multiple budgets found for category: ${category}. Updating the most recent one.`);
        matchingBudgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Update the first (most recent) matching budget
      const budgetToUpdate = matchingBudgets[0];
      if (budgetToUpdate && budgetToUpdate.id) {
        // Decrease the spent amount (add back the deleted expense)
        const newSpentAmount = Math.max(0, budgetToUpdate.spentAmount - amount);
        const newStatus = newSpentAmount > budgetToUpdate.plannedAmount ? 'exceeded' : 'active';
        
        await BudgetService.updateBudget(budgetToUpdate.id, {
          spentAmount: newSpentAmount,
          status: newStatus
        });
      }
    } catch (error) {
      console.error('Error updating budget for deleted expense:', error);
      // Don't throw - let transaction deletion succeed even if budget update fails
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditTransaction(null);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">İşlemler</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Yeni İşlem Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="İşlem ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Tümü', icon: Filter },
            { value: 'income', label: 'Gelir', icon: TrendingUp },
            { value: 'expense', label: 'Gider', icon: TrendingDown }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === value
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">İşlem Bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || filter !== 'all' 
                ? 'Arama kriterlerinize uygun işlem bulunamadı.'
                : 'Henüz hiç işlem kaydı yok.'
              }
            </p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{transaction.category}</span>
                      {transaction.groupName && (
                        <span>• {transaction.groupName}</span>
                      )}
                      {transaction.studentName && (
                        <span>• {transaction.studentName}</span>
                      )}
                      {transaction.trainerName && (
                        <span>• {transaction.trainerName}</span>
                      )}
                      {transaction.branchName && (
                        <span>• {transaction.branchName}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-lg font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="p-1 text-blue-400 hover:text-blue-700"
                      title="Düzenle"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-1 text-red-400 hover:text-red-700"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Form Modal */}
      <TransactionForm 
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={fetchTransactions}
        editTransaction={editTransaction}
      />
    </div>
  );
}
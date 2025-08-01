'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { X, DollarSign, Calendar, Tag, FileText, Users, GraduationCap, ShieldUser, Building } from 'lucide-react';
import { BudgetService } from '@/lib/firebase/budget-service';
import { incomeCategories, expenseCategories } from '@/lib/categories';

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
}

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchName: string;
}

interface Student {
  id: string;
  fullName: string;
  groupId: string;
  groupName: string;
}

interface Trainer {
  id: string;
  fullName: string;
  branchName: string;
  groupNames?: string[];
}

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction | null;
}

// Kategoriler artık @/lib/categories'den import ediliyor

export default function TransactionForm({ isOpen, onClose, onSuccess, editTransaction }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    groupId: '',
    studentId: '',
    trainerId: '',
    branchId: ''
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Kategoriye göre hangi alanların gösterileceğini belirler
  const getCategoryFields = (category: string) => {
    switch (category) {
      case 'Antrenör Ücretleri':
        return { showTrainer: true, showGroup: false, showStudent: false, showBranch: false };
      case 'Üyelik Aidatı':
        return { showTrainer: false, showGroup: true, showStudent: true, showBranch: false };
      case 'Ekipman':
      case 'Tesis Bakım':
      case 'Utilities':
      case 'Marketing':
      case 'Turnuva/Organizasyon':
      case 'Sağlık/Sigorta':
      case 'Ulaşım':
      case 'Beslenme':
        return { showTrainer: false, showGroup: false, showStudent: false, showBranch: true };
      case 'Sponsorluk':
      case 'Bağış':
      case 'Etkinlik Geliri':
      case 'Diğer':
      case 'Diğer Gelir':
        return { showTrainer: false, showGroup: false, showStudent: false, showBranch: false };
      default:
        return { showTrainer: false, showGroup: true, showStudent: true, showBranch: false };
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      fetchStudents();
      fetchTrainers();
      fetchBranches();
    }

    if (editTransaction) {
      setFormData({
        type: editTransaction.type,
        amount: editTransaction.amount.toString(),
        category: editTransaction.category,
        description: editTransaction.description,
        date: editTransaction.date.toISOString().split('T')[0],
        groupId: editTransaction.groupId || '',
        studentId: editTransaction.studentId || '',
        trainerId: (editTransaction as any).trainerId || '',
        branchId: (editTransaction as any).branchId || ''
      });
    } else {
      setFormData({
        type: 'income',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        groupId: '',
        studentId: '',
        trainerId: '',
        branchId: ''
      });
    }
  }, [editTransaction, isOpen]);

  useEffect(() => {
    if (formData.groupId) {
      const filtered = students.filter(student => student.groupId === formData.groupId);
      setFilteredStudents(filtered);
      // Reset student selection if current student not in filtered list
      if (formData.studentId && !filtered.find(s => s.id === formData.studentId)) {
        setFormData(prev => ({ ...prev, studentId: '' }));
      }
    } else {
      setFilteredStudents([]);
      setFormData(prev => ({ ...prev, studentId: '' }));
    }
  }, [formData.groupId, students]);

  // Kategori değiştiğinde ilgili alanları temizle
  useEffect(() => {
    const fields = getCategoryFields(formData.category);
    setFormData(prev => ({
      ...prev,
      groupId: fields.showGroup ? prev.groupId : '',
      studentId: fields.showStudent ? prev.studentId : '',
      trainerId: fields.showTrainer ? prev.trainerId : '',
      branchId: fields.showBranch ? prev.branchId : ''
    }));
  }, [formData.category]);

  const fetchGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData: Group[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        groupsData.push({
          id: doc.id,
          name: data.name,
          branchName: data.branchName
        });
      });
      setGroups(groupsData);
    } catch (error) {
      console.error('Groups fetch error:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsData: Student[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          fullName: data.fullName,
          groupId: data.groupId,
          groupName: data.groupName
        });
      });
      setStudents(studentsData);
    } catch (error) {
      console.error('Students fetch error:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'trainers'));
      const trainersData: Trainer[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trainersData.push({
          id: doc.id,
          fullName: data.fullName,
          branchName: data.branchName,
          groupNames: data.groupNames || (data.groupName ? [data.groupName] : [])
        });
      });
      setTrainers(trainersData);
    } catch (error) {
      console.error('Trainers fetch error:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        branchesData.push({
          id: doc.id,
          name: data.name
        });
      });
      setBranches(branchesData);
    } catch (error) {
      console.error('Branches fetch error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fields = getCategoryFields(formData.category);
    let missingFields = [];
    
    if (!formData.amount) missingFields.push('Tutar');
    if (!formData.category) missingFields.push('Kategori');
    if (!formData.description) missingFields.push('Açıklama');
    if (fields.showGroup && !formData.groupId) missingFields.push('Grup');
    if (fields.showStudent && !formData.studentId) missingFields.push('Öğrenci');
    if (fields.showTrainer && !formData.trainerId) missingFields.push('Antrenör');
    if (fields.showBranch && !formData.branchId) missingFields.push('Şube');
    
    if (missingFields.length > 0) {
      alert(`Lütfen şu alanları doldurun: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      
      const selectedGroup = groups.find(g => g.id === formData.groupId);
      const selectedStudent = filteredStudents.find(s => s.id === formData.studentId);
      const selectedTrainer = trainers.find(t => t.id === formData.trainerId);
      const selectedBranch = branches.find(b => b.id === formData.branchId);

      const transactionData: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: Timestamp.fromDate(new Date(formData.date)),
        updatedAt: Timestamp.now()
      };

      // Kategoriye göre ilgili alanları ekle
      if (formData.groupId) {
        transactionData.groupId = formData.groupId;
        transactionData.groupName = selectedGroup?.name || '';
      }
      if (formData.studentId) {
        transactionData.studentId = formData.studentId;
        transactionData.studentName = selectedStudent?.fullName || '';
      }
      if (formData.trainerId) {
        transactionData.trainerId = formData.trainerId;
        transactionData.trainerName = selectedTrainer?.fullName || '';
      }
      if (formData.branchId) {
        transactionData.branchId = formData.branchId;
        transactionData.branchName = selectedBranch?.name || '';
      }
      
      if (editTransaction) {
        // Update existing transaction
        await updateDoc(doc(db, 'transactions', editTransaction.id), transactionData);
      } else {
        // Create new transaction
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdAt: Timestamp.now()
        });
      }

      // Update budget for expense transactions
      if (formData.type === 'expense') {
        if (editTransaction) {
          // For edit: first revert old expense, then add new expense
          if (editTransaction.type === 'expense') {
            // Revert old expense (add back to budget)
            await updateBudgetForDeletedExpense(
              editTransaction.category, 
              editTransaction.amount, 
              editTransaction.date,
              (editTransaction as any).branchId
            );
          }
          // Add new expense (subtract from budget)
          await updateBudgetForExpense(formData.category, parseFloat(formData.amount), new Date(formData.date), formData.branchId);
        } else {
          // For new expense: just subtract from budget
          await updateBudgetForExpense(formData.category, parseFloat(formData.amount), new Date(formData.date), formData.branchId);
        }
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

  const updateBudgetForExpense = async (category: string, amount: number, transactionDate: Date, branchId?: string) => {
    try {
      // Get all budgets
      const budgets = await BudgetService.getBudgets();
      
      // Find all matching budgets by category, date range, and branch
      const matchingBudgets = budgets.filter(budget => 
        budget.category === category &&
        budget.status !== 'completed' && // Don't update completed budgets
        transactionDate >= budget.startDate &&
        transactionDate <= budget.endDate &&
        (branchId ? (budget as any).branchId === branchId : true)
      );

      if (matchingBudgets.length === 0) {
        console.warn(`No active budget found for category: ${category} on date: ${transactionDate}`);
        return;
      }

      if (matchingBudgets.length > 1) {
        console.warn(`Multiple budgets found for category: ${category}. Updating the most recent one.`);
        // Sort by creation date to get the most recent budget
        matchingBudgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Update the first (most recent) matching budget
      const budgetToUpdate = matchingBudgets[0];
      if (budgetToUpdate && budgetToUpdate.id) {
        // Update the budget's spent amount
        const newSpentAmount = budgetToUpdate.spentAmount + amount;
        const newStatus = newSpentAmount > budgetToUpdate.plannedAmount ? 'exceeded' : 'active';
        
        await BudgetService.updateBudget(budgetToUpdate.id, {
          spentAmount: newSpentAmount,
          status: newStatus
        });

        // Alert if budget is exceeded
        if (newStatus === 'exceeded') {
          alert(`Dikkat! ${category} kategorisinde bütçe aşıldı!\nPlanlanan: ${budgetToUpdate.plannedAmount.toLocaleString('tr-TR')} ₺\nHarcanan: ${newSpentAmount.toLocaleString('tr-TR')} ₺`);
        }
      }
    } catch (error) {
      console.error('Error updating budget for expense:', error);
      // Don't throw - let transaction save even if budget update fails
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
      // Don't throw - let transaction save even if budget update fails
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center mt-0 p-4 z-50">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                {(formData.type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Fields Based on Category */}
          {(() => {
            const fields = getCategoryFields(formData.category);
            return (
              <>
                {/* Branch Selection */}
                {fields.showBranch && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şube
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Şube seçin</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Trainer Selection */}
                {fields.showTrainer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Antrenör
                    </label>
                    <div className="relative">
                      <ShieldUser className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.trainerId}
                        onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Antrenör seçin</option>
                        {trainers.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.fullName} ({trainer.branchName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Group Selection */}
                {fields.showGroup && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grup
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Grup seçin</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.branchName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Student Selection */}
                {fields.showStudent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Öğrenci
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                        disabled={!formData.groupId}
                      >
                        <option value="">
                          {formData.groupId ? 'Öğrenci seçin' : 'Önce grup seçin'}
                        </option>
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

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
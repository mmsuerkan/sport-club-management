'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { StudentDebtService, StudentDebt } from '@/lib/firebase/student-debt-service';

export default function TuitionList() {
  const [debts, setDebts] = useState<StudentDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'student' | 'detail' | 'month'>('student'); // Görünüm modu
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Ay filtresi
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null); // Genişletilmiş öğrenci
  const [stats, setStats] = useState({
    totalExpected: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    paymentRate: 0
  });

  useEffect(() => {
    fetchDebts();
    fetchStats();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      await StudentDebtService.updateOverdueStatus(); // Vadesi geçenleri güncelle
      const allDebts = await StudentDebtService.getAllDebts();
      setDebts(allDebts);
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statistics = await StudentDebtService.getTuitionStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePaymentToggle = async (debt: StudentDebt) => {
    try {
      if (debt.status === 'paid') {
        await StudentDebtService.markAsUnpaid(debt.id!);
      } else {
        await StudentDebtService.markAsPaid(debt.id!);
      }
      fetchDebts();
      fetchStats();
    } catch (error) {
      console.error('Error toggling payment:', error);
    }
  };

  const filteredDebts = debts.filter(debt => {
    const matchesFilter = filter === 'all' || debt.status === filter;
    const matchesSearch = debt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debt.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debt.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === 'all' || debt.branchId === selectedBranch;
    const matchesGroup = selectedGroup === 'all' || debt.groupId === selectedGroup;
    const matchesMonth = selectedMonth === 'all' || 
                        debt.dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) === selectedMonth;
    
    return matchesFilter && matchesSearch && matchesBranch && matchesGroup && matchesMonth;
  });

  // Öğrenci bazlı gruplama
  const groupedByStudent = filteredDebts.reduce((acc, debt) => {
    if (!acc[debt.studentId]) {
      acc[debt.studentId] = {
        studentId: debt.studentId,
        studentName: debt.studentName,
        groupName: debt.groupName,
        branchName: debt.branchName,
        debts: [],
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
      };
    }
    
    acc[debt.studentId].debts.push(debt);
    acc[debt.studentId].totalAmount += debt.amount;
    
    if (debt.status === 'paid') {
      acc[debt.studentId].paidAmount += debt.amount;
    } else if (debt.status === 'overdue') {
      acc[debt.studentId].overdueAmount += debt.amount;
    } else {
      acc[debt.studentId].pendingAmount += debt.amount;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const studentSummaries = Object.values(groupedByStudent);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} />;
      case 'pending': return <Calendar size={16} />;
      case 'overdue': return <AlertCircle size={16} />;
      default: return <XCircle size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi';
      case 'pending': return 'Bekliyor';
      case 'overdue': return 'Vadesi Geçti';
      default: return 'Bilinmiyor';
    }
  };

  // Şube ve grup listelerini oluştur (unique)
  const branchesMap = new Map();
  const branchIndexMap = new Map(); // Index counter for duplicate IDs
  debts.forEach(debt => {
    if (!branchesMap.has(debt.branchId)) {
      branchesMap.set(debt.branchId, { id: debt.branchId, name: debt.branchName });
      branchIndexMap.set(debt.branchId, 0);
    }
  });
  const branches = Array.from(branchesMap.values());

  const groupsMap = new Map();
  const groupIndexMap = new Map(); // Index counter for duplicate IDs
  debts.forEach(debt => {
    if (!groupsMap.has(debt.groupId)) {
      groupsMap.set(debt.groupId, { id: debt.groupId, name: debt.groupName });
      groupIndexMap.set(debt.groupId, 0);
    }
  });
  const groups = Array.from(groupsMap.values());

  // Unique ayları bul
  const monthsSet = new Set();
  debts.forEach(debt => {
    const monthYear = debt.dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    monthsSet.add(monthYear);
  });
  const months = Array.from(monthsSet).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

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
        <h2 className="text-xl font-semibold text-gray-900">Aidat Yönetimi</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Beklenen</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalExpected)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Ödenen</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vadesi Geçen</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalOverdue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ödeme Oranı</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.paymentRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('student')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'student'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Öğrenci Bazlı Özet
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'detail'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detaylı Görünüm
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'month'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aylık Görünüm
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Öğrenci, grup veya şube ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tüm Şubeler</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tüm Gruplar</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>

          {viewMode === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Tüm Aylar</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          )}

          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' && <Filter size={16} />}
              {status === 'paid' && <CheckCircle size={16} />}
              {status === 'pending' && <Calendar size={16} />}
              {status === 'overdue' && <AlertCircle size={16} />}
              {status === 'all' ? 'Tümü' : getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on View Mode */}
      <div className="space-y-3">
        {viewMode === 'student' ? (
          // Öğrenci bazlı özet görünüm
          studentSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Öğrenci Bulunamadı</h3>
              <p className="text-gray-500">Arama kriterlerinize uygun öğrenci bulunamadı.</p>
            </div>
          ) : (
            studentSummaries.map((student) => (
              <div
                key={student.studentId}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedStudent(expandedStudent === student.studentId ? null : student.studentId)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      student.overdueAmount > 0 
                        ? 'bg-red-100 text-red-600'
                        : student.paidAmount === student.totalAmount
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Users size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{student.studentName}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{student.branchName}</span>
                        <span>•</span>
                        <span>{student.groupName}</span>
                        <span>•</span>
                        <span>{student.debts.length} taksit</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Toplam Borç</div>
                      <div className="font-semibold">{formatCurrency(student.totalAmount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Ödenen</div>
                      <div className="font-semibold text-green-600">{formatCurrency(student.paidAmount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Kalan</div>
                      <div className={`font-semibold ${student.overdueAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(student.totalAmount - student.paidAmount)}
                      </div>
                    </div>
                    <Eye size={20} className="text-gray-400" />
                  </div>
                </div>

                {/* Genişletilmiş taksit detayları */}
                {expandedStudent === student.studentId && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    {student.debts.map((debt: StudentDebt) => (
                      <div key={debt.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                            {getStatusIcon(debt.status)}
                            {getStatusText(debt.status)}
                          </span>
                          <span className="text-sm">{debt.description}</span>
                          <span className="text-sm text-gray-500">Vade: {formatDate(debt.dueDate)}</span>
                          {debt.paymentDate && (
                            <span className="text-sm text-gray-500">Ödeme: {formatDate(debt.paymentDate)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(debt.amount)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePaymentToggle(debt);
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              debt.status === 'paid'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {debt.status === 'paid' ? 'İptal' : 'Ödendi'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        ) : viewMode === 'detail' ? (
          // Detaylı görünüm - Problem odaklı
          <div className="space-y-6">
            {/* Vadesi Geçenler */}
            {filteredDebts.filter(debt => debt.status === 'overdue').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Vadesi Geçen Ödemeler ({filteredDebts.filter(debt => debt.status === 'overdue').length})
                </h3>
                <div className="space-y-2">
                  {filteredDebts.filter(debt => debt.status === 'overdue').map((debt) => (
                    <div key={debt.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <AlertCircle size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-gray-900">{debt.studentName}</span>
                              <span className="text-gray-500">{debt.branchName} - {debt.groupName}</span>
                              <span className="text-gray-500">{debt.description}</span>
                              <span className="text-red-600 font-medium">Vade: {formatDate(debt.dueDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-red-600">{formatCurrency(debt.amount)}</span>
                          <button
                            onClick={() => handlePaymentToggle(debt)}
                            className="px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            Ödendi
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bu Ay Vadesi Gelenler */}
            {(() => {
              const thisMonthDue = filteredDebts.filter(debt => {
                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                return debt.dueDate.getMonth() === thisMonth && 
                       debt.dueDate.getFullYear() === thisYear && 
                       debt.status === 'pending';
              });
              
              return thisMonthDue.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
                    <Calendar size={20} />
                    Bu Ay Vadesi Gelen Ödemeler ({thisMonthDue.length})
                  </h3>
                  <div className="space-y-2">
                    {thisMonthDue.map((debt) => (
                      <div key={debt.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                              <Calendar size={16} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-medium text-gray-900">{debt.studentName}</span>
                                <span className="text-gray-500">{debt.branchName} - {debt.groupName}</span>
                                <span className="text-gray-500">{debt.description}</span>
                                <span className="text-blue-600 font-medium">Vade: {formatDate(debt.dueDate)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-blue-600">{formatCurrency(debt.amount)}</span>
                            <button
                              onClick={() => handlePaymentToggle(debt)}
                              className="px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              Ödendi
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Son Ödemeler */}
            {(() => {
              const recentPayments = filteredDebts
                .filter(debt => debt.status === 'paid' && debt.paymentDate)
                .sort((a, b) => (b.paymentDate?.getTime() || 0) - (a.paymentDate?.getTime() || 0))
                .slice(0, 10);
              
              return recentPayments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Son Ödemeler (Son 10)
                  </h3>
                  <div className="space-y-2">
                    {recentPayments.map((debt) => (
                      <div key={debt.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle size={16} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-medium text-gray-900">{debt.studentName}</span>
                                <span className="text-gray-500">{debt.branchName} - {debt.groupName}</span>
                                <span className="text-gray-500">{debt.description}</span>
                                <span className="text-green-600 font-medium">Ödeme: {debt.paymentDate && formatDate(debt.paymentDate)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-green-600">{formatCurrency(debt.amount)}</span>
                            <button
                              onClick={() => handlePaymentToggle(debt)}
                              className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Hiç bir şey yoksa */}
            {filteredDebts.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aidat Bulunamadı</h3>
                <p className="text-gray-500">Arama kriterlerinize uygun aidat bulunamadı.</p>
              </div>
            )}
          </div>
        ) : (
          // Aylık görünüm
          <div className="space-y-6">
            {months.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Hiç Aidat Kaydı Bulunamadı</h3>
                <p className="text-gray-500">Önce öğrenci kaydı yapıp aidat planı oluşturun.</p>
              </div>
            ) : (
              months.map((month) => {
                const monthDebts = filteredDebts.filter(debt => 
                  debt.dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) === month
                );
                
                if (monthDebts.length === 0) return null;
                
                const monthStats = {
                  total: monthDebts.length,
                  paid: monthDebts.filter(d => d.status === 'paid').length,
                  pending: monthDebts.filter(d => d.status === 'pending').length,
                  overdue: monthDebts.filter(d => d.status === 'overdue').length,
                  totalAmount: monthDebts.reduce((sum, d) => sum + d.amount, 0),
                  paidAmount: monthDebts.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0),
                  overdueAmount: monthDebts.filter(d => d.status === 'overdue').reduce((sum, d) => sum + d.amount, 0)
                };
                
                return (
                  <div key={month} className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar size={20} />
                        {month}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          {monthStats.paid}/{monthStats.total} ödendi
                        </span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(monthStats.paidAmount)}
                        </span>
                        {monthStats.overdueAmount > 0 && (
                          <span className="text-red-600 font-medium">
                            Vadesi Geçen: {formatCurrency(monthStats.overdueAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Ödeme Oranı</span>
                        <span>{Math.round((monthStats.paid / monthStats.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(monthStats.paid / monthStats.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900">{monthStats.total}</div>
                        <div className="text-xs text-gray-500">Toplam</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">{monthStats.paid}</div>
                        <div className="text-xs text-gray-500">Ödenen</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-semibold text-blue-600">{monthStats.pending}</div>
                        <div className="text-xs text-gray-500">Bekleyen</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-semibold text-red-600">{monthStats.overdue}</div>
                        <div className="text-xs text-gray-500">Vadesi Geçen</div>
                      </div>
                    </div>
                    
                    {/* Problem olan öğrenciler */}
                    {monthStats.overdue > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-red-600 mb-2">Vadesi Geçen Ödemeler:</h4>
                        <div className="space-y-1">
                          {monthDebts.filter(debt => debt.status === 'overdue').map((debt) => (
                            <div key={debt.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{debt.studentName}</span>
                                <span className="text-gray-500">({debt.groupName})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 font-medium">{formatCurrency(debt.amount)}</span>
                                <button
                                  onClick={() => handlePaymentToggle(debt)}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                                >
                                  Ödendi
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
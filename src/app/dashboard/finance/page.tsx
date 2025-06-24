'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  PiggyBank,
  Receipt,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Wallet,
  Building,
  Car,
  Utensils,
  Zap,
  Shirt,
  Trophy,
  BookOpen,
  Phone,
  Wifi,
  Wrench,
  Heart,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  Banknote,
  CreditCard as CreditCardIcon,
  Smartphone,
  Globe,
  MapPin,
  FileText,
  Bell,
  Settings,
  Calculator,
  TrendingUpIcon,
  Activity,
  XCircle
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDocs,
  where
} from 'firebase/firestore';

// Finansal Veri Tipleri
interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'digital';
  status: 'completed' | 'pending' | 'cancelled';
  studentId?: string;
  studentName?: string;
  invoiceNumber?: string;
  reference?: string;
  installmentInfo?: {
    currentInstallment: number;
    totalInstallments: number;
    installmentAmount: number;
  };
  tags?: string[];
  attachments?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Budget {
  id: string;
  type: 'income' | 'expense';
  category: string;
  budgetedAmount: number;
  spentAmount: number;
  period: string; // '2024-01', '2024-Q1', '2024'
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface PaymentPlan {
  id: string;
  studentId: string;
  studentName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: PaymentInstallment[];
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  planType: 'membership' | 'training' | 'custom';
  paymentPeriod: 'monthly' | 'weekly' | 'quarterly';
  notes?: string;
  createdAt: Timestamp;
}

interface PaymentInstallment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets' | 'payments' | 'reports'>('overview');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [showMakePaymentModal, setShowMakePaymentModal] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<PaymentPlan | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('this_month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as FinancialTransaction['paymentMethod'],
    studentId: '',
    reference: ''
  });

  const [paymentPlanForm, setPaymentPlanForm] = useState({
    studentId: '',
    studentName: '',
    totalAmount: '',
    installmentCount: '',
    firstPaymentDate: new Date().toISOString().split('T')[0],
    paymentPeriod: 'monthly' as 'monthly' | 'weekly' | 'quarterly',
    planType: 'membership' as 'membership' | 'training' | 'custom',
    notes: ''
  });

  const [students, setStudents] = useState<any[]>([]);

  const [budgetForm, setBudgetForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    period: '',
    description: ''
  });

  // Gelir Kategorileri
  const incomeCategories = {
    'membership_fees': {
      name: 'Üyelik Aidatları',
      icon: <Users className="h-5 w-5" />,
      subcategories: ['Aylık Aidat', 'Yıllık Aidat', 'Kayıt Ücreti', 'Tesis Kullanım']
    },
    'training_fees': {
      name: 'Antrenman Ücretleri',
      icon: <Trophy className="h-5 w-5" />,
      subcategories: ['Grup Antrenmanı', 'Özel Antrenman', 'Kamp Ücreti', 'Turnuva Katılımı']
    },
    'merchandise': {
      name: 'Ürün Satışları',
      icon: <Shirt className="h-5 w-5" />,
      subcategories: ['Forma', 'Ayakkabı', 'Aksesuar', 'Ekipman']
    },
    'events': {
      name: 'Etkinlik Gelirleri',
      icon: <Star className="h-5 w-5" />,
      subcategories: ['Turnuva', 'Gösteri Maçı', 'Sosyal Etkinlik', 'Sponsor']
    },
    'other_income': {
      name: 'Diğer Gelirler',
      icon: <CircleDollarSign className="h-5 w-5" />,
      subcategories: ['Bağış', 'Sponsorluk', 'Faiz', 'Diğer']
    }
  };

  // Gider Kategorileri
  const expenseCategories = {
    'salaries': {
      name: 'Maaşlar',
      icon: <Users className="h-5 w-5" />,
      subcategories: ['Antrenör Maaşı', 'Personel Maaşı', 'Prim', 'SGK']
    },
    'facility': {
      name: 'Tesis Giderleri',
      icon: <Building className="h-5 w-5" />,
      subcategories: ['Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet', 'Temizlik']
    },
    'equipment': {
      name: 'Ekipman',
      icon: <Trophy className="h-5 w-5" />,
      subcategories: ['Basketbol Topu', 'Potalar', 'Spor Malzemesi', 'Bakım']
    },
    'transportation': {
      name: 'Ulaşım',
      icon: <Car className="h-5 w-5" />,
      subcategories: ['Otobüs', 'Yakıt', 'Kargo', 'Taksi']
    },
    'marketing': {
      name: 'Pazarlama',
      icon: <Globe className="h-5 w-5" />,
      subcategories: ['Reklam', 'Sosyal Medya', 'Baskı', 'Organizasyon']
    },
    'food_beverage': {
      name: 'Yiyecek İçecek',
      icon: <Utensils className="h-5 w-5" />,
      subcategories: ['Antrenman Sonrası', 'Etkinlik', 'Misafir', 'Su']
    },
    'insurance': {
      name: 'Sigorta',
      icon: <Heart className="h-5 w-5" />,
      subcategories: ['Sporcu Sigortası', 'Tesis Sigortası', 'Sorumluluk', 'Sağlık']
    },
    'other_expenses': {
      name: 'Diğer Giderler',
      icon: <Receipt className="h-5 w-5" />,
      subcategories: ['Vergiler', 'Harçlar', 'Banka', 'Diğer']
    }
  };

  useEffect(() => {
    const unsubscribeTransactions = onSnapshot(
      query(collection(db, 'financial_transactions'), orderBy('date', 'desc')),
      (snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FinancialTransaction));
        setTransactions(transactionsData);
      }
    );

    const unsubscribeBudgets = onSnapshot(
      collection(db, 'budgets'),
      (snapshot) => {
        const budgetsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Budget));
        setBudgets(budgetsData);
      }
    );

    const unsubscribePayments = onSnapshot(
      collection(db, 'payment_plans'),
      (snapshot) => {
        const paymentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PaymentPlan));
        setPaymentPlans(paymentsData);
        setLoading(false);
      }
    );

    // Fetch students
    const fetchStudents = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);
      } catch (error) {
        console.error('Öğrenciler yüklenirken hata:', error);
      }
    };

    fetchStudents();

    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribePayments();
    };
  }, []);

  // Finansal hesaplamalar
  const getFinancialSummary = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             t.status === 'completed';
    });

    const totalIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    // Önceki ay karşılaştırması
    const lastMonth = new Date(currentYear, currentMonth - 1);
    const lastMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === lastMonth.getMonth() && 
             transactionDate.getFullYear() === lastMonth.getFullYear() &&
             t.status === 'completed';
    });

    const lastMonthIncome = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const incomeGrowth = lastMonthIncome > 0 ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
    const expenseGrowth = lastMonthExpenses > 0 ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

    // Ödeme planları
    const totalOutstanding = paymentPlans
      .filter(p => p.status === 'active' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.remainingAmount, 0);

    const overduePayments = paymentPlans.filter(p => p.status === 'overdue').length;

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      incomeGrowth,
      expenseGrowth,
      totalOutstanding,
      overduePayments
    };
  };

  const summary = getFinancialSummary();
  
  // Payment plans summary
  const getPaymentSummary = () => {
    const activePlans = paymentPlans.filter(p => p.status === 'active').length;
    const totalCollected = paymentPlans.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPending = paymentPlans.reduce((sum, p) => sum + p.remainingAmount, 0);
    const overduePlans = paymentPlans.filter(p => p.status === 'overdue').length;
    
    return {
      activePlans,
      totalCollected,
      totalPending,
      overduePlans
    };
  };
  
  const paymentSummary = getPaymentSummary();
  
  // Budget summary
  const getBudgetSummary = () => {
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentBudgets = budgets.filter(b => b.period === currentPeriod);
    
    const totalBudgeted = currentBudgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
    const totalSpent = currentBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
    const remaining = totalBudgeted - totalSpent;
    const usagePercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    
    return {
      totalBudgeted,
      totalSpent,
      remaining,
      usagePercentage
    };
  };
  
  const budgetSummary = getBudgetSummary();

  // Kategori bazlı analiz
  const getCategoryBreakdown = (type: 'income' | 'expense') => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             t.type === type &&
             t.status === 'completed';
    });

    const categoryTotals: { [key: string]: number } = {};
    
    monthlyTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        name: type === 'income' ? incomeCategories[category as keyof typeof incomeCategories]?.name || category : 
              expenseCategories[category as keyof typeof expenseCategories]?.name || category
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const incomeBreakdown = getCategoryBreakdown('income');
  const expenseBreakdown = getCategoryBreakdown('expense');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              Finansal Yönetim
            </h1>
            <p className="text-gray-600 mt-2">Gelir, gider ve bütçe yönetimi ile kapsamlı mali raporlama</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTransactionModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              İşlem Ekle
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Rapor İndir
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Genel Bakış', icon: <BarChart3 className="h-5 w-5" /> },
              { id: 'transactions', name: 'İşlemler', icon: <Receipt className="h-5 w-5" /> },
              { id: 'budgets', name: 'Bütçe', icon: <Target className="h-5 w-5" /> },
              { id: 'payments', name: 'Ödemeler', icon: <CreditCard className="h-5 w-5" /> },
              { id: 'reports', name: 'Raporlar', icon: <FileText className="h-5 w-5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Toplam Gelir */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  summary.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.incomeGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(summary.incomeGrowth).toFixed(1)}%
                </div>
              </div>
              <h3 className="text-3xl font-bold text-green-900 mb-1">₺{summary.totalIncome.toLocaleString()}</h3>
              <p className="text-green-700 text-sm">Bu Ay Gelir</p>
            </div>

            {/* Toplam Gider */}
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  summary.expenseGrowth <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.expenseGrowth <= 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  {Math.abs(summary.expenseGrowth).toFixed(1)}%
                </div>
              </div>
              <h3 className="text-3xl font-bold text-red-900 mb-1">₺{summary.totalExpenses.toLocaleString()}</h3>
              <p className="text-red-700 text-sm">Bu Ay Gider</p>
            </div>

            {/* Net Kar/Zarar */}
            <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
              summary.netIncome >= 0 
                ? 'from-blue-50 to-indigo-100 border-blue-200' 
                : 'from-orange-50 to-amber-100 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  summary.netIncome >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                }`}>
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <div className={`text-sm font-medium ${
                  summary.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {summary.netIncome >= 0 ? 'Kar' : 'Zarar'}
                </div>
              </div>
              <h3 className={`text-3xl font-bold mb-1 ${
                summary.netIncome >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                ₺{Math.abs(summary.netIncome).toLocaleString()}
              </h3>
              <p className={`text-sm ${
                summary.netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                Net {summary.netIncome >= 0 ? 'Kar' : 'Zarar'}
              </p>
            </div>

            {/* Bekleyen Ödemeler */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                {summary.overduePayments > 0 && (
                  <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {summary.overduePayments} Gecikmiş
                  </div>
                )}
              </div>
              <h3 className="text-3xl font-bold text-purple-900 mb-1">₺{summary.totalOutstanding.toLocaleString()}</h3>
              <p className="text-purple-700 text-sm">Bekleyen Tahsilat</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Gelir Dağılımı */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Gelir Dağılımı</h3>
                <PieChart className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="space-y-4">
                {incomeBreakdown.slice(0, 5).map((item, index) => {
                  const percentage = summary.totalIncome > 0 ? (item.amount / summary.totalIncome) * 100 : 0;
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
                  
                  return (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index]}`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">₺{item.amount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bars */}
              <div className="mt-6 space-y-3">
                {incomeBreakdown.slice(0, 5).map((item, index) => {
                  const percentage = summary.totalIncome > 0 ? (item.amount / summary.totalIncome) * 100 : 0;
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
                  
                  return (
                    <div key={`bar-${item.category}`} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{item.name}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index]} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gider Analizi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Gider Analizi</h3>
                <BarChart3 className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="space-y-4">
                {expenseBreakdown.slice(0, 5).map((item, index) => {
                  const percentage = summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0;
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500'];
                  
                  return (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index]}`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">₺{item.amount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bars */}
              <div className="mt-6 space-y-3">
                {expenseBreakdown.slice(0, 5).map((item, index) => {
                  const percentage = summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0;
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500'];
                  
                  return (
                    <div key={`expense-bar-${item.category}`} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{item.name}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index]} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Transactions & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Son İşlemler */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Son İşlemler</h3>
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Tümünü Gör →
                </button>
              </div>
              
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? 
                          <TrendingUp className={`h-5 w-5 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`} /> :
                          <TrendingDown className={`h-5 w-5 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`} />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.type === 'income' ? incomeCategories[transaction.category as keyof typeof incomeCategories]?.name : 
                           expenseCategories[transaction.category as keyof typeof expenseCategories]?.name} • 
                          {new Date(transaction.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{transaction.paymentMethod.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hızlı Aksiyonlar */}
            <div className="space-y-6">
              
              {/* Hızlı İşlemler */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowTransactionModal(true)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-green-50 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                      <Plus className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-700">Yeni İşlem Ekle</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">Ödeme Planı</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowBudgetModal(true)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-purple-50 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                      <Target className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-700">Bütçe Ayarla</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-orange-50 rounded-lg transition-colors group">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-700">Fatura Oluştur</span>
                  </button>
                </div>
              </div>

              {/* Finansal Uyarılar */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl border border-amber-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-900">Dikkat Edilmesi Gerekenler</h3>
                </div>
                <div className="space-y-3">
                  {summary.overduePayments > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <Clock className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        {summary.overduePayments} adet gecikmiş ödeme var
                      </span>
                    </div>
                  )}
                  
                  {summary.netIncome < 0 && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        Bu ay zarar: ₺{Math.abs(summary.netIncome).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Bekleyen tahsilat: ₺{summary.totalOutstanding.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="İşlem ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Tüm İşlemler</option>
                  <option value="income">Gelirler</option>
                  <option value="expense">Giderler</option>
                </select>
                
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="this_month">Bu Ay</option>
                  <option value="last_month">Geçen Ay</option>
                  <option value="this_year">Bu Yıl</option>
                  <option value="all">Tüm Zamanlar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Ödeme</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions
                    .filter(t => {
                      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          t.reference?.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesType = filterType === 'all' || t.type === filterType;
                      return matchesSearch && matchesType;
                    })
                    .slice(0, 20)
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(transaction.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                            {transaction.studentName && (
                              <p className="text-xs text-gray-500">{transaction.studentName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {transaction.type === 'income' ? 
                              incomeCategories[transaction.category as keyof typeof incomeCategories]?.icon :
                              expenseCategories[transaction.category as keyof typeof expenseCategories]?.icon
                            }
                            <span className="text-sm text-gray-700">
                              {transaction.type === 'income' ? 
                                incomeCategories[transaction.category as keyof typeof incomeCategories]?.name :
                                expenseCategories[transaction.category as keyof typeof expenseCategories]?.name
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                          {transaction.paymentMethod.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {transaction.status === 'pending' && <Clock className="h-3 w-3" />}
                            {transaction.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                            {transaction.status === 'completed' ? 'Tamamlandı' :
                             transaction.status === 'pending' ? 'Bekliyor' : 'İptal'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-10 w-10 text-blue-600" />
                <span className="text-2xl font-bold text-blue-900">₺{budgetSummary.totalBudgeted.toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Toplam Bütçe</h3>
              <p className="text-sm text-blue-700">Bu ay için belirlenen</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
                <span className="text-2xl font-bold text-green-900">₺{budgetSummary.totalSpent.toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Kullanılan</h3>
              <p className="text-sm text-green-700">%{budgetSummary.usagePercentage.toFixed(1)} oranında</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <PiggyBank className="h-10 w-10 text-purple-600" />
                <span className="text-2xl font-bold text-purple-900">₺{budgetSummary.remaining.toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-purple-900 mb-1">Kalan</h3>
              <p className="text-sm text-purple-700">%{(100 - budgetSummary.usagePercentage).toFixed(1)} oranında</p>
            </div>
          </div>

          {/* Category Budgets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Kategori Bütçeleri</h3>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Bütçe Ekle
              </button>
            </div>

            <div className="space-y-6">
              {/* Gelir Kategorileri */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Gelir Hedefleri
                </h4>
                {budgets.filter(b => b.type === 'income').length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <TrendingUp className="h-16 w-16 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz gelir hedefi belirlenmemiş</h3>
                    <p className="text-gray-600">Gelir kategorileri için hedefler belirleyerek performansı takip edin.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {budgets.filter(b => b.type === 'income').map((budget) => {
                      const percentage = budget.budgetedAmount > 0 ? (budget.spentAmount / budget.budgetedAmount) * 100 : 0;
                      const isOver = percentage > 100;
                      
                      return (
                        <div key={budget.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">
                              {incomeCategories[budget.category as keyof typeof incomeCategories]?.name || budget.category}
                            </h5>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                ₺{budget.spentAmount.toLocaleString()} / ₺{budget.budgetedAmount.toLocaleString()}
                              </span>
                              <div className={`text-xs ${isOver ? 'text-green-600' : percentage > 80 ? 'text-yellow-600' : 'text-gray-500'}`}>
                                %{percentage.toFixed(1)} gerçekleşti
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                                isOver ? 'bg-green-500' : 
                                percentage > 80 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          {isOver && (
                            <div className="mt-2 text-xs text-green-600 font-medium">
                              Hedef %{(percentage - 100).toFixed(1)} aşıldı! 🎉
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gider Kategorileri */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Gider Bütçeleri
                </h4>
                {budgets.filter(b => b.type === 'expense').length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <TrendingDown className="h-16 w-16 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz gider bütçesi belirlenmemiş</h3>
                    <p className="text-gray-600">Gider kategorileri için bütçe belirleyerek harcamaları kontrol edin.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {budgets.filter(b => b.type === 'expense').map((budget) => {
                      const percentage = budget.budgetedAmount > 0 ? (budget.spentAmount / budget.budgetedAmount) * 100 : 0;
                      const isOver = percentage > 100;
                      const isWarning = percentage > 80;
                      
                      return (
                        <div key={budget.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">
                              {expenseCategories[budget.category as keyof typeof expenseCategories]?.name || budget.category}
                            </h5>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                ₺{budget.spentAmount.toLocaleString()} / ₺{budget.budgetedAmount.toLocaleString()}
                              </span>
                              <div className={`text-xs ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-500'}`}>
                                %{percentage.toFixed(1)} kullanıldı
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                                isOver ? 'bg-red-500' : 
                                isWarning ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          {isOver && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Bütçe %{(percentage - 100).toFixed(1)} aşıldı!
                            </div>
                          )}
                          {isWarning && !isOver && (
                            <div className="mt-2 text-xs text-yellow-600 font-medium">
                              Bütçenin %80'i kullanıldı
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Budget Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Bütçe Performansı</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">Bu Ay</button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-full">Son 3 Ay</button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-full">Bu Yıl</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gelir vs Hedef */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4">Gelir Hedefleri</h4>
                <div className="text-center py-8">
                  <div className="mb-4">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz gelir verisi yok</h3>
                  <p className="text-gray-600">İşlemler eklenmeye başlandığında gelir trendleri burada görünecek.</p>
                </div>
              </div>

              {/* Gider Kontrolü */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4">Gider Kontrolü</h4>
                <div className="text-center py-8">
                  <div className="mb-4">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz gider verisi yok</h3>
                  <p className="text-gray-600">Gider işlemleri eklenmeye başlandığında trendler burada görünecek.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          
          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-10 w-10 text-blue-600" />
                <span className="text-2xl font-bold text-blue-900">{paymentSummary.activePlans}</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Aktif Plan</h3>
              <p className="text-sm text-blue-700">Ödeme planı olan öğrenci</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
                <span className="text-2xl font-bold text-green-900">₺{paymentSummary.totalCollected.toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Tahsil Edilen</h3>
              <p className="text-sm text-green-700">Toplam ödenen</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-10 w-10 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-900">₺{paymentSummary.totalPending.toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-1">Bekleyen</h3>
              <p className="text-sm text-yellow-700">Kalan borç tutarı</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600" />
                <span className="text-2xl font-bold text-red-900">{paymentSummary.overduePlans}</span>
              </div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Geciken</h3>
              <p className="text-sm text-red-700">Ödeme gecikmiş plan</p>
            </div>
          </div>

          {/* Payment Plans List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Ödeme Planları</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Plan
                </button>
                <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Dışa Aktar
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Tüm Durumlar</option>
                <option>Aktif</option>
                <option>Tamamlanan</option>
                <option>Geciken</option>
                <option>İptal Edilen</option>
              </select>
              
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Tüm Şubeler</option>
                <option>Merkez</option>
                <option>Anadolu</option>
                <option>Avrupa</option>
              </select>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Öğrenci ara..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {paymentPlans.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <CreditCard className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ödeme planı oluşturulmamış</h3>
                <p className="text-gray-600 mb-4">Öğrenciler için taksitli ödeme planları oluşturun ve takip edin.</p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  İlk Ödeme Planını Oluştur
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Plan Detayı</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">İlerleme</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Sonraki Ödeme</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentPlans.map((plan) => {
                      const progress = plan.totalAmount > 0 ? (plan.paidAmount / plan.totalAmount) * 100 : 0;
                      const isOverdue = plan.status === 'overdue';
                      const isCompleted = plan.status === 'completed';
                      
                      // Find next unpaid installment
                      const nextInstallment = plan.installments.find(inst => inst.status === 'pending');
                      
                      return (
                        <tr key={plan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{plan.studentName}</p>
                              <p className="text-sm text-gray-500">{plan.planType === 'membership' ? 'Üyelik' : plan.planType === 'training' ? 'Antrenman' : 'Özel'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                ₺{plan.totalAmount.toLocaleString()} - {plan.installments.length} Taksit
                              </p>
                              <p className="text-sm text-gray-500">
                                {plan.installments.filter(i => i.status === 'paid').length}/{plan.installments.length} taksit ödendi
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">₺{plan.paidAmount.toLocaleString()}</span>
                                <span className="text-gray-600">%{progress.toFixed(0)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-1000 ${
                                    isCompleted ? 'bg-green-500' : 
                                    isOverdue ? 'bg-red-500' : 
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {nextInstallment ? (
                              <div>
                                <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                  ₺{nextInstallment.amount.toLocaleString()}
                                </p>
                                <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                                  {new Date(nextInstallment.dueDate).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Tamamlandı</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              plan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                              plan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {plan.status === 'active' && <Clock className="h-3 w-3" />}
                              {plan.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                              {plan.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                              {plan.status === 'active' ? 'Aktif' :
                               plan.status === 'completed' ? 'Tamamlandı' :
                               plan.status === 'overdue' ? 'Gecikmiş' : 'İptal'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedPaymentPlan(plan);
                                  setShowPaymentDetailsModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Detayları Görüntüle"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedPaymentPlan(plan);
                                  setShowMakePaymentModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Ödeme Al"
                                disabled={plan.status === 'completed'}
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedPaymentPlan(plan);
                                  // TODO: Implement edit functionality
                                  alert('Düzenleme özelliği yakında eklenecek');
                                }}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Collection Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Aylık Tahsilat */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Tahsilat Hedefi</h3>
              <div className="text-center py-8">
                <div className="mb-4">
                  <Target className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz tahsilat hedefi belirlenmemiş</h4>
                <p className="text-gray-600">Aylık tahsilat hedefi belirleyerek performansı takip edin.</p>
              </div>
            </div>

            {/* Yaklaşan Ödemeler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yaklaşan Ödemeler</h3>
              <div className="text-center py-8">
                <div className="mb-4">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Yaklaşan ödeme yok</h4>
                <p className="text-gray-600">Ödeme planları oluşturulduğunda vadesi yaklaşan ödemeler burada görünecek.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Report Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Mali Raporlar</h3>
              <div className="flex gap-3">
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option>Bu Ay</option>
                  <option>Son 3 Ay</option>
                  <option>Bu Yıl</option>
                  <option>Özel Tarih</option>
                </select>
                <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Rapor İndir
                </button>
              </div>
            </div>

            {/* Quick Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <Download className="h-5 w-5 text-green-500" />
                </div>
                <h4 className="font-semibold text-green-900 mb-1">Gelir-Gider Raporu</h4>
                <p className="text-sm text-green-700">Aylık gelir ve gider analizi</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  <Download className="h-5 w-5 text-blue-500" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-1">Nakit Akış</h4>
                <p className="text-sm text-blue-700">Nakit giriş-çıkış analizi</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <PieChart className="h-8 w-8 text-purple-600" />
                  <Download className="h-5 w-5 text-purple-500" />
                </div>
                <h4 className="font-semibold text-purple-900 mb-1">Kategori Analizi</h4>
                <p className="text-sm text-purple-700">Gelir-gider kategori dağılımı</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <Calculator className="h-8 w-8 text-orange-600" />
                  <Download className="h-5 w-5 text-orange-500" />
                </div>
                <h4 className="font-semibold text-orange-900 mb-1">Kar-Zarar</h4>
                <p className="text-sm text-orange-700">Dönemsel kar-zarar tablosu</p>
              </div>
            </div>
          </div>

          {/* Financial Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Aylık Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Aylık Finansal Trend</h3>
                <LineChart className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="text-center py-8">
                <div className="mb-4">
                  <LineChart className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz finansal veri yok</h4>
                <p className="text-gray-600">İşlemler eklenmeye başlandığında aylık trendler burada görünecek.</p>
              </div>
            </div>

            {/* Kategori Performansı */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Kategori Performansı</h3>
                <Target className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="mb-4">
                    <Target className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz kategori performans verisi yok</h4>
                  <p className="text-gray-600">İşlemler eklenmeye başlandığında kategori bazlı performans analizi burada görünecek.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Financial Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Detaylı Mali Özet</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">Bu Ay</button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-full">Bu Yıl</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Gelir Detayı */}
              <div>
                <h4 className="text-lg font-medium text-green-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Gelir Detayı
                </h4>
                <div className="text-center py-8">
                  <div className="mb-4">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz gelir verisi yok</h4>
                  <p className="text-gray-600">Gelir işlemleri eklenmeye başlandığında detaylar burada görünecek.</p>
                </div>
              </div>

              {/* Gider Detayı */}
              <div>
                <h4 className="text-lg font-medium text-red-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Gider Detayı
                </h4>
                <div className="text-center py-8">
                  <div className="mb-4">
                    <TrendingDown className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz gider verisi yok</h4>
                  <p className="text-gray-600">Gider işlemleri eklenmeye başlandığında detaylar burada görünecek.</p>
                </div>
              </div>

              {/* Karlılık Analizi */}
              <div>
                <h4 className="text-lg font-medium text-blue-800 mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Karlılık Analizi
                </h4>
                <div className="text-center py-8">
                  <div className="mb-4">
                    <Calculator className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz karlılık verisi yok</h4>
                  <p className="text-gray-600">Gelir ve gider işlemleri eklenmeye başlandığında karlılık analizi burada görünecek.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Yeni İşlem Ekle</h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-6">
              {/* İşlem Tipi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">İşlem Tipi</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'income', category: '' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      transactionForm.type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">Gelir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'expense', category: '' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      transactionForm.type === 'expense'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">Gider</span>
                  </button>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={transactionForm.category}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value, subcategory: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {Object.entries(transactionForm.type === 'income' ? incomeCategories : expenseCategories).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>
              </div>

              {/* Alt Kategori */}
              {transactionForm.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alt Kategori</label>
                  <select
                    value={transactionForm.subcategory}
                    onChange={(e) => setTransactionForm({ ...transactionForm, subcategory: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Alt kategori seçin (opsiyonel)</option>
                    {(transactionForm.type === 'income' ? incomeCategories : expenseCategories)[transactionForm.category as keyof typeof incomeCategories]?.subcategories.map((sub: string) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tutar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tutar (₺)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="number"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Tarih */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tarih</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Ödeme Yöntemi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Ödeme Yöntemi</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { value: 'cash', label: 'Nakit', icon: <Banknote className="h-5 w-5" /> },
                    { value: 'card', label: 'Kart', icon: <CreditCardIcon className="h-5 w-5" /> },
                    { value: 'bank_transfer', label: 'Havale', icon: <Building className="h-5 w-5" /> },
                    { value: 'check', label: 'Çek', icon: <FileText className="h-5 w-5" /> },
                    { value: 'digital', label: 'Dijital', icon: <Smartphone className="h-5 w-5" /> }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setTransactionForm({ ...transactionForm, paymentMethod: method.value as any })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        transactionForm.paymentMethod === method.value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {method.icon}
                        <span className="text-xs font-medium">{method.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="İşlem detaylarını yazın..."
                  required
                />
              </div>

              {/* Referans */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referans (Opsiyonel)</label>
                <input
                  type="text"
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Fatura no, referans kodu vb."
                />
              </div>

              {/* Butonlar */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/25 transition-all"
                >
                  İşlemi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Yeni Bütçe Oluştur</h2>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleBudgetSubmit} className="space-y-6">
              {/* Bütçe Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Bütçe Türü</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'income' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      budgetForm.type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">Gelir Hedefi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'expense' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      budgetForm.type === 'expense'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">Gider Bütçesi</span>
                  </button>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {Object.entries(budgetForm.type === 'income' ? incomeCategories : expenseCategories).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bütçe Tutarı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {budgetForm.type === 'income' ? 'Hedef Tutar (₺)' : 'Bütçe Tutarı (₺)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="number"
                      value={budgetForm.amount}
                      onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Dönem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
                  <select
                    value={budgetForm.period}
                    onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Dönem seçin</option>
                    <option value={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}>
                      Bu Ay ({new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })})
                    </option>
                    <option value={`${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`}>
                      Bu Çeyrek (Q{Math.ceil((new Date().getMonth() + 1) / 3)} {new Date().getFullYear()})
                    </option>
                    <option value={new Date().getFullYear().toString()}>
                      Bu Yıl ({new Date().getFullYear()})
                    </option>
                  </select>
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama (Opsiyonel)</label>
                <textarea
                  value={budgetForm.description}
                  onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Bütçe ile ilgili notlar..."
                />
              </div>

              {/* Bütçe Önizlemesi */}
              {budgetForm.amount && budgetForm.category && (
                <div className={`rounded-lg p-6 border ${
                  budgetForm.type === 'income' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    budgetForm.type === 'income' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Bütçe Önizlemesi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className={`text-2xl font-bold ${
                        budgetForm.type === 'income' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        ₺{parseFloat(budgetForm.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm ${
                        budgetForm.type === 'income' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {budgetForm.type === 'income' ? 'Hedef Tutar' : 'Bütçe Tutarı'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${
                        budgetForm.type === 'income' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {(budgetForm.type === 'income' ? incomeCategories : expenseCategories)[budgetForm.category as keyof typeof incomeCategories]?.name}
                      </p>
                      <p className={`text-sm ${
                        budgetForm.type === 'income' ? 'text-green-700' : 'text-red-700'
                      }`}>Kategori</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${
                        budgetForm.type === 'income' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {budgetForm.period.includes('-Q') ? 'Çeyrek' : 
                         budgetForm.period.includes('-') ? 'Aylık' : 'Yıllık'}
                      </p>
                      <p className={`text-sm ${
                        budgetForm.type === 'income' ? 'text-green-700' : 'text-red-700'
                      }`}>Dönem</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  Bütçe Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Yeni Ödeme Planı Oluştur</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handlePaymentPlanSubmit} className="space-y-6">
              {/* Öğrenci Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Öğrenci</label>
                <select
                  value={paymentPlanForm.studentId}
                  onChange={(e) => {
                    const selectedStudent = students.find(s => s.id === e.target.value);
                    setPaymentPlanForm({ 
                      ...paymentPlanForm, 
                      studentId: e.target.value,
                      studentName: selectedStudent?.fullName || ''
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Öğrenci seçin</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} - {student.branchName} / {student.groupName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Toplam Tutar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Toplam Tutar (₺)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="number"
                      value={paymentPlanForm.totalAmount}
                      onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, totalAmount: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Taksit Sayısı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taksit Sayısı</label>
                  <input
                    type="number"
                    value={paymentPlanForm.installmentCount}
                    onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, installmentCount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12"
                    min="1"
                    max="36"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* İlk Ödeme Tarihi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İlk Ödeme Tarihi</label>
                  <input
                    type="date"
                    value={paymentPlanForm.firstPaymentDate}
                    onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, firstPaymentDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Ödeme Periyodu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Periyodu</label>
                  <select
                    value={paymentPlanForm.paymentPeriod}
                    onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, paymentPeriod: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="monthly">Aylık</option>
                    <option value="weekly">Haftalık</option>
                    <option value="quarterly">3 Aylık</option>
                  </select>
                </div>
              </div>

              {/* Plan Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Plan Türü</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'membership', label: 'Üyelik Aidatı', icon: <Users className="h-6 w-6" /> },
                    { value: 'training', label: 'Antrenman Ücreti', icon: <Trophy className="h-6 w-6" /> },
                    { value: 'custom', label: 'Özel Plan', icon: <Settings className="h-6 w-6" /> }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPaymentPlanForm({ ...paymentPlanForm, planType: type.value as any })}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        paymentPlanForm.planType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {type.icon}
                        <span className="font-medium">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Notları (Opsiyonel)</label>
                <textarea
                  value={paymentPlanForm.notes}
                  onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ödeme planı ile ilgili özel notlar..."
                />
              </div>

              {/* Taksit Önizlemesi */}
              {paymentPlanForm.totalAmount && paymentPlanForm.installmentCount && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Taksit Önizlemesi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        ₺{(parseFloat(paymentPlanForm.totalAmount) / parseInt(paymentPlanForm.installmentCount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-blue-700">Taksit Tutarı</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{paymentPlanForm.installmentCount}</p>
                      <p className="text-sm text-blue-700">Taksit Sayısı</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        ₺{parseFloat(paymentPlanForm.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-blue-700">Toplam Tutar</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  Ödeme Planı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && selectedPaymentPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Ödeme Planı Detayları</h2>
              <button
                onClick={() => setShowPaymentDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Plan Overview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">{selectedPaymentPlan.studentName}</h3>
                  <p className="text-blue-700">
                    {selectedPaymentPlan.planType === 'membership' ? 'Üyelik Planı' : 
                     selectedPaymentPlan.planType === 'training' ? 'Antrenman Planı' : 'Özel Plan'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedPaymentPlan.paymentPeriod === 'monthly' ? 'Aylık' : 
                     selectedPaymentPlan.paymentPeriod === 'weekly' ? 'Haftalık' : 'Üç Aylık'} ödemeler
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-900">₺{selectedPaymentPlan.totalAmount.toLocaleString()}</div>
                  <p className="text-blue-700">Toplam Tutar</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      selectedPaymentPlan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      selectedPaymentPlan.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedPaymentPlan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedPaymentPlan.status === 'active' && <Clock className="h-3 w-3" />}
                      {selectedPaymentPlan.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      {selectedPaymentPlan.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                      {selectedPaymentPlan.status === 'active' ? 'Aktif' :
                       selectedPaymentPlan.status === 'completed' ? 'Tamamlandı' :
                       selectedPaymentPlan.status === 'overdue' ? 'Gecikmiş' : 'İptal'}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₺{selectedPaymentPlan.paidAmount.toLocaleString()}</div>
                  <p className="text-gray-600">Ödenen Tutar</p>
                  <div className="text-sm text-gray-500 mt-1">
                    Kalan: ₺{selectedPaymentPlan.remainingAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-blue-700 mb-2">
                  <span>İlerleme</span>
                  <span>%{selectedPaymentPlan.totalAmount > 0 ? ((selectedPaymentPlan.paidAmount / selectedPaymentPlan.totalAmount) * 100).toFixed(1) : 0}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${selectedPaymentPlan.totalAmount > 0 ? (selectedPaymentPlan.paidAmount / selectedPaymentPlan.totalAmount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Installments Table */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Taksit Detayları</h3>
                <p className="text-sm text-gray-600">Ödeme planı taksitleri ve durumları</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taksit No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vade Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPaymentPlan.installments.map((installment, index) => (
                      <tr key={installment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}. Taksit
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₺{installment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(installment.dueDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {installment.paidDate ? new Date(installment.paidDate).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            installment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            installment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {installment.status === 'paid' && <CheckCircle2 className="h-3 w-3" />}
                            {installment.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                            {installment.status === 'pending' && <Clock className="h-3 w-3" />}
                            {installment.status === 'paid' ? 'Ödendi' :
                             installment.status === 'overdue' ? 'Gecikmiş' : 'Bekliyor'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedPaymentPlan.notes && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notlar</h4>
                <p className="text-sm text-gray-700">{selectedPaymentPlan.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowPaymentDetailsModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Kapat
              </button>
              {selectedPaymentPlan.status !== 'completed' && (
                <button
                  onClick={() => {
                    setShowPaymentDetailsModal(false);
                    setShowMakePaymentModal(true);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Ödeme Al
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Make Payment Modal */}
      {showMakePaymentModal && selectedPaymentPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Ödeme Al</h2>
              <button
                onClick={() => setShowMakePaymentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Student Info */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">{selectedPaymentPlan.studentName}</h3>
                  <p className="text-green-700">Kalan Borç: ₺{selectedPaymentPlan.remainingAmount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-600">Toplam Tutar</div>
                  <div className="text-xl font-bold text-green-900">₺{selectedPaymentPlan.totalAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Unpaid Installments */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bekleyen Taksitler</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedPaymentPlan.installments
                  .filter(installment => installment.status !== 'paid')
                  .map((installment, index) => {
                    const isOverdue = new Date(installment.dueDate) < new Date() && installment.status !== 'paid';
                    return (
                      <label key={installment.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          defaultChecked={index === 0} // İlk taksit varsayılan olarak seçili
                        />
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">
                                {selectedPaymentPlan.installments.findIndex(i => i.id === installment.id) + 1}. Taksit
                              </span>
                              {isOverdue && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  Gecikmiş
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900">₺{installment.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Vade: {new Date(installment.dueDate).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Payment Details Form */}
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ödeme Yöntemi *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="cash">Nakit</option>
                    <option value="card">Kredi/Banka Kartı</option>
                    <option value="bank_transfer">Havale/EFT</option>
                    <option value="check">Çek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ödeme Tarihi *
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referans/Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Makbuz no, dekont no vb..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Total Amount Summary */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">Ödenecek Toplam Tutar:</span>
                  <span className="text-xl font-bold text-green-900">₺0</span>
                </div>
                <div className="text-sm text-green-600 mt-1">Seçili taksitlerin toplamı</div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMakePaymentModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ödemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Transaction form submit handler
  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const transactionData: any = {
        type: transactionForm.type,
        category: transactionForm.category,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description.trim(),
        date: transactionForm.date,
        paymentMethod: transactionForm.paymentMethod,
        status: 'completed' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Only add optional fields if they have content
      if (transactionForm.subcategory) {
        transactionData.subcategory = transactionForm.subcategory;
      }
      
      if (transactionForm.reference.trim()) {
        transactionData.reference = transactionForm.reference.trim();
      }

      await addDoc(collection(db, 'financial_transactions'), transactionData);
      
      // Reset form
      setTransactionForm({
        type: 'income',
        category: '',
        subcategory: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        studentId: '',
        reference: ''
      });
      
      setShowTransactionModal(false);
    } catch (error) {
      console.error('İşlem kaydetme hatası:', error);
    }
  }

  // Payment plan form submit handler
  async function handlePaymentPlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const totalAmount = parseFloat(paymentPlanForm.totalAmount);
      const installmentCount = parseInt(paymentPlanForm.installmentCount);
      const installmentAmount = totalAmount / installmentCount;
      
      // Generate installments
      const installments: PaymentInstallment[] = [];
      const firstPaymentDate = new Date(paymentPlanForm.firstPaymentDate);
      
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(firstPaymentDate);
        
        // Calculate due date based on payment period
        switch (paymentPlanForm.paymentPeriod) {
          case 'weekly':
            dueDate.setDate(firstPaymentDate.getDate() + (i * 7));
            break;
          case 'monthly':
            dueDate.setMonth(firstPaymentDate.getMonth() + i);
            break;
          case 'quarterly':
            dueDate.setMonth(firstPaymentDate.getMonth() + (i * 3));
            break;
        }
        
        installments.push({
          id: `installment_${i + 1}`,
          amount: installmentAmount,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }
      
      const paymentPlanData: any = {
        studentId: paymentPlanForm.studentId,
        studentName: paymentPlanForm.studentName,
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        installments,
        status: 'active',
        planType: paymentPlanForm.planType,
        paymentPeriod: paymentPlanForm.paymentPeriod,
        createdAt: Timestamp.now()
      };

      // Only add notes if it has content
      if (paymentPlanForm.notes.trim()) {
        paymentPlanData.notes = paymentPlanForm.notes.trim();
      }

      await addDoc(collection(db, 'payment_plans'), paymentPlanData);
      
      // Reset form
      setPaymentPlanForm({
        studentId: '',
        studentName: '',
        totalAmount: '',
        installmentCount: '',
        firstPaymentDate: new Date().toISOString().split('T')[0],
        paymentPeriod: 'monthly',
        planType: 'membership',
        notes: ''
      });
      
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Ödeme planı kaydetme hatası:', error);
    }
  }

  // Budget form submit handler
  async function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const budgetData: any = {
        type: budgetForm.type,
        category: budgetForm.category,
        budgetedAmount: parseFloat(budgetForm.amount),
        spentAmount: 0,
        period: budgetForm.period,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Only add description if it has content
      if (budgetForm.description.trim()) {
        budgetData.description = budgetForm.description.trim();
      }

      await addDoc(collection(db, 'budgets'), budgetData);
      
      // Reset form
      setBudgetForm({
        type: 'income',
        category: '',
        amount: '',
        period: '',
        description: ''
      });
      
      setShowBudgetModal(false);
    } catch (error) {
      console.error('Bütçe kaydetme hatası:', error);
    }
  }
}
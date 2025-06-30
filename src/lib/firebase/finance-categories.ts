import { FinancialCategory } from './finance-service';

// Default financial categories for sports clubs
export const defaultFinancialCategories: Omit<FinancialCategory, 'id' | 'clubId' | 'createdAt'>[] = [
  // INCOME CATEGORIES
  {
    name: 'Üyelik Aidatları',
    type: 'income',
    icon: 'users',
    color: '#10B981',
    isActive: true
  },
  {
    name: 'Antrenman Ücretleri',
    type: 'income',
    icon: 'trophy',
    color: '#3B82F6',
    isActive: true
  },
  {
    name: 'Özel Ders Ücretleri',
    type: 'income',
    icon: 'star',
    color: '#8B5CF6',
    isActive: true
  },
  {
    name: 'Turnuva/Maç Gelirleri',
    type: 'income',
    icon: 'target',
    color: '#F59E0B',
    isActive: true
  },
  {
    name: 'Ekipman Satışı',
    type: 'income',
    icon: 'shirt',
    color: '#EF4444',
    isActive: true
  },
  {
    name: 'Sponsorluk Gelirleri',
    type: 'income',
    icon: 'heart',
    color: '#EC4899',
    isActive: true
  },
  {
    name: 'Kamp/Etkinlik Ücretleri',
    type: 'income',
    icon: 'globe',
    color: '#06B6D4',
    isActive: true
  },
  {
    name: 'Diğer Gelirler',
    type: 'income',
    icon: 'circle-dollar-sign',
    color: '#84CC16',
    isActive: true
  },

  // EXPENSE CATEGORIES
  {
    name: 'Antrenör Maaşları',
    type: 'expense',
    icon: 'users',
    color: '#DC2626',
    isActive: true
  },
  {
    name: 'Tesis Kirası',
    type: 'expense',
    icon: 'building',
    color: '#7C2D12',
    isActive: true
  },
  {
    name: 'Ekipman Alımı',
    type: 'expense',
    icon: 'shirt',
    color: '#B91C1C',
    isActive: true
  },
  {
    name: 'Saha/Salon Kirası',
    type: 'expense',
    icon: 'building',
    color: '#991B1B',
    isActive: true
  },
  {
    name: 'Ulaşım Giderleri',
    type: 'expense',
    icon: 'car',
    color: '#7F1D1D',
    isActive: true
  },
  {
    name: 'Yemek/İkram',
    type: 'expense',
    icon: 'utensils',
    color: '#EF4444',
    isActive: true
  },
  {
    name: 'Sigorta Giderleri',
    type: 'expense',
    icon: 'shield',
    color: '#DC2626',
    isActive: true
  },
  {
    name: 'Reklam/Pazarlama',
    type: 'expense',
    icon: 'megaphone',
    color: '#B91C1C',
    isActive: true
  },
  {
    name: 'Elektrik/Su/Doğalgaz',
    type: 'expense',
    icon: 'zap',
    color: '#991B1B',
    isActive: true
  },
  {
    name: 'Bakım/Onarım',
    type: 'expense',
    icon: 'wrench',
    color: '#7F1D1D',
    isActive: true
  },
  {
    name: 'Temizlik Giderleri',
    type: 'expense',
    icon: 'spray-can',
    color: '#EF4444',
    isActive: true
  },
  {
    name: 'Kırtasiye Giderleri',
    type: 'expense',
    icon: 'file-text',
    color: '#DC2626',
    isActive: true
  },
  {
    name: 'Diğer Giderler',
    type: 'expense',
    icon: 'minus-circle',
    color: '#B91C1C',
    isActive: true
  }
];

// Payment method options
export const paymentMethods = [
  { value: 'cash', label: 'Nakit', icon: 'banknote' },
  { value: 'card', label: 'Kredi/Banka Kartı', icon: 'credit-card' },
  { value: 'transfer', label: 'Banka Havalesi', icon: 'smartphone' },
  { value: 'check', label: 'Çek', icon: 'file-text' }
];

// Transaction status options
export const transactionStatuses = [
  { value: 'pending', label: 'Beklemede', color: 'orange' },
  { value: 'completed', label: 'Tamamlandı', color: 'green' },
  { value: 'cancelled', label: 'İptal Edildi', color: 'red' }
];

// Transaction type options
export const transactionTypes = [
  { value: 'income', label: 'Gelir', color: 'green' },
  { value: 'expense', label: 'Gider', color: 'red' }
];
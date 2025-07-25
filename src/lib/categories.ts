// Ortak kategori sistemi - Transaction ve Budget için aynı kategoriler

export const incomeCategories = [
  'Üyelik Aidatı',
  'Sponsorluk',
  'Bağış',
  'Etkinlik Geliri',
  'Ders Ücreti',
  'Kamp Geliri',
  'Diğer Gelir'
];

export const expenseCategories = [
  'Antrenör Ücretleri',
  'Ekipman',
  'Tesis Bakım',
  'Utilities',
  'Marketing',
  'Turnuva/Organizasyon',
  'Sağlık/Sigorta',
  'Ulaşım',
  'Beslenme',
  'Kırtasiye',
  'Diğer Gider'
];

// Sabit gider kategorileri
export const recurringExpenseCategories = [
  'Antrenör Ücretleri',
  'Kira',
  'Elektrik',
  'Su',
  'Doğalgaz',
  'İnternet',
  'Telefon',
  'Muhasebe',
  'Sigorta',
  'Temizlik',
  'Güvenlik',
  'Maintenance',
  'Lisans Ücretleri',
  'Diğer Sabit Gider'
];

// Tüm kategoriler (gelir + gider) - Bütçe için kullanılacak
export const allCategories = [
  ...incomeCategories,
  ...expenseCategories
];

// Kategori tipini belirleyen fonksiyon
export const getCategoryType = (category: string): 'income' | 'expense' | null => {
  if (incomeCategories.includes(category)) return 'income';
  if (expenseCategories.includes(category)) return 'expense';
  return null;
};
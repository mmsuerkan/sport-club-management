'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Filter,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  FileSpreadsheet,
  FilePlus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  FileDown,
  RefreshCw,
  Settings,
  Share2,
  Printer,
  Mail,
  Archive,
  Trash2,
  FolderOpen,
  FileCheck,
  CalendarDays,
  Receipt,
  Trophy,
  Target,
  BookOpen,
  ChartBar,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { createListener } from '@/lib/firebase/listener-utils';
import { uploadReportToStorage, deleteReportFromStorage, getFileSizeInKB, sanitizeFileName, parseStoragePath } from '@/lib/firebase/storage-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// jsPDF için Türkçe karakter desteği
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface Report {
  id: string;
  name: string;
  type: 'financial' | 'student' | 'training' | 'performance' | 'custom';
  format: 'pdf' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  createdAt: Timestamp;
  createdBy: string;
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  storagePath?: string;
  size?: number;
  parameters?: any;
  description?: string;
  fileName?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: Report['type'];
  icon: JSX.Element;
  color: string;
  parameters: {
    name: string;
    type: 'date' | 'select' | 'multiselect' | 'text';
    label: string;
    required: boolean;
    options?: { value: string; label: string }[];
  }[];
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportParameters, setReportParameters] = useState<any>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<Report['type'] | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Rapor şablonları
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'financial-summary',
      name: 'Finansal Özet Raporu',
      description: 'Gelir-gider özeti, bütçe analizi ve finansal performans',
      type: 'financial',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-600',
      parameters: [
        { name: 'dateRange', type: 'date', label: 'Tarih Aralığı', required: true },
        { name: 'includeCharts', type: 'select', label: 'Grafikler Dahil', required: true, 
          options: [{ value: 'yes', label: 'Evet' }, { value: 'no', label: 'Hayır' }] },
        { name: 'categories', type: 'multiselect', label: 'Kategoriler', required: false,
          options: [
            { value: 'income', label: 'Gelirler' },
            { value: 'expense', label: 'Giderler' },
            { value: 'budget', label: 'Bütçe' }
          ]
        }
      ]
    },
    {
      id: 'student-list',
      name: 'Öğrenci Listesi',
      description: 'Aktif öğrenciler, branşlar ve iletişim bilgileri',
      type: 'student',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-indigo-600',
      parameters: [
        { name: 'status', type: 'select', label: 'Öğrenci Durumu', required: true,
          options: [
            { value: 'all', label: 'Tümü' },
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Pasif' }
          ]
        },
        { name: 'branches', type: 'multiselect', label: 'Branşlar', required: false,
          options: [
            { value: 'basketball', label: 'Basketbol' },
            { value: 'football', label: 'Futbol' },
            { value: 'volleyball', label: 'Voleybol' }
          ]
        },
        { name: 'includePaymentStatus', type: 'select', label: 'Ödeme Durumu Dahil', required: false,
          options: [{ value: 'yes', label: 'Evet' }, { value: 'no', label: 'Hayır' }]
        }
      ]
    },
    {
      id: 'training-schedule',
      name: 'Antrenman Programı',
      description: 'Haftalık ve aylık antrenman programları',
      type: 'training',
      icon: <Calendar className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-600',
      parameters: [
        { name: 'period', type: 'select', label: 'Dönem', required: true,
          options: [
            { value: 'week', label: 'Haftalık' },
            { value: 'month', label: 'Aylık' },
            { value: 'custom', label: 'Özel Tarih' }
          ]
        },
        { name: 'groups', type: 'multiselect', label: 'Gruplar', required: false },
        { name: 'trainers', type: 'multiselect', label: 'Antrenörler', required: false }
      ]
    },
    {
      id: 'performance-analysis',
      name: 'Performans Analizi',
      description: 'Sporcu performans raporları ve gelişim grafikleri',
      type: 'performance',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-orange-500 to-red-600',
      parameters: [
        { name: 'dateRange', type: 'date', label: 'Tarih Aralığı', required: true },
        { name: 'students', type: 'multiselect', label: 'Öğrenciler', required: false },
        { name: 'metrics', type: 'multiselect', label: 'Metrikler', required: true,
          options: [
            { value: 'attendance', label: 'Devam Durumu' },
            { value: 'skills', label: 'Beceri Gelişimi' },
            { value: 'matches', label: 'Maç Performansı' }
          ]
        }
      ]
    },
    {
      id: 'custom-report',
      name: 'Özel Rapor',
      description: 'Kendi kriterlerinize göre özelleştirilmiş rapor',
      type: 'custom',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      color: 'from-gray-500 to-gray-700',
      parameters: [
        { name: 'reportName', type: 'text', label: 'Rapor Adı', required: true },
        { name: 'description', type: 'text', label: 'Açıklama', required: false },
        { name: 'dataSource', type: 'multiselect', label: 'Veri Kaynakları', required: true,
          options: [
            { value: 'students', label: 'Öğrenciler' },
            { value: 'trainings', label: 'Antrenmanlar' },
            { value: 'finance', label: 'Finansal' },
            { value: 'matches', label: 'Maçlar' }
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    const unsubscribe = createListener(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Report));
        setReports(reportsData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Rapor oluşturma
  const generateReport = async () => {
    if (!selectedTemplate) return;
    
    setGeneratingReport(true);
    try {
      // Rapor verisini hazırla
      const reportData: Partial<Report> = {
        name: selectedTemplate.name,
        type: selectedTemplate.type,
        format: reportParameters.format || 'pdf',
        dateRange: reportParameters.dateRange || { start: '', end: '' },
        createdAt: Timestamp.now(),
        createdBy: 'current-user', // Auth'dan alınacak
        status: 'generating',
        parameters: reportParameters,
        description: selectedTemplate.description
      };

      // Raporu veritabanına kaydet
      const docRef = await addDoc(collection(db, 'reports'), reportData);

      // Rapor oluşturma simülasyonu (gerçek uygulamada backend'de yapılacak)
      setTimeout(async () => {
        // Raporu oluştur
        if (reportParameters.format === 'pdf') {
          await generatePDFReport(selectedTemplate, reportParameters, docRef.id);
        } else {
          await generateExcelReport(selectedTemplate, reportParameters, docRef.id);
        }

        // Rapor durumunu güncelle
        await updateDoc(doc(db, 'reports', docRef.id), {
          status: 'completed',
          size: Math.floor(Math.random() * 5000) + 500 // KB cinsinden örnek boyut
        });

        setGeneratingReport(false);
        setShowCreateModal(false);
        setSelectedTemplate(null);
        setReportParameters({});
      }, 3000);
    } catch (error) {
      console.error('Rapor oluşturma hatası:', error);
      setGeneratingReport(false);
    }
  };

  // PDF rapor oluşturma
  const generatePDFReport = async (template: ReportTemplate, parameters: any, reportId: string) => {
    const pdf = new jsPDF();
    
    // Başlık
    pdf.setFontSize(20);
    pdf.text(template.name, 20, 20);
    
    // Tarih bilgisi
    pdf.setFontSize(12);
    pdf.text(`Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
    
    // Parametre bilgileri
    if (parameters.dateRange) {
      pdf.text(`Tarih Aralığı: ${parameters.dateRange.start} - ${parameters.dateRange.end}`, 20, 40);
    }
    
    // İçerik (örnek)
    pdf.setFontSize(14);
    pdf.text('Rapor İçeriği', 20, 60);
    
    // Tablo örneği
    if (template.type === 'financial') {
      autoTable(pdf, {
        head: [['Tarih', 'Kategori', 'Açıklama', 'Tutar', 'Bakiye']],
        body: [
          ['01.01.2024', 'Gelir', 'Aidat Ödemesi - Ocak', '2,500 TL', '+2,500 TL'],
          ['02.01.2024', 'Gider', 'Antrenör Maaşı', '1,200 TL', '+1,300 TL'],
          ['03.01.2024', 'Gelir', 'Sponsorluk Anlaşması', '5,000 TL', '+6,300 TL'],
          ['05.01.2024', 'Gider', 'Ekipman Alımı', '800 TL', '+5,500 TL'],
          ['10.01.2024', 'Gelir', 'Kamp Ücreti', '1,500 TL', '+7,000 TL'],
          ['15.01.2024', 'Gider', 'Tesis Kirası', '2,000 TL', '+5,000 TL'],
        ],
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      // Özet bilgileri ekle
      pdf.setFontSize(12);
      pdf.text('Finansal Özet:', 20, pdf.lastAutoTable?.finalY + 20 || 150);
      pdf.text('Toplam Gelir: 9,000 TL', 30, pdf.lastAutoTable?.finalY + 30 || 160);
      pdf.text('Toplam Gider: 4,000 TL', 30, pdf.lastAutoTable?.finalY + 40 || 170);
      pdf.text('Net Kar: 5,000 TL', 30, pdf.lastAutoTable?.finalY + 50 || 180);
      
    } else if (template.type === 'student') {
      autoTable(pdf, {
        head: [['Ad Soyad', 'Branş', 'Telefon', 'E-posta', 'Kayıt Tarihi', 'Durum']],
        body: [
          ['Ahmet Yılmaz', 'Basketbol', '0532 123 4567', 'ahmet@email.com', '15.09.2023', 'Aktif'],
          ['Ayşe Demir', 'Voleybol', '0533 987 6543', 'ayse@email.com', '20.09.2023', 'Aktif'],
          ['Mehmet Kaya', 'Futbol', '0534 555 1234', 'mehmet@email.com', '25.09.2023', 'Aktif'],
          ['Fatma Özkan', 'Basketbol', '0535 444 5678', 'fatma@email.com', '01.10.2023', 'Pasif'],
          ['Can Şahin', 'Futbol', '0536 777 8899', 'can@email.com', '10.10.2023', 'Aktif'],
        ],
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 8, cellPadding: 2 }
      });
      
    } else if (template.type === 'training') {
      autoTable(pdf, {
        head: [['Tarih', 'Saat', 'Branş', 'Antrenör', 'Grup', 'Katılımcı Sayısı']],
        body: [
          ['Pazartesi', '16:00-17:30', 'Basketbol', 'Ahmet Hoca', 'U-14 Erkek', '12/15'],
          ['Pazartesi', '17:30-19:00', 'Basketbol', 'Mehmet Hoca', 'U-16 Kız', '10/12'],
          ['Salı', '16:00-17:30', 'Futbol', 'Ali Hoca', 'U-12 Erkek', '18/20'],
          ['Çarşamba', '15:00-16:30', 'Voleybol', 'Ayşe Hoca', 'U-15 Kız', '14/16'],
          ['Perşembe', '17:00-18:30', 'Basketbol', 'Ahmet Hoca', 'U-18 Erkek', '8/10'],
        ],
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [155, 89, 182] },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
    } else {
      // Diğer rapor tipleri için basit tablo
      autoTable(pdf, {
        head: [['Metrik', 'Değer', 'Hedef', 'Durum']],
        body: [
          ['Toplam Üye Sayısı', '45', '50', 'İyi'],
          ['Aylık Gelir', '12,500 TL', '15,000 TL', 'Orta'],
          ['Antrenman Sayısı', '24', '20', 'Mükemmel'],
          ['Katılım Oranı', '%85', '%80', 'İyi'],
        ],
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [255, 152, 0] },
        styles: { fontSize: 10, cellPadding: 3 }
      });
    }
    
    // PDF'i blob olarak oluştur
    const pdfBlob = pdf.output('blob');
    
    try {
      // Dosya adını oluştur
      const fileName = sanitizeFileName(`${template.name}_${new Date().toISOString().split('T')[0]}`);
      
      // Firebase Storage'a yükle
      const downloadURL = await uploadReportToStorage(pdfBlob, fileName, reportId, 'pdf');
      
      // Dosya boyutunu hesapla
      const fileSize = getFileSizeInKB(pdfBlob);
      
      // Storage path'ini al
      const storagePath = parseStoragePath(downloadURL);
      
      // Rapor bilgilerini güncelle
      await updateDoc(doc(db, 'reports', reportId), {
        fileUrl: downloadURL,
        storagePath: storagePath,
        size: fileSize,
        fileName: `${fileName}.pdf`,
        status: 'completed'
      });
      
      console.log('PDF raporu başarıyla oluşturuldu ve Storage\'a yüklendi');
      
    } catch (error) {
      console.error('PDF Storage yükleme hatası:', error);
      
      // Hata durumunda rapor durumunu güncelle
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'failed'
      });
    }
  };

  // Excel rapor oluşturma
  const generateExcelReport = async (template: ReportTemplate, parameters: any, reportId: string) => {
    try {
      let data: any[] = [];
      
      // Rapor tipine göre farklı veri setleri
      if (template.type === 'financial') {
        data = [
          { Tarih: '01.01.2024', Kategori: 'Gelir', Açıklama: 'Aidat Ödemesi - Ocak', Tutar: 2500, Bakiye: 2500 },
          { Tarih: '02.01.2024', Kategori: 'Gider', Açıklama: 'Antrenör Maaşı', Tutar: -1200, Bakiye: 1300 },
          { Tarih: '03.01.2024', Kategori: 'Gelir', Açıklama: 'Sponsorluk Anlaşması', Tutar: 5000, Bakiye: 6300 },
          { Tarih: '05.01.2024', Kategori: 'Gider', Açıklama: 'Ekipman Alımı', Tutar: -800, Bakiye: 5500 },
          { Tarih: '10.01.2024', Kategori: 'Gelir', Açıklama: 'Kamp Ücreti', Tutar: 1500, Bakiye: 7000 },
          { Tarih: '15.01.2024', Kategori: 'Gider', Açıklama: 'Tesis Kirası', Tutar: -2000, Bakiye: 5000 },
        ];
      } else if (template.type === 'student') {
        data = [
          { 'Ad Soyad': 'Ahmet Yılmaz', Branş: 'Basketbol', Telefon: '0532 123 4567', 'E-posta': 'ahmet@email.com', 'Kayıt Tarihi': '15.09.2023', Durum: 'Aktif' },
          { 'Ad Soyad': 'Ayşe Demir', Branş: 'Voleybol', Telefon: '0533 987 6543', 'E-posta': 'ayse@email.com', 'Kayıt Tarihi': '20.09.2023', Durum: 'Aktif' },
          { 'Ad Soyad': 'Mehmet Kaya', Branş: 'Futbol', Telefon: '0534 555 1234', 'E-posta': 'mehmet@email.com', 'Kayıt Tarihi': '25.09.2023', Durum: 'Aktif' },
          { 'Ad Soyad': 'Fatma Özkan', Branş: 'Basketbol', Telefon: '0535 444 5678', 'E-posta': 'fatma@email.com', 'Kayıt Tarihi': '01.10.2023', Durum: 'Pasif' },
          { 'Ad Soyad': 'Can Şahin', Branş: 'Futbol', Telefon: '0536 777 8899', 'E-posta': 'can@email.com', 'Kayıt Tarihi': '10.10.2023', Durum: 'Aktif' },
        ];
      } else if (template.type === 'training') {
        data = [
          { Gün: 'Pazartesi', Saat: '16:00-17:30', Branş: 'Basketbol', Antrenör: 'Ahmet Hoca', Grup: 'U-14 Erkek', 'Katılımcı': '12/15' },
          { Gün: 'Pazartesi', Saat: '17:30-19:00', Branş: 'Basketbol', Antrenör: 'Mehmet Hoca', Grup: 'U-16 Kız', 'Katılımcı': '10/12' },
          { Gün: 'Salı', Saat: '16:00-17:30', Branş: 'Futbol', Antrenör: 'Ali Hoca', Grup: 'U-12 Erkek', 'Katılımcı': '18/20' },
          { Gün: 'Çarşamba', Saat: '15:00-16:30', Branş: 'Voleybol', Antrenör: 'Ayşe Hoca', Grup: 'U-15 Kız', 'Katılımcı': '14/16' },
          { Gün: 'Perşembe', Saat: '17:00-18:30', Branş: 'Basketbol', Antrenör: 'Ahmet Hoca', Grup: 'U-18 Erkek', 'Katılımcı': '8/10' },
        ];
      } else {
        data = [
          { Metrik: 'Toplam Üye Sayısı', Değer: 45, Hedef: 50, Durum: 'İyi' },
          { Metrik: 'Aylık Gelir', Değer: '12,500 TL', Hedef: '15,000 TL', Durum: 'Orta' },
          { Metrik: 'Antrenman Sayısı', Değer: 24, Hedef: 20, Durum: 'Mükemmel' },
          { Metrik: 'Katılım Oranı', Değer: '%85', Hedef: '%80', Durum: 'İyi' },
        ];
      }

      // Worksheet oluştur
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Sütun genişliklerini ayarla
      const wscols = data.length > 0 ? Object.keys(data[0]).map(() => ({ wch: 20 })) : [];
      ws['!cols'] = wscols;
      
      // Workbook oluştur
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapor Verileri');
      
      // Özet sayfası ekle (finansal raporlar için)
      if (template.type === 'financial') {
        const summaryData = [
          { Kategori: 'Toplam Gelir', Tutar: '9,000 TL' },
          { Kategori: 'Toplam Gider', Tutar: '4,000 TL' },
          { Kategori: 'Net Kar', Tutar: '5,000 TL' },
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Özet');
      }

      // Excel'i blob olarak oluştur
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Dosya adını oluştur
      const fileName = sanitizeFileName(`${template.name}_${new Date().toISOString().split('T')[0]}`);
      
      // Firebase Storage'a yükle
      const downloadURL = await uploadReportToStorage(excelBlob, fileName, reportId, 'excel');
      
      // Dosya boyutunu hesapla
      const fileSize = getFileSizeInKB(excelBlob);
      
      // Storage path'ini al
      const storagePath = parseStoragePath(downloadURL);
      
      // Rapor bilgilerini güncelle
      await updateDoc(doc(db, 'reports', reportId), {
        fileUrl: downloadURL,
        storagePath: storagePath,
        size: fileSize,
        fileName: `${fileName}.xlsx`,
        status: 'completed'
      });
      
      console.log('Excel raporu başarıyla oluşturuldu ve Storage\'a yüklendi');
      
    } catch (error) {
      console.error('Excel Storage yükleme hatası:', error);
      
      // Hata durumunda rapor durumunu güncelle
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'failed'
      });
    }
  };

  // Rapor indirme
  const downloadReport = (report: Report) => {
    if (!report.fileUrl) return;
    
    const link = document.createElement('a');
    link.href = report.fileUrl;
    link.download = `${report.name}_${new Date().toISOString().split('T')[0]}.${report.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rapor görüntüleme
  const viewReport = (report: Report) => {
    if (!report.fileUrl) return;
    window.open(report.fileUrl, '_blank');
  };

  // Rapor silme
  const deleteReport = async (reportId: string) => {
    if (window.confirm('Bu raporu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        // Önce rapor bilgilerini al
        const reportToDelete = reports.find(r => r.id === reportId);
        
        // Firestore'dan raporu sil
        await deleteDoc(doc(db, 'reports', reportId));
        
        // Eğer Storage'da dosya varsa, onu da sil
        if (reportToDelete?.storagePath) {
          try {
            await deleteReportFromStorage(reportToDelete.storagePath);
            console.log('Rapor dosyası Storage\'dan da silindi');
          } catch (storageError) {
            console.warn('Storage\'dan silme hatası (rapor zaten silinmiş olabilir):', storageError);
          }
        }
        
        console.log('Rapor başarıyla silindi');
        
      } catch (error) {
        console.error('Rapor silme hatası:', error);
        alert('Rapor silinirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  // Filtrelenmiş raporlar
  const filteredReports = reports.filter(report => {
    // Metin araması
    if (searchTerm && !report.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Tip filtresi
    if (filterType !== 'all' && report.type !== filterType) {
      return false;
    }
    
    // Tarih filtresi
    if (dateFilter !== 'all') {
      const reportDate = report.createdAt.toDate();
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (reportDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (reportDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (reportDate < monthAgo) return false;
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          if (reportDate < yearAgo) return false;
          break;
      }
    }
    
    return true;
  });

  const getReportIcon = (type: Report['type']) => {
    switch (type) {
      case 'financial': return <DollarSign className="w-5 h-5" />;
      case 'student': return <Users className="w-5 h-5" />;
      case 'training': return <Calendar className="w-5 h-5" />;
      case 'performance': return <TrendingUp className="w-5 h-5" />;
      case 'custom': return <FileSpreadsheet className="w-5 h-5" />;
    }
  };

  const getReportTypeColor = (type: Report['type']) => {
    switch (type) {
      case 'financial': return 'text-green-600 bg-green-100';
      case 'student': return 'text-blue-600 bg-blue-100';
      case 'training': return 'text-purple-600 bg-purple-100';
      case 'performance': return 'text-orange-600 bg-orange-100';
      case 'custom': return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Başlık ve Aksiyonlar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Raporlar</h1>
            <p className="text-gray-600">Detaylı raporlar oluşturun ve yönetin</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <FilePlus size={20} />
            <span>Yeni Rapor</span>
          </button>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Toplam</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
            <div className="text-sm text-gray-600 mt-1">Rapor oluşturuldu</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Tamamlanan</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {reports.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Başarılı rapor</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">Bu Ay</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {reports.filter(r => {
                const date = r.createdAt.toDate();
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Rapor oluşturuldu</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileDown className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">İndirilen</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor(reports.length * 0.7)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Rapor indirildi</div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rapor ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Tipler</option>
              <option value="financial">Finansal</option>
              <option value="student">Öğrenci</option>
              <option value="training">Antrenman</option>
              <option value="performance">Performans</option>
              <option value="custom">Özel</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Tarihler</option>
              <option value="today">Bugün</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
              <option value="year">Bu Yıl</option>
            </select>

            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
              <Filter size={20} />
              <span>Gelişmiş Filtre</span>
            </button>
          </div>
        </div>
      </div>

      {/* Raporlar Listesi */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Raporlar yükleniyor...</span>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor bulunamadı</h3>
            <p className="text-gray-600 mb-6">Henüz rapor oluşturmadınız veya arama kriterlerinize uygun rapor yok.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <FilePlus size={20} />
              <span>İlk Raporu Oluştur</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rapor Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boyut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${getReportTypeColor(report.type)} mr-3`}>
                          {getReportIcon(report.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {report.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportTypeColor(report.type)}`}>
                        {report.type === 'financial' && 'Finansal'}
                        {report.type === 'student' && 'Öğrenci'}
                        {report.type === 'training' && 'Antrenman'}
                        {report.type === 'performance' && 'Performans'}
                        {report.type === 'custom' && 'Özel'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.createdAt.toDate().toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.status === 'completed' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Tamamlandı
                        </span>
                      ) : report.status === 'generating' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Oluşturuluyor
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Başarısız
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.size ? `${report.size} KB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {report.status === 'completed' && (
                          <>
                            <button
                              onClick={() => viewReport(report)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Görüntüle"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => downloadReport(report)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="İndir"
                            >
                              <Download size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rapor Oluşturma Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {!selectedTemplate ? (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Rapor Şablonu Seçin</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left group"
                    >
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${template.color} bg-opacity-10 mb-4`}>
                        {template.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="mt-4 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">Şablonu Seç</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedTemplate(null);
                      setReportParameters({});
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); generateReport(); }} className="space-y-6">
                  {/* Format Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rapor Formatı
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setReportParameters({ ...reportParameters, format: 'pdf' })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          reportParameters.format === 'pdf' || !reportParameters.format
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileText className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <span className="text-sm font-medium">PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportParameters({ ...reportParameters, format: 'excel' })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          reportParameters.format === 'excel'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <span className="text-sm font-medium">Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Dinamik Parametreler */}
                  {selectedTemplate.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {param.label} {param.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {param.type === 'date' && (
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="date"
                            required={param.required}
                            onChange={(e) => setReportParameters({
                              ...reportParameters,
                              [param.name]: { 
                                ...reportParameters[param.name],
                                start: e.target.value 
                              }
                            })}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="date"
                            required={param.required}
                            onChange={(e) => setReportParameters({
                              ...reportParameters,
                              [param.name]: { 
                                ...reportParameters[param.name],
                                end: e.target.value 
                              }
                            })}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      {param.type === 'select' && (
                        <select
                          required={param.required}
                          onChange={(e) => setReportParameters({
                            ...reportParameters,
                            [param.name]: e.target.value
                          })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seçiniz</option>
                          {param.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {param.type === 'multiselect' && (
                        <div className="space-y-2">
                          {param.options?.map(option => (
                            <label key={option.value} className="flex items-center">
                              <input
                                type="checkbox"
                                value={option.value}
                                onChange={(e) => {
                                  const current = reportParameters[param.name] || [];
                                  if (e.target.checked) {
                                    setReportParameters({
                                      ...reportParameters,
                                      [param.name]: [...current, option.value]
                                    });
                                  } else {
                                    setReportParameters({
                                      ...reportParameters,
                                      [param.name]: current.filter((v: string) => v !== option.value)
                                    });
                                  }
                                }}
                                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {param.type === 'text' && (
                        <input
                          type="text"
                          required={param.required}
                          onChange={(e) => setReportParameters({
                            ...reportParameters,
                            [param.name]: e.target.value
                          })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setSelectedTemplate(null);
                        setReportParameters({});
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={generatingReport}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {generatingReport ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Oluşturuluyor...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Rapor Oluştur</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
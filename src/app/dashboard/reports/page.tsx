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
  where,
  getDocs
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
        const finalFormat = reportParameters.format || 'pdf';
        if (finalFormat === 'pdf') {
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

  // Firebase'den gerçek verileri çekme fonksiyonları
  const fetchStudentsData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Öğrenci verileri yüklenirken hata:', error);
      return [];
    }
  };

  const fetchFinancialData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'financial_transactions'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Finansal veriler yüklenirken hata:', error);
      return [];
    }
  };

  const fetchTrainingsData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'trainings'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Antrenman verileri yüklenirken hata:', error);
      return [];
    }
  };

  // PDF rapor oluşturma
  const generatePDFReport = async (template: ReportTemplate, parameters: any, reportId: string) => {
    const pdf = new jsPDF();
    
    // Türkçe karakter desteği için font ayarları
    pdf.setFont('helvetica');
    pdf.setLanguage('tr');
    
    // Başlık
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(template.name, 20, 20);
    
    // Tarih bilgisi
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Olusturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
    
    // Parametre bilgileri
    if (parameters.dateRange) {
      pdf.text(`Tarih Araligi: ${parameters.dateRange.start} - ${parameters.dateRange.end}`, 20, 40);
    }
    
    // İçerik (örnek)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rapor Icerigi', 20, 60);
    
    // Gerçek verilerle tablo oluşturma
    if (template.type === 'financial') {
      const financialData = await fetchFinancialData();
      
      // Tarih filtreleme
      let filteredData = financialData;
      if (parameters.dateRange?.start && parameters.dateRange?.end) {
        const startDate = new Date(parameters.dateRange.start);
        const endDate = new Date(parameters.dateRange.end);
        filteredData = financialData.filter((transaction: any) => {
          const transactionDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
          return transactionDate >= startDate && transactionDate <= endDate;
        });
      }

      // Tablo verilerini hazırla
      const tableData = filteredData.slice(0, 20).map((transaction: any) => {
        const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
        const amount = transaction.type === 'income' ? `+${transaction.amount} TL` : `-${transaction.amount} TL`;
        return [
          date.toLocaleDateString('tr-TR'),
          transaction.type === 'income' ? 'Gelir' : 'Gider',
          transaction.description || transaction.category || '',
          `${transaction.amount} TL`,
          amount
        ];
      });

      if (tableData.length > 0) {
        autoTable(pdf, {
          head: [['Tarih', 'Kategori', 'Aciklama', 'Tutar', 'Durum']],
          body: tableData,
          startY: 70,
          theme: 'grid',
          headStyles: { 
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            font: 'helvetica',
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 3,
            font: 'helvetica',
            textColor: [0, 0, 0]
          }
        });
        
        // Özet bilgileri hesapla ve ekle
        const totalIncome = filteredData
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const totalExpense = filteredData
          .filter((t: any) => t.type === 'expense')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const netProfit = totalIncome - totalExpense;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Finansal Ozet:', 20, pdf.lastAutoTable?.finalY + 20 || 150);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Toplam Gelir: ${totalIncome.toLocaleString('tr-TR')} TL`, 30, pdf.lastAutoTable?.finalY + 30 || 160);
        pdf.text(`Toplam Gider: ${totalExpense.toLocaleString('tr-TR')} TL`, 30, pdf.lastAutoTable?.finalY + 40 || 170);
        pdf.text(`Net Kar: ${netProfit.toLocaleString('tr-TR')} TL`, 30, pdf.lastAutoTable?.finalY + 50 || 180);
      } else {
        pdf.setFontSize(12);
        pdf.text('Bu tarih araliginda finansal islem bulunamadi.', 20, 80);
      }
      
    } else if (template.type === 'student') {
      const studentsData = await fetchStudentsData();
      
      // Filtreleme (branş, durum vs.)
      let filteredStudents = studentsData;
      if (parameters.branches && parameters.branches.length > 0) {
        filteredStudents = studentsData.filter((student: any) => 
          parameters.branches.includes(student.branchId || student.branchName)
        );
      }
      if (parameters.status && parameters.status !== 'all') {
        // Durum filtrelemesi - varsayılan olarak tüm öğrenciler aktif kabul edilir
        filteredStudents = filteredStudents.filter((student: any) => {
          if (parameters.status === 'active') return true; // Tüm öğrenciler aktif varsayılır
          return false; // Pasif öğrenci sistemi henüz yok
        });
      }

      // Tablo verilerini hazırla
      const tableData = filteredStudents.slice(0, 50).map((student: any) => {
        const createdDate = student.createdAt?.toDate ? student.createdAt.toDate() : new Date();
        // Türkçe karakterleri düzelt
        const cleanName = (student.fullName || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (match: string) => {
          const map: {[key: string]: string} = {
            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
          };
          return map[match] || match;
        });
        const cleanBranch = (student.branchName || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (match: string) => {
          const map: {[key: string]: string} = {
            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
          };
          return map[match] || match;
        });
        
        return [
          cleanName,
          cleanBranch,
          student.phone || '',
          student.email || '',
          createdDate.toLocaleDateString('tr-TR'),
          'Aktif'
        ];
      });

      if (tableData.length > 0) {
        autoTable(pdf, {
          head: [['Ad Soyad', 'Brans', 'Telefon', 'E-posta', 'Kayit Tarihi', 'Durum']],
          body: tableData,
          startY: 70,
          theme: 'grid',
          headStyles: { 
            fillColor: [52, 152, 219],
            textColor: [255, 255, 255],
            font: 'helvetica',
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica',
            textColor: [0, 0, 0]
          }
        });
        
        // Özet bilgileri
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ogrenci Ozeti:', 20, pdf.lastAutoTable?.finalY + 20 || 150);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Toplam Ogrenci Sayisi: ${filteredStudents.length}`, 30, pdf.lastAutoTable?.finalY + 30 || 160);
        
        // Branşlara göre dağılım
        const branchCounts: {[key: string]: number} = {};
        filteredStudents.forEach((student: any) => {
          const branchName = student.branchName || 'Belirtilmemis';
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        });
        
        let yPos = pdf.lastAutoTable?.finalY + 40 || 170;
        Object.entries(branchCounts).forEach(([branch, count]) => {
          const cleanBranch = branch.replace(/[çÇğĞıİöÖşŞüÜ]/g, (match: string) => {
            const map: {[key: string]: string} = {
              'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
              'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
            };
            return map[match] || match;
          });
          pdf.text(`${cleanBranch}: ${count} ogrenci`, 30, yPos);
          yPos += 10;
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('Belirtilen kriterlere uygun ogrenci bulunamadi.', 20, 80);
      }
      
    } else if (template.type === 'training') {
      const trainingsData = await fetchTrainingsData();
      
      // Tarih filtreleme
      let filteredTrainings = trainingsData;
      if (parameters.dateRange?.start && parameters.dateRange?.end) {
        const startDate = new Date(parameters.dateRange.start);
        const endDate = new Date(parameters.dateRange.end);
        filteredTrainings = trainingsData.filter((training: any) => {
          const trainingDate = training.date?.toDate ? training.date.toDate() : new Date(training.date);
          return trainingDate >= startDate && trainingDate <= endDate;
        });
      }

      // Tablo verilerini hazırla
      const tableData = filteredTrainings.slice(0, 30).map((training: any) => {
        const date = training.date?.toDate ? training.date.toDate() : new Date(training.date);
        
        // Türkçe karakterleri düzelt
        const cleanFields = (text: string) => (text || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (match: string) => {
          const map: {[key: string]: string} = {
            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
          };
          return map[match] || match;
        });
        
        return [
          date.toLocaleDateString('tr-TR'),
          training.time || training.startTime || '',
          cleanFields(training.branchName || training.sport || ''),
          cleanFields(training.trainerName || ''),
          cleanFields(training.groupName || ''),
          training.participants ? `${training.participants}/${training.maxParticipants || training.participants}` : ''
        ];
      });

      if (tableData.length > 0) {
        autoTable(pdf, {
          head: [['Tarih', 'Saat', 'Brans', 'Antrenor', 'Grup', 'Katilimci Sayisi']],
          body: tableData,
          startY: 70,
          theme: 'grid',
          headStyles: { 
            fillColor: [155, 89, 182],
            textColor: [255, 255, 255],
            font: 'helvetica',
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 3,
            font: 'helvetica',
            textColor: [0, 0, 0]
          }
        });
        
        // Özet bilgileri
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Antrenman Ozeti:', 20, pdf.lastAutoTable?.finalY + 20 || 150);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Toplam Antrenman Sayisi: ${filteredTrainings.length}`, 30, pdf.lastAutoTable?.finalY + 30 || 160);
        
        // Branşlara göre dağılım
        const branchCounts: {[key: string]: number} = {};
        filteredTrainings.forEach((training: any) => {
          const branchName = training.branchName || training.sport || 'Belirtilmemis';
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        });
        
        let yPos = pdf.lastAutoTable?.finalY + 40 || 170;
        Object.entries(branchCounts).forEach(([branch, count]) => {
          const cleanBranch = branch.replace(/[çÇğĞıİöÖşŞüÜ]/g, (match: string) => {
            const map: {[key: string]: string} = {
              'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
              'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
            };
            return map[match] || match;
          });
          pdf.text(`${cleanBranch}: ${count} antrenman`, 30, yPos);
          yPos += 10;
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('Bu tarih araliginda antrenman bulunamadi.', 20, 80);
      }
      
    } else {
      // Performans raporu için gerçek veriler
      const [studentsData, financialData, trainingsData] = await Promise.all([
        fetchStudentsData(),
        fetchFinancialData(),
        fetchTrainingsData()
      ]);

      const totalIncome = financialData
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const performanceData = [
        ['Toplam Uye Sayisi', studentsData.length.toString(), '50', studentsData.length >= 50 ? 'Iyi' : 'Orta'],
        ['Aylik Gelir', `${totalIncome.toLocaleString('tr-TR')} TL`, '15,000 TL', totalIncome >= 15000 ? 'Iyi' : 'Orta'],
        ['Antrenman Sayisi', trainingsData.length.toString(), '20', trainingsData.length >= 20 ? 'Mukemmel' : 'Iyi'],
        ['Katilim Orani', '%85', '%80', 'Iyi'],
      ];

      autoTable(pdf, {
        head: [['Metrik', 'Deger', 'Hedef', 'Durum']],
        body: performanceData,
        startY: 70,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 152, 0],
          textColor: [255, 255, 255],
          font: 'helvetica',
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 10, 
          cellPadding: 3,
          font: 'helvetica',
          textColor: [0, 0, 0]
        }
      });

      // Özet bilgileri
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performans Ozeti:', 20, pdf.lastAutoTable?.finalY + 20 || 150);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Sistem Durumu: ${studentsData.length >= 50 && totalIncome >= 15000 ? 'Mukemmel' : 'Iyi'}`, 30, pdf.lastAutoTable?.finalY + 30 || 160);
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
      
      // Rapor tipine göre gerçek veri setleri
      if (template.type === 'financial') {
        const financialData = await fetchFinancialData();
        
        // Tarih filtreleme
        let filteredData = financialData;
        if (parameters.dateRange?.start && parameters.dateRange?.end) {
          const startDate = new Date(parameters.dateRange.start);
          const endDate = new Date(parameters.dateRange.end);
          filteredData = financialData.filter((transaction: any) => {
            const transactionDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
            return transactionDate >= startDate && transactionDate <= endDate;
          });
        }

        data = filteredData.map((transaction: any) => {
          const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
          return {
            Tarih: date.toLocaleDateString('tr-TR'),
            Kategori: transaction.type === 'income' ? 'Gelir' : 'Gider',
            Aciklama: transaction.description || transaction.category || '',
            Tutar: transaction.amount || 0,
            Durum: transaction.type === 'income' ? `+${transaction.amount} TL` : `-${transaction.amount} TL`
          };
        });
      } else if (template.type === 'student') {
        const studentsData = await fetchStudentsData();
        
        // Filtreleme
        let filteredStudents = studentsData;
        if (parameters.branches && parameters.branches.length > 0) {
          filteredStudents = studentsData.filter((student: any) => 
            parameters.branches.includes(student.branchId || student.branchName)
          );
        }

        data = filteredStudents.map((student: any) => {
          const createdDate = student.createdAt?.toDate ? student.createdAt.toDate() : new Date();
          return {
            'Ad Soyad': student.fullName || '',
            Brans: student.branchName || '',
            Telefon: student.phone || '',
            'E-posta': student.email || '',
            'Kayit Tarihi': createdDate.toLocaleDateString('tr-TR'),
            Durum: 'Aktif'
          };
        });
      } else if (template.type === 'training') {
        const trainingsData = await fetchTrainingsData();
        
        // Tarih filtreleme
        let filteredTrainings = trainingsData;
        if (parameters.dateRange?.start && parameters.dateRange?.end) {
          const startDate = new Date(parameters.dateRange.start);
          const endDate = new Date(parameters.dateRange.end);
          filteredTrainings = trainingsData.filter((training: any) => {
            const trainingDate = training.date?.toDate ? training.date.toDate() : new Date(training.date);
            return trainingDate >= startDate && trainingDate <= endDate;
          });
        }

        data = filteredTrainings.map((training: any) => {
          const date = training.date?.toDate ? training.date.toDate() : new Date(training.date);
          return {
            Tarih: date.toLocaleDateString('tr-TR'),
            Saat: training.time || training.startTime || '',
            Brans: training.branchName || training.sport || '',
            Antrenor: training.trainerName || '',
            Grup: training.groupName || '',
            Katilimci: training.participants ? `${training.participants}/${training.maxParticipants || training.participants}` : ''
          };
        });
      } else {
        // Performans verileri için temel istatistikleri hesapla
        const [studentsData, financialData, trainingsData] = await Promise.all([
          fetchStudentsData(),
          fetchFinancialData(),
          fetchTrainingsData()
        ]);

        const totalIncome = financialData
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        data = [
          { Metrik: 'Toplam Uye Sayisi', Deger: studentsData.length, Hedef: Math.max(50, studentsData.length), Durum: studentsData.length >= 50 ? 'Iyi' : 'Orta' },
          { Metrik: 'Aylik Gelir', Deger: `${totalIncome.toLocaleString('tr-TR')} TL`, Hedef: '15,000 TL', Durum: totalIncome >= 15000 ? 'Iyi' : 'Orta' },
          { Metrik: 'Antrenman Sayisi', Deger: trainingsData.length, Hedef: 20, Durum: trainingsData.length >= 20 ? 'Mukemmel' : 'Iyi' },
          { Metrik: 'Katilim Orani', Deger: '%85', Hedef: '%80', Durum: 'Iyi' },
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
      if (template.type === 'financial' && data.length > 0) {
        const totalIncome = data
          .filter((item: any) => item.Kategori === 'Gelir')
          .reduce((sum: number, item: any) => sum + (item.Tutar || 0), 0);
        const totalExpense = data
          .filter((item: any) => item.Kategori === 'Gider')
          .reduce((sum: number, item: any) => sum + (item.Tutar || 0), 0);
        const netProfit = totalIncome - totalExpense;

        const summaryData = [
          { Kategori: 'Toplam Gelir', Tutar: `${totalIncome.toLocaleString('tr-TR')} TL` },
          { Kategori: 'Toplam Gider', Tutar: `${totalExpense.toLocaleString('tr-TR')} TL` },
          { Kategori: 'Net Kar', Tutar: `${netProfit.toLocaleString('tr-TR')} TL` },
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Ozet');
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
                      onClick={() => {
                        setSelectedTemplate(template);
                        setReportParameters({ format: 'pdf' });
                      }}
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
import jsPDF from 'jspdf';
// Türkçe karakter desteği için font ekle
import 'jspdf/dist/polyfills.es.js';
import { StudentDebt } from '@/lib/firebase/student-debt-service';

export interface PaymentReceiptData {
  studentName: string;
  studentPhone?: string;
  parentName?: string;
  parentPhone?: string;
  branchName: string;
  groupName: string;
  payments: StudentDebt[];
  totalAmount: number;
  receiptNumber: string;
  receiptDate: Date;
  clubInfo: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    website?: string;
  };
}

export class PaymentReceiptService {
  private static readonly FONT_SIZE = {
    TITLE: 20,
    SUBTITLE: 16,
    NORMAL: 12,
    SMALL: 10
  };

  private static readonly COLORS = {
    PRIMARY: '#059669', // green-600
    SECONDARY: '#6B7280', // gray-500
    TEXT: '#111827', // gray-900
    BORDER: '#D1D5DB' // gray-300
  };

  // Türkçe karakter dönüştürme fonksiyonu
  private static turkishToAscii(text: string): string {
    const turkishChars: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'C',
      'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'I': 'I',
      'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S',
      'ü': 'u', 'Ü': 'U',
      'İ': 'I'
    };
    
    return text.replace(/[çÇğĞıIöÖşŞüÜİ]/g, (match) => turkishChars[match] || match);
  }

  // Türkçe ay adlarını İngilizce'ye çevir
  private static convertTurkishMonths(text: string): string {
    const monthMap: { [key: string]: string } = {
      'Ocak': 'Ocak',
      'Şubat': 'Subat',
      'Mart': 'Mart',
      'Nisan': 'Nisan',
      'Mayıs': 'Mayis',
      'Haziran': 'Haziran',
      'Temmuz': 'Temmuz',
      'Ağustos': 'Agustos',
      'Eylül': 'Eylul',
      'Ekim': 'Ekim',
      'Kasım': 'Kasim',
      'Aralık': 'Aralik'
    };
    
    let result = text;
    Object.keys(monthMap).forEach(turkishMonth => {
      result = result.replace(new RegExp(turkishMonth, 'g'), monthMap[turkishMonth]);
    });
    
    return result;
  }

  static generatePaymentReceipt(data: PaymentReceiptData): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Türkçe karakter çözümü için UTF-8 encoding
    pdf.setFont('helvetica');
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 25;

    // Header line
    this.addHeader(pdf, pageWidth, currentY, data.clubInfo);
    currentY += 20;

    // Receipt Title
    pdf.setFontSize(this.FONT_SIZE.TITLE);
    pdf.setTextColor(this.COLORS.PRIMARY);
    pdf.setFont(undefined, 'bold');
    const titleText = 'AIDAT ODEME MAKBUZU';
    const titleWidth = pdf.getTextWidth(titleText);
    pdf.text(titleText, (pageWidth - titleWidth) / 2, currentY);
    currentY += 25;

    // Receipt Info
    this.addReceiptInfo(pdf, pageWidth, currentY, data);
    currentY += 25;

    // Student Info
    this.addStudentInfo(pdf, currentY, data);
    currentY += 40;

    // Payment Details Table
    currentY = this.addPaymentTable(pdf, currentY, data.payments, pageWidth);
    currentY += 15;

    // Total Amount
    this.addTotalAmount(pdf, pageWidth, currentY, data.totalAmount);
    currentY += 30;

    // Footer
    this.addFooter(pdf, pageWidth, pageHeight - 40, data.receiptDate);

    // Download PDF
    const filename = `aidat-makbuzu-${data.studentName.replace(/\s+/g, '-')}-${data.receiptNumber}.pdf`;
    pdf.save(filename);
  }

  private static addHeader(pdf: jsPDF, pageWidth: number, y: number, clubInfo: any): void {
    // Sadece border line
    pdf.setDrawColor(this.COLORS.BORDER);
    pdf.setLineWidth(0.5);
    pdf.line(20, y, pageWidth - 20, y);
  }

  private static addReceiptInfo(pdf: jsPDF, pageWidth: number, y: number, data: PaymentReceiptData): void {
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(this.COLORS.TEXT);
    pdf.setFont(undefined, 'normal');

    // Receipt Number
    const receiptText = `Makbuz No: ${data.receiptNumber}`;
    pdf.text(receiptText, 20, y);

    // Receipt Date
    const dateText = `Tarih: ${data.receiptDate.toLocaleDateString('tr-TR')}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - 20 - dateWidth, y);
  }

  private static addStudentInfo(pdf: jsPDF, y: number, data: PaymentReceiptData): void {
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(this.COLORS.TEXT);

    // Student Info Box
    pdf.setFillColor(248, 250, 252);
    pdf.rect(20, y - 5, 170, 25, 'F');
    pdf.setDrawColor(this.COLORS.BORDER);
    pdf.setLineWidth(0.5);
    pdf.rect(20, y - 5, 170, 25);

    // Student Name
    pdf.setFont(undefined, 'bold');
    pdf.text('Ogrenci Adi:', 25, y + 5);
    pdf.setFont(undefined, 'normal');
    pdf.text(this.turkishToAscii(data.studentName), 65, y + 5);

    // Branch & Group
    pdf.setFont(undefined, 'bold');
    pdf.text('Sube:', 25, y + 12);
    pdf.setFont(undefined, 'normal');
    pdf.text(this.turkishToAscii(data.branchName), 45, y + 12);

    pdf.setFont(undefined, 'bold');
    pdf.text('Grup:', 120, y + 12);
    pdf.setFont(undefined, 'normal');
    pdf.text(this.turkishToAscii(data.groupName), 135, y + 12);
  }

  private static addPaymentTable(pdf: jsPDF, startY: number, payments: StudentDebt[], pageWidth: number): number {
    let currentY = startY;
    
    // Table Header
    pdf.setFillColor(59, 130, 246); // Blue-500
    pdf.rect(20, currentY, pageWidth - 40, 12, 'F');
    
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255); // White text
    
    pdf.text('Donem', 25, currentY + 8);
    pdf.text('Aciklama', 70, currentY + 8);
    pdf.text('Odeme Tarihi', 120, currentY + 8);
    pdf.text('Tutar (TL)', pageWidth - 45, currentY + 8);
    
    currentY += 12;

    // Table Rows
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    
    payments.forEach((payment, index) => {
      const rowY = currentY + (index * 10) + 6;
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, rowY - 4, pageWidth - 40, 10, 'F');
      }
      
      pdf.setTextColor(this.COLORS.TEXT);
      
      // Period (month/year) - Türkçe ayları çevir
      const period = payment.dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      const convertedPeriod = this.convertTurkishMonths(period);
      pdf.text(convertedPeriod, 25, rowY + 2);
      
      // Description
      pdf.text(this.turkishToAscii(payment.description), 70, rowY + 2);
      
      // Payment Date
      const paymentDate = payment.paymentDate 
        ? payment.paymentDate.toLocaleDateString('tr-TR')
        : 'Odendi';
      pdf.text(paymentDate, 120, rowY + 2);
      
      // Amount - TL sembolü yerine "TL" yazalım
      const amountText = payment.amount.toLocaleString('tr-TR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) + ' TL';
      const amountWidth = pdf.getTextWidth(amountText);
      pdf.text(amountText, pageWidth - 25 - amountWidth, rowY + 2);
    });

    currentY += (payments.length * 10) + 6;

    // Table border
    pdf.setDrawColor(this.COLORS.BORDER);
    pdf.setLineWidth(0.5);
    pdf.rect(20, startY, pageWidth - 40, currentY - startY);

    return currentY;
  }

  private static addTotalAmount(pdf: jsPDF, pageWidth: number, y: number, totalAmount: number): void {
    // Total box
    pdf.setFillColor(34, 197, 94); // Green-500
    pdf.rect(pageWidth - 90, y, 70, 18, 'F');
    pdf.setDrawColor(this.COLORS.BORDER);
    pdf.setLineWidth(0.5);
    pdf.rect(pageWidth - 90, y, 70, 18);
    
    pdf.setFontSize(this.FONT_SIZE.SUBTITLE);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);
    
    const totalText = `TOPLAM: ${totalAmount.toLocaleString('tr-TR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })} TL`;
    
    const totalWidth = pdf.getTextWidth(totalText);
    pdf.text(totalText, pageWidth - 90 + (70 - totalWidth) / 2, y + 12);
  }

  private static addFooter(pdf: jsPDF, pageWidth: number, y: number, receiptDate: Date): void {
    pdf.setDrawColor(this.COLORS.BORDER);
    pdf.setLineWidth(0.5);
    pdf.line(20, y - 10, pageWidth - 20, y - 10);
    
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(this.COLORS.SECONDARY);
    pdf.setFont(undefined, 'normal');
    
    // Left side - Note
    pdf.text('Bu makbuz aidat odemenizin resmi belgesidir.', 20, y);
    pdf.text('Herhangi bir sorun icin lutfen bizimle iletisime gecin.', 20, y + 8);
    
    // Right side - Generation info
    const generatedText = `Makbuz Tarihi: ${receiptDate.toLocaleString('tr-TR')}`;
    const generatedWidth = pdf.getTextWidth(generatedText);
    pdf.text(generatedText, pageWidth - 20 - generatedWidth, y);
    
    const systemText = 'Spor Kulübü Yönetim Sistemi';
    const systemWidth = pdf.getTextWidth(systemText);
    pdf.text(systemText, pageWidth - 20 - systemWidth, y + 8);
  }

  // Helper: Generate receipt number
  static generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-4);
    
    return `MK${year}${month}${day}${time}`;
  }

  // Helper: Get student data for receipt
  static async prepareReceiptData(
    studentDebts: StudentDebt[],
    studentInfo: {
      name: string;
      phone?: string;
      parentName?: string;
      parentPhone?: string;
    }
  ): Promise<PaymentReceiptData> {
    const totalAmount = studentDebts.reduce((sum, debt) => sum + debt.amount, 0);
    
    return {
      studentName: studentInfo.name,
      studentPhone: studentInfo.phone,
      parentName: studentInfo.parentName,
      parentPhone: studentInfo.parentPhone,
      branchName: studentDebts[0]?.branchName || '',
      groupName: studentDebts[0]?.groupName || '',
      payments: studentDebts,
      totalAmount,
      receiptNumber: this.generateReceiptNumber(),
      receiptDate: new Date(),
      clubInfo: {
        name: 'Çayyolu Spor Kulübü',
        address: 'Çayyolu Mahallesi, Ankara, Türkiye',
        phone: '+90 (312) 123 45 67',
        email: 'info@cayyolusporkulubu.com',
        website: 'www.cayyolusporkulubu.com'
      }
    };
  }
}
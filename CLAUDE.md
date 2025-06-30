# CLAUDE.md - Proje Talimatları

## Önemli Hatırlatmalar

Bu spor kulübü yönetim sistemi projesi için sürekli dikkat edilmesi gereken konular:

### Build ve Deploy Hatırlatmaları
- Build öncesi mutlaka ESLint hatalarını düzelt
- TypeScript strict mode kullanılıyor - any type kullanmaktan kaçın
- Build hatası durumunda önce .next klasörünü temizle
- Windows ortamında dosya izni sorunları olabilir

### Kod Standartları
- Kullanılmayan import'ları temizle
- React Hook dependencies'lerini doğru tanımla
- JSX'te unescaped entities kullanma (&quot; &apos; kullan)
- Console.log'ları production'da bırakma

### Firebase/Firestore Kuralları
- Her zaman proper typing kullan
- Timestamp dönüşümlerini doğru yap
- Error handling ekle
- Real-time listener'ları properly cleanup et

### UI/UX Notları
- Responsive design kontrolü yap
- Loading state'leri ekle
- Error message'ları Türkçe
- Accessibility standartlarına uy

## İyileştirme Fazları

### 🔥 PHASE 1: Acil Düzeltmeler (1-2 Hafta)
**Durum:** 🚨 KRİTİK ÖNCELİK - **Hemen başlanmalı**
- **Güvenlik açıkları:** Token doğrulama, Firebase security rules, RBAC sistemi
- **Build sorunları:** ESLint/TypeScript ignore'ları kaldır, type hatalarını düzelt
- **Memory leak'ler:** Firebase listener cleanup, event listener cleanup
- **Detay:** `/docs/PHASE_1_CRITICAL_FIXES.md`

### ⚡ PHASE 2: Performans Optimizasyonu (2-4 Hafta)
**Durum:** 🟡 YÜKSEK ÖNCELİK - **PHASE 1 sonrası**
- **Bundle optimization:** Code splitting, lazy loading, library optimization
- **Component performance:** Large component refactoring, memoization, virtual scrolling
- **Database optimization:** Parallel queries, pagination, caching
- **Detay:** `/docs/PHASE_2_PERFORMANCE_OPTIMIZATION.md`

### 🏗️ PHASE 3: Mimari Refactoring (1-2 Ay)
**Durum:** 🔵 ORTA ÖNCELİK - **PHASE 2 sonrası**
- **Service layer:** Base service pattern, domain-specific services
- **Custom hooks:** Data fetching hooks, business logic hooks
- **Component library:** Reusable forms, data display components
- **Type definitions:** Central type management
- **Detay:** `/docs/PHASE_3_ARCHITECTURE_REFACTORING.md`

### 🌟 PHASE 4: Advanced Features (2-6 Ay)
**Durum:** 🔵 UZUN VADELİ - **PHASE 3 sonrası**
- **AI/ML features:** Performance prediction, automated scheduling
- **Advanced analytics:** Real-time BI, predictive analytics
- **Mobile-first:** PWA, native device integration
- **Multi-tenant SaaS:** Tenant management, billing system
- **Detay:** `/docs/PHASE_4_ADVANCED_FEATURES.md`

## Son Build Durumu
- ESLint ve TypeScript kontrolü next.config.ts'te geçici olarak devre dışı
- Build süreci çok uzun sürüyor - optimizasyon gerekli
- Attendance, Reports, Finance sayfalarında type hataları var
- **⚠️ Bu hatalar PHASE 1'de düzeltilecek**

### Build Optimizasyon Notları
- SWC compiler kullanılıyor olabilir, Babel'a geçiş denenebilir
- Bundle analiz yapılmalı (PHASE 2'de implement edilecek)
- Dynamic import'lar kontrol edilmeli (PHASE 2'de yapılacak)

## Çalışma Metodolojisi

### Context Length Management
- **Sorun:** Proje büyüdükçe context sınırı aşılabilir
- **Çözüm:** İhtiyaç halinde Gemini'dan destek al
- **Prensip:** Bu yaklaşımı her zaman kullan

### Production Safety Protocol
- **Kural:** Her commit/push sonrası production kontrolü ZORUNLU
- **Süreç:** 
  1. Commit & push yap
  2. Production/staging ortamını test et
  3. Confirm edildikten sonra devam et
- **Risk Yönetimi:** Production'da sorun varsa hemen müdahale et

### Task Management
- **Todo sistemini sürekli güncelle**
- **Her task tamamlandığında status'u değiştir**
- **Öncelik sırasına göre çalış (high → medium → low)**

## Proje Yapısı
- src/app/dashboard/ - Ana sayfa bileşenleri
- src/components/ - Yeniden kullanılabilir bileşenler
- src/lib/firebase/ - Firebase servisleri
- Firebase config .env.local'da
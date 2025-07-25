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
- FCM token'larını güvenli şekilde yönet
- Notification listener'larını doğru başlat/durdur

### UI/UX Notları
- Responsive design kontrolü yap
- Loading state'leri ekle
- Error message'ları Türkçe
- Accessibility standartlarına uy

## İyileştirme Fazları

### 🔥 PHASE 1: Acil Düzeltmeler (1-2 Hafta)
**Durum:** 🟡 **KISMEN TAMAMLANDI** - **Güvenlik kısmı çözüldü**
- ✅ **Güvenlik açıkları:** Firebase security rules güncellendi, RBAC sistemi tamamlandı
- ✅ **Memory leak'ler:** Firebase listener cleanup implementasyonu tamamlandı
- ⚠️ **Build sorunları:** ESLint/TypeScript ignore'ları kaldırılacak, type hatalarını düzeltilecek
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

## ✅ Son Başarılar

### 🔔 Bildirim Sistemi (Tamamlandı - 2025-01-09)
**Durum:** ✅ **TAMAMLANDI** - Full-featured notification system
- **Web Admin Panel:** `/dashboard/notifications` - Hedef kitle seçimi, bildirim türleri
- **Mobile Real-time:** FCM push notifications + Firestore listener
- **Badge System:** Tab üzerinde okunmamış bildirim sayısı
- **API Endpoints:** 7 adet endpoint (send, tokens, history, preferences, clear, stats)
- **Duplicate Prevention:** FCM ve local notification çakışması önlendi
- **Test Edildi:** Web'den mobile'a real-time bildirim sistemi çalışıyor

### 👥 Kullanıcı Yönetimi ve RBAC (Tamamlandı - 2025-01-08)
**Durum:** ✅ **TAMAMLANDI** - Role-based access control
- **4 Rol Sistemi:** ADMIN, TRAINER, PARENT, STUDENT
- **Role-based Navigation:** Her rol için özel dashboard ve menüler
- **Data Isolation:** Veliler sadece kendi çocuklarını görebilir
- **User Linking:** Kullanıcı hesapları mevcut öğrenci/antrenör kayıtlarıyla ilişkilendirilir
- **Firebase Admin SDK:** Session preservation sorunu çözüldü

### 📱 Mobile Uygulama (Tamamlandı - 2025-01-07)
**Durum:** ✅ **TAMAMLANDI** - React Native app with Firebase integration
- **Authentication:** Firebase Auth entegrasyonu
- **Navigation:** Role-based tab navigation
- **Firestore Integration:** Real-time data sync
- **Student/Trainer Management:** CRUD operasyonları
- **Responsive Design:** Mobile-first approach

## Son Build Durumu
- ✅ Bildirim sistemi tam entegre
- ✅ RBAC sistemi çalışıyor
- ✅ Mobile app stabil
- ✅ Login sistemi düzeltildi - smooth UX (2025-01-24)
- ⚠️ ESLint ve TypeScript kontrolü next.config.ts'te geçici olarak devre dışı
- ⚠️ Build süreci uzun - optimizasyon gerekli (PHASE 2'de yapılacak)

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

### 🌐 Web Uygulama
- `src/app/dashboard/` - Ana sayfa bileşenleri
- `src/app/dashboard/notifications/` - Bildirim yönetim paneli
- `src/app/api/notifications/` - Bildirim API endpoints
- `src/components/` - Yeniden kullanılabilir bileşenler
- `src/lib/firebase/` - Firebase servisleri
- `src/contexts/` - React context'leri (Auth, Notification)
- `src/types/` - TypeScript type definitions
- `public/firebase-messaging-sw.js` - FCM service worker
- Firebase config .env.local'da

### 📱 Mobile Uygulama
- `mobile/sport-club-mobile/src/screens/` - Ekran bileşenleri
- `mobile/sport-club-mobile/src/screens/notifications/` - Bildirim ekranları
- `mobile/sport-club-mobile/src/navigation/` - Navigation yapısı
- `mobile/sport-club-mobile/src/contexts/` - Context'ler (Auth, Notification)
- `mobile/sport-club-mobile/src/services/` - Servis katmanı
- `mobile/sport-club-mobile/src/services/notifications.ts` - Bildirim servisi
- `mobile/sport-club-mobile/src/services/notificationListener.ts` - Real-time listener
- `mobile/sport-club-mobile/src/services/firebase.ts` - Firebase config

### 🔧 API Endpoints
- `POST /api/notifications/send` - Bildirim gönderme
- `GET/POST /api/notifications/tokens` - Token yönetimi
- `GET /api/notifications/history` - Bildirim geçmişi
- `GET/POST /api/notifications/preferences` - Kullanıcı tercihleri
- `DELETE /api/notifications/clear` - Veri temizleme
- `GET /api/notifications/stats` - İstatistikler
- `GET /api/notifications/` - Genel bildirim API

### 🔐 Firebase Collections
- `users` - Kullanıcı bilgileri ve roller
- `notifications` - Gönderilen bildirimler
- `user_tokens` - FCM token'ları
- `notification_preferences` - Kullanıcı tercihleri
- `notification_stats` - İstatistikler
- `students` - Öğrenci kayıtları
- `trainers` - Antrenör kayıtları
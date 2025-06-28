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

## Son Build Durumu
- ESLint ve TypeScript kontrolü next.config.ts'te geçici olarak devre dışı
- Build süreci çok uzun sürüyor - optimizasyon gerekli
- Attendance, Reports, Finance sayfalarında type hataları var
- Bu hatalar düzeltildikten sonra linting'i tekrar aç

### Build Optimizasyon Notları
- SWC compiler kullanılıyor olabilir, Babel'a geçiş denenebilir
- Bundle analiz yapılmalı
- Dynamic import'lar kontrol edilmeli

## Proje Yapısı
- src/app/dashboard/ - Ana sayfa bileşenleri
- src/components/ - Yeniden kullanılabilir bileşenler
- src/lib/firebase/ - Firebase servisleri
- Firebase config .env.local'da
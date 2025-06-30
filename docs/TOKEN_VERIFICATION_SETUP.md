# Token Doğrulama Kurulum Kılavuzu

## Yapılan Değişiklikler

### 1. Firebase Admin SDK Entegrasyonu
- **Dosya:** `src/lib/firebase/admin.ts`
- Firebase Admin SDK ile server-side token doğrulama eklendi
- `verifyIdToken()` fonksiyonu ile token geçerliliği kontrol ediliyor

### 2. API Route Oluşturuldu
- **Dosya:** `src/app/api/auth/verify/route.ts`
- Token doğrulama için HTTP endpoint
- POST metodu ile token doğrulama
- GET metodu ile health check

### 3. Middleware Güncellendi
- **Dosya:** `src/middleware.ts`
- Artık sadece cookie varlığı değil, token geçerliliği de kontrol ediliyor
- Token cache mekanizması ile performans optimizasyonu
- Invalid token durumunda otomatik cookie temizleme

## Kurulum Adımları

### 1. Firebase Service Account Oluşturma

1. [Firebase Console](https://console.firebase.google.com) açın
2. Projenizi seçin
3. Project Settings > Service Accounts sekmesine gidin
4. "Generate new private key" butonuna tıklayın
5. JSON dosyasını güvenli bir yerde saklayın

### 2. Environment Variables Ayarlama

`.env.local` dosyanıza aşağıdaki değişkenleri ekleyin:

```env
# Firebase Admin SDK Configuration
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**ÖNEMLİ:** Private key'i kopyalarken:
- Tüm satır sonlarının `\n` olarak korunduğundan emin olun
- Çift tırnak içinde olmalı
- Windows'ta sorun yaşarsanız, tek satırda yazın ve `\n` karakterlerini manuel ekleyin

### 3. Deployment Notları

#### Vercel Deployment
1. Vercel dashboard'da project settings'e gidin
2. Environment Variables bölümüne gidin
3. Yukarıdaki 3 değişkeni ekleyin
4. Private key'i eklerken "Add another value" ile multiline olarak ekleyebilirsiniz

#### Docker/Self-hosted
1. `.env` dosyası veya environment variables ile değişkenleri set edin
2. Private key için dosya mount edebilir veya secret management kullanabilirsiniz

## Güvenlik Özellikleri

1. **Server-side Token Verification:** Tüm protected route'lar için token geçerliliği kontrol ediliyor
2. **Token Cache:** Performans için token'lar expire olana kadar cache'leniyor
3. **Automatic Cleanup:** Invalid token durumunda cookies otomatik temizleniyor
4. **API Route Protection:** `/api` route'ları middleware'den muaf tutuluyor

## Test Etme

1. Tarayıcı DevTools'ta Application > Cookies bölümünden `auth-token` cookie'sini manuel değiştirin
2. Sayfayı yenileyin
3. Invalid token ile login sayfasına yönlendirilmelisiniz
4. Console'da "Token verification error" görmemelisiniz

## Sorun Giderme

### "Firebase Admin SDK credentials not configured" Hatası
- Environment variables'ların doğru set edildiğinden emin olun
- `.env.local` dosyasının root dizinde olduğunu kontrol edin
- Server'ı restart edin

### "Error verifying token" Hatası
- Service account'un doğru project'e ait olduğunu kontrol edin
- Private key formatının doğru olduğunu kontrol edin
- Firebase project'inizde Authentication'ın aktif olduğunu kontrol edin

### Middleware'de Infinite Loop
- `/api` route'larının middleware'den muaf tutulduğundan emin olun
- Public paths array'inin doğru olduğunu kontrol edin
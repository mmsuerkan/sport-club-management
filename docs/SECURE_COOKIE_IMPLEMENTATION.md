# Secure Cookie Implementation Kılavuzu

## Yapılan Değişiklikler

### 1. Yeni API Endpoint
**Dosya:** `src/app/api/auth/cookies/route.ts`

**Özellikler:**
- Server-side cookie setting/clearing
- Token verification before cookie setting
- Secure cookie flags implementation
- HttpOnly flag for auth-state cookie

**Cookie Ayarları:**
```typescript
// auth-token cookie (client'ın okuması gerekiyor)
httpOnly: false
secure: production'da true
sameSite: 'strict'
maxAge: 3600 (1 saat)

// auth-state cookie (server-only)
httpOnly: true  
secure: production'da true
sameSite: 'strict'
maxAge: 3600 (1 saat)
```

### 2. AuthContext Güncellemeleri
**Dosya:** `src/contexts/AuthContext.tsx`

**Değişiklikler:**
- `updateAuthCookies()`: Artık API endpoint'i kullanıyor
- `clearAuthCookies()`: API endpoint'i ile güvenli clearing
- Fallback client-side clearing API fail durumunda

## Güvenlik İyileştirmeleri

### Önceki Durum (Güvensiz)
```javascript
// Client-side cookie setting
document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
```

**Sorunlar:**
- Client-side manipulation mümkün
- SameSite=Lax (gevşek)
- HttpOnly flag yok
- Token validation yok

### Yeni Durum (Güvenli)
```javascript
// Server-side API call
fetch('/api/auth/cookies', {
  method: 'POST',
  body: JSON.stringify({ token, action: 'set' })
});
```

**İyileştirmeler:**
- ✅ Server-side token validation
- ✅ SameSite=strict 
- ✅ HttpOnly flag (auth-state için)
- ✅ Secure flag production'da
- ✅ Proper expiration handling

## Cookie Güvenlik Katmanları

### 1. Token Validation
- Her cookie set işleminde Firebase Admin SDK ile token doğrulama
- Invalid token'lar reddediliyor

### 2. Cookie Flags
- **Secure**: HTTPS'de sadece iletim
- **HttpOnly**: auth-state cookie JavaScript'ten erişilemez
- **SameSite=strict**: CSRF saldırılarına karşı maksimum koruma

### 3. Expiration Management
- 1 saatlik expire süresi
- Automatic refresh sistemi mevcut

## Test Senaryoları

### 1. Normal Login Flow
1. Kullanıcı login olur
2. AuthContext → updateAuthCookies() → API call
3. Server token'ı validate eder
4. Secure cookies set edilir

### 2. Token Refresh
1. 50 dakikada bir automatic refresh
2. Yeni token API'ye gönderilir
3. Cookies yenilenir

### 3. Logout Flow
1. clearAuthCookies() API call'u
2. Server-side cookies clear edilir
3. Fallback client-side clearing

### 4. Invalid Token Handling
1. Manipulated token API'ye gönderilir
2. Firebase Admin SDK reject eder
3. Cookies set edilmez, 401 döner

## Browser Developer Tools'da Kontrol

**Application → Cookies sekmesinde:**
- `auth-token`: Secure flag ✅, SameSite=Strict ✅
- `auth-state`: HttpOnly ✅, Secure flag ✅, SameSite=Strict ✅

## Deployment Notları

- Development'ta Secure flag=false (HTTP için)
- Production'da Secure flag=true (HTTPS için)
- Environment variable kontrolü: `process.env.NODE_ENV === 'production'`

## Rollback Planı

Eğer sorun yaşarsanız:
1. AuthContext'teki API calls'ları comment out edin
2. Eski client-side cookie setting'i restore edin
3. `/api/auth/cookies` endpoint'ini disable edin

## Monitoring

Cookie security'yi monitor etmek için:
- Browser Network tab'da cookie headers'ları kontrol edin
- Security scan tools ile test edin
- Production'da Set-Cookie headers'ları logla
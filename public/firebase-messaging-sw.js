// Firebase Cloud Messaging Service Worker

// Firebase SDK'larını import et
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyCSC6QnQDHdOhQfJj2WyF9qgzP1xQe3h4Q",
  authDomain: "sportclubmanagement-2daba.firebaseapp.com",
  projectId: "sportclubmanagement-2daba",
  storageBucket: "sportclubmanagement-2daba.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Messaging instance'ı al
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildiriminiz var',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'sport-club-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Aç',
        icon: '/icons/open-icon.png'
      },
      {
        action: 'close',
        title: 'Kapat',
        icon: '/icons/close-icon.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    // Uygulamayı aç
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  
  // Default action (notification'a tıklama)
  if (!event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});
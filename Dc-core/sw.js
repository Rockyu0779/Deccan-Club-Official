// Deccan Club Admin Support - Service Worker (sw.js)

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Background Push Event Handling
self.addEventListener('push', function(event) {
    let payload = { title: "🔴 New Support Chat Request!", body: "A player needs assistance." };
    
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/893/893257.png', // Replace with your logo if needed
        badge: 'https://cdn-icons-png.flaticon.com/512/893/893257.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'deccan-support-ticket',
        renotify: true,
        data: {
            url: 'helpline.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Notification Click Handler - Focuses or Opens Helpline
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const targetUrl = event.notification.data && event.notification.data.url 
                      ? event.notification.data.url 
                      : 'helpline.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes('helpline.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

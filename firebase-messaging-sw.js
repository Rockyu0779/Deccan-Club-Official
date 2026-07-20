importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAnOtH9lPEapTk7z64HbZ0PQgw6O8tNi-A",
  authDomain: "deccan-club-official.firebaseapp.com",
  projectId: "deccan-club-official",
  storageBucket: "deccan-club-official.firebasestorage.app",
  messagingSenderId: "61787320782",
  appId: "1:61787320782:web:18629bfae6ff064e107b9f"
});

const messaging = firebase.messaging();

// Background Push Listener (जब ऐप बंद हो या बैकग्राउंड में हो)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || "Deccan Club Update";
  const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || "You have a new update!";
  const icon = (payload.notification && payload.notification.icon) || "/deccan-noti.png";

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    vibrate: [200, 100, 200, 100, 200], // Premium Vibration Pattern
    tag: 'deccan-club-alert',           // ओवरलैपिंग रोकने के लिए
    renotify: true,
    data: {
      url: payload.data && payload.data.url ? payload.data.url : "/"
    }
  };

  self.registration.showNotification(title, notificationOptions);
});

// Lock Screen / Status Bar Notification Click Handler
self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // अगर ऐप का टैब पहले से खुला है, तो उसे फोकस में लाओ
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // अगर ऐप बंद थी, तो नई विंडो/टैब खोलो
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

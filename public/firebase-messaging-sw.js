importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBmiOVCkHuxN7oNN2i1fGxfWUUHmnVzImo",
  authDomain: "artisan3-0.firebaseapp.com",
  projectId: "artisan3-0",
  messagingSenderId: "824531230785",
  appId: "1:824531230785:web:662cc4c90c0077039926c0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});
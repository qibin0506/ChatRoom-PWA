var baseUrl = "https://codercard.net:8890/";
var dataUrl = baseUrl + "user";
var cacheName = "chat-cache-name";
var dataCacheName = "chat-data-cache-name";
var cacheFiles = [
    "/", "/index.html", "/css/main.css",
    "/mdl/bower.json","/mdl/bower.json",
    "/mdl/material.min.css", "/mdl/material.min.js",
    "/script/main.js", "/images/icon.png"
];

var isCurrentWindowFocus = true;

self.addEventListener("install", function(e) {
    e.waitUntil(caches.open(cacheName).then(function(cache) {
        return cache.addAll(cacheFiles);
    }));
});

self.addEventListener("activate", function(e) {
    e.waitUntil(caches.keys().then(function(keyList) {
        return Promise.all(keyList.map(function(key) {
            if (key !== cacheName && key !== dataCacheName) {
                return caches.delete(key);
            }
        }));
    }));

    return self.clients.claim();
});

self.addEventListener("fetch", function(e) {
    if (e.request.url.indexOf(dataUrl) === 0) {
        return e.respondWith(caches.open(dataCacheName).then(function(cache) {
            return fetch(e.request).then(function(response) {
                cache.put(e.request.url, response.clone());
                return response;
            });
        }));
    } else {
        e.respondWith(caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        }));
    }
});

self.addEventListener("push", function(e) {
    var message = JSON.parse(e.data.text());

    self.clients.matchAll().then(function(clientList) {
        clientList.forEach(function(client) {
            client.postMessage(message);
        });
    });

    const title = message.name;
    const options = {
        body: message.body,
        icon: "/images/icon.png",
        badge: "/images/icon.png"
    };

    if (!isCurrentWindowFocus) {
        e.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener("notificationclick", function(e) {
    e.notification.close();
    e.waitUntil(clients.openWindow(baseUrl));
});

self.addEventListener("message", function(e) {
    isCurrentWindowFocus = e.data == "visible";
});

// self.addEventListener("message", function(e) {
//     console.log(e.data);
//     e.waitUntil(self.clients.matchAll().then(function(clientsList) {
//         clientsList.forEach(function(client) {
//             client.postMessage("hello world");
//         });
//     }));
// });
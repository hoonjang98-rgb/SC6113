"use strict";

const CACHE_NAME = "pocketpay-v1";
const APP_FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(APP_FILES);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE_NAME;
    }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(function (response) {
    caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, response.clone()); });
    return response;
  }).catch(function () {
    return caches.match(event.request).then(function (cached) { return cached || caches.match("/"); });
  }));
});

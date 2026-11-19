// Holds a file chosen on the homepage while the tab moves to /app/. Chrome forgets a
// file's read permission once nothing holds it, and the homepage goes away before the
// app arrives. Only the file's handle is held, in memory, until this worker goes idle.
// No fetch handler: page loads never pass through here.

let held; // eslint-disable-line no-unused-vars

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("message", (e) => {
  held = e.data;
  e.ports[0]?.postMessage(true);
});

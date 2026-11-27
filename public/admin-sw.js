/* Driver notifications only. Dashboard HTML and booking data always come from the network. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(self.registration.showNotification("New ride request", {
    body: "Open Grace Transportation to review it.",
    tag: typeof payload.tag === "string" ? payload.tag : "grace-request",
    icon: "/driver-icon-192.png",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const dashboard = clients.find((client) => new URL(client.url).pathname.startsWith("/admin"));
    return dashboard ? dashboard.focus() : self.clients.openWindow("/admin");
  }));
});

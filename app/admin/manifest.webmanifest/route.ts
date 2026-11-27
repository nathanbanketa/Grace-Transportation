export function GET() {
  return Response.json({
    id: "/admin",
    name: "Grace Transportation Driver",
    short_name: "Grace Driver",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#111214",
    theme_color: "#111214",
    icons: [
      { src: "/driver-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/driver-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}

import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="shell fallback-page">
    <Brand />
    <div className="fallback-content">
      <h1 className="booking-heading">Page not found</h1>
      <p className="booking-help">This page may have moved or the link may be incomplete.</p>
      <Link className="button button-light" href="/">Return to Grace Transportation</Link>
    </div>
  </main>;
}

"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";

export default function DriverError({ reset }: { reset: () => void }) {
  return <main className="shell driver-login">
    <Brand />
    <div className="driver-login-content">
      <h1>Dashboard unavailable</h1>
      <p className="error" role="alert">The dashboard couldn’t load this page. Try again or return to your requests.</p>
      <div className="actions"><button className="button button-light" onClick={reset}>Try again</button><Link className="driver-link" href="/admin">Ride requests</Link></div>
    </div>
  </main>;
}

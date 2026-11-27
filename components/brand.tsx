import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Grace Transportation home">
      <svg viewBox="0 0 54 42" width="49" height="39" fill="none" aria-hidden="true">
        <path d="M8 31H5l1-5 6-2 7-7h19l7 7 5 2v5h-4m-29 0h19M16 24h24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12.5" cy="31" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="41" cy="31" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M13 13c6 2 10 1 14-3-5 0-9-3-10-8 6 4 10 5 15 5 3-4 7-4 10-1l4 1-5 2c-2 4-7 6-13 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span><strong>GRACE</strong><small>TRANSPORTATION</small></span>
    </Link>
  );
}

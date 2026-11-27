import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grace Transportation | Private SUV Service in Dallas–Fort Worth",
  description: "Advance-booked private SUV transportation for airport transfers, executive travel, family trips, private events and hourly bookings in Dallas–Fort Worth.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

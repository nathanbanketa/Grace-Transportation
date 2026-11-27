import Image from "next/image";
import { Brand } from "@/components/brand";
import { BookingForm } from "@/components/booking-form";

const services = [
  { name: "Executive travel", text: "Private transportation for meetings, conferences and business itineraries." },
  { name: "Family trips", text: "Travel together with room for your luggage." },
  { name: "Private events", text: "Plan your ride for dinners, celebrations and other occasions." },
  { name: "Hourly service", text: "Reserve the Suburban by the hour for an itinerary with multiple stops." },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="public-nav" aria-label="Main navigation">
            <a href="#services">Services</a>
            <a href="#about">Your driver</a>
          </nav>
          <a className="button button-outline" href="#book">Book Ahead</a>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="shell hero" aria-labelledby="hero-title">
          <div className="hero-mast">
            <h1 id="hero-title">Dallas, driven.</h1>
            <div className="hero-copy">
              <p>Private SUV rides, booked ahead, across Dallas and Fort Worth.</p>
              <a className="button button-light" href="#book">Book Ahead</a>
            </div>
          </div>
          <figure className="hero-visual">
            <div className="hero-photo">
              <Image src="/dallas-drive.webp" alt="Illustrative black Chevrolet Suburban beside a limestone building" fill preload sizes="(max-width: 1400px) 100vw, 1320px" />
            </div>
            <figcaption><span>Private Chevrolet Suburban service</span><span>Dallas &amp; Fort Worth, Texas</span></figcaption>
          </figure>
        </section>
        <section className="shell services-section" id="services">
          <h2>From the runway<br className="desktop-break" /> to the rest of DFW.</h2>
          <div className="service-layout">
            <article className="airport-service">
              <h3>Airport transfers</h3>
              <p>Reserve a private pickup or drop-off at either Dallas airport.</p>
              <dl className="airport-list">
                <div><dt>DFW</dt><dd>Dallas Fort Worth International</dd></div>
                <div><dt>DAL</dt><dd>Dallas Love Field</dd></div>
              </dl>
            </article>
            <div className="service-list">
              {services.map(({ name, text }) => (
                <article key={name}><h3>{name}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </section>
        <section className="booking-band" id="book">
          <div className="shell booking-section">
            <div className="section-heading">
              <h2>Book your ride.</h2>
              <p>Share your trip. Temesgen will review availability and pricing before requesting a deposit.</p>
            </div>
            <BookingForm />
          </div>
        </section>
        <section className="shell about-section" id="about">
          <h2>Temesgen, your driver.</h2>
          <p>With over six years in the transportation industry, Temesgen personally reviews each request and drives the black Chevrolet Suburban.</p>
        </section>
      </main>
      <footer className="site-footer">
        <div className="shell footer">
          <Brand />
          <p>Private SUV transportation in Dallas and Fort Worth, Texas.</p>
        </div>
      </footer>
    </>
  );
}

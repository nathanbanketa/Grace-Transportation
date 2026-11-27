import Image from "next/image";
import { Brand } from "@/components/brand";
import { BookingForm } from "@/components/booking-form";

const services = [
  { name: "Airport transfers", text: "Private pickups and drop-offs at DFW and Dallas Love Field." },
  { name: "Executive transportation", text: "Discreet travel for meetings, conferences, and business itineraries." },
  { name: "Family transportation", text: "A private ride for family outings, visits, and trips with luggage." },
  { name: "Private events", text: "Arrange transportation for dinners, celebrations, and special occasions." },
  { name: "Hourly bookings", text: "Reserve the Suburban by the hour for an itinerary with multiple stops." },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="public-nav" aria-label="Main navigation">
            <a href="#services">Services</a><a href="#about">About</a>
          </nav>
          <a className="button button-outline" href="#book">Book Ahead</a>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="shell hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Private SUV transportation</h1>
            <p className="hero-description">Advance-booked DFW rides in a black Chevrolet Suburban.</p>
            <a className="button button-light" href="#book">Book Ahead</a>
          </div>
          <figure className="hero-visual">
            <div className="hero-photo">
              <Image src="/suburban.webp" alt="Black Chevrolet Suburban with the Dallas skyline at dusk" fill preload sizes="(max-width: 820px) 100vw, (max-width: 1360px) 60vw, 760px" />
            </div>
            <figcaption><span>Black Chevrolet Suburban</span><span>Dallas, Texas</span></figcaption>
          </figure>
        </section>
        <section className="shell editorial-section" id="services">
          <h2>Private rides across DFW</h2>
          <div className="service-list">
            {services.map(({ name, text }) => <article key={name}><h3>{name}</h3><p>{text}</p></article>)}
          </div>
        </section>
        <section className="booking-band" id="book">
          <div className="shell editorial-section booking-section">
            <div className="section-heading"><h2>Book your ride</h2><p>Share your trip details with Temesgen. He’ll review availability and pricing before requesting a deposit.</p></div>
            <BookingForm />
          </div>
        </section>
        <section className="shell editorial-section about-section" id="about">
          <h2>Your driver</h2>
          <p>Temesgen brings over six years of transportation industry experience to Grace Transportation. He personally reviews each advance booking and drives the black Chevrolet Suburban.</p>
        </section>
      </main>
      <footer className="site-footer"><div className="shell footer"><Brand/><p>Private transportation across the Dallas and Fort Worth area</p></div></footer>
    </>
  );
}

import Image from "next/image";
import { Brand } from "@/components/brand";
import { BookingForm } from "@/components/booking-form";

const services = ["Executive travel", "Family trips", "Private events", "Hourly bookings"];

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
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-photo">
            <Image src="/dallas-drive.webp" alt="" fill preload sizes="100vw" />
          </div>
          <div className="shell hero-inner">
            <div className="hero-copy">
              <h1 id="hero-title">Private SUV rides</h1>
              <p>Advance bookings in Dallas and Fort Worth.</p>
              <a className="button button-light" href="#book">Book Ahead</a>
            </div>
          </div>
        </section>
        <section className="shell services-section" id="services">
          <h2>Ride options</h2>
          <div className="service-layout">
            <article className="airport-service">
              <h3>Airport transfers</h3>
              <dl className="airport-list">
                <div><dt>DFW</dt><dd>Dallas Fort Worth International</dd></div>
                <div><dt>DAL</dt><dd>Dallas Love Field</dd></div>
              </dl>
            </article>
            <ul className="service-list" role="list">
              {services.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
        </section>
        <section className="booking-band" id="book">
          <div className="shell booking-section">
            <div className="section-heading">
              <h2>Book a ride</h2>
              <p>Temesgen confirms availability and pricing before requesting a deposit.</p>
            </div>
            <BookingForm />
          </div>
        </section>
        <section className="shell about-section" id="about">
          <h2>Your driver</h2>
          <p>Temesgen has over six years of transportation experience. He reviews each request and drives the Chevrolet Suburban.</p>
        </section>
      </main>
      <footer className="site-footer">
        <div className="shell footer"><Brand /></div>
      </footer>
    </>
  );
}

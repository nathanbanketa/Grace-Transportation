import Image from "next/image";
import { BriefcaseBusiness, CalendarDays, CarFront, Clock3, MapPin, Plane, UsersRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { BookingForm } from "@/components/booking-form";

const services = [
  { name: "Airport Transfers", text: "Private pickups and drop-offs at DFW and Dallas Love Field.", icon: Plane },
  { name: "Executive Transportation", text: "Discreet travel for meetings, conferences, and business itineraries.", icon: BriefcaseBusiness },
  { name: "Family Transportation", text: "A private ride for family outings, visits, and trips with luggage.", icon: UsersRound },
  { name: "Private Events", text: "Arrange transportation for dinners, celebrations, and special occasions.", icon: CalendarDays },
  { name: "Hourly Bookings", text: "Reserve the Suburban by the hour for an itinerary with multiple stops.", icon: Clock3 },
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav aria-label="Main navigation"><a href="#services">Services</a><a href="#about">About</a></nav>
          <a className="button button-outline" href="#book">Book Ahead</a>
        </div>
      </header>
      <main id="main">
        <section className="shell hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><MapPin size={15} /> DALLAS–FORT WORTH, TEXAS</p>
            <h1 id="hero-title">Private SUV<br/> Transportation<span>.</span></h1>
            <p className="hero-description">Advance-booked rides across Dallas–Fort Worth in a black Chevrolet Suburban. For airport transfers, business travel, and special occasions.</p>
            <a className="button button-light" href="#book">Book Ahead</a>
          </div>
          <figure className="hero-visual">
            <Image src="/suburban.webp" alt="Black Chevrolet Suburban with the Dallas skyline at dusk" fill preload sizes="(max-width: 850px) 100vw, 58vw" />
            <figcaption><CarFront size={16}/> BLACK CHEVROLET SUBURBAN</figcaption>
          </figure>
        </section>
        <section className="services-section" id="services">
          <div className="shell">
            <div className="section-heading"><p className="eyebrow">OUR SERVICES</p><h2>Private rides across DFW</h2></div>
            <div className="services-grid">
              {services.map(({ name, text, icon: Icon }) => <article key={name}><Icon size={23} strokeWidth={1.5} aria-hidden="true"/><h3>{name}</h3><p>{text}</p></article>)}
            </div>
          </div>
        </section>
        <section className="shell booking-section" id="book">
          <div className="section-heading"><p className="eyebrow">RESERVATIONS</p><h2>Book your ride</h2><p>Share your trip details with Temesgen. He’ll review availability and pricing before requesting a deposit.</p></div>
          <BookingForm />
        </section>
        <section className="about-section" id="about">
          <div className="shell about-inner"><div><p className="eyebrow">YOUR DRIVER</p><h2>Meet Temesgen</h2></div><p>Temesgen brings over six years of transportation industry experience to Grace Transportation. He personally reviews each advance booking and drives the black Chevrolet Suburban.</p></div>
        </section>
      </main>
      <footer className="shell footer"><Brand/><p>Private transportation in Dallas–Fort Worth, Texas</p></footer>
    </>
  );
}

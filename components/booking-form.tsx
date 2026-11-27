"use client";

import { useRef, useState, type FormEvent } from "react";
import { airports, tripTypes, tripStepSchema, contactSchema } from "@/lib/booking";

const initial = { pickup:"", destination:"", date:"", time:"", tripType:"", passengers:"1", luggage:"0", airport:"", airportName:"", airportDirection:"", flight:"", name:"", email:"", phone:"" };
const labels: Record<keyof typeof initial, string> = {
  pickup:"Pickup location", destination:"Destination", date:"Pickup date", time:"Pickup time (Central)", tripType:"Trip type",
  passengers:"Passengers", luggage:"Luggage count", airport:"Airport", airportName:"Airport name or code", airportDirection:"Airport service", flight:"Flight number",
  name:"Full name", email:"Email address", phone:"Phone number",
};
const steps = ["Trip details", "Contact details", "Review"];
const fieldErrors: Record<keyof typeof initial, string> = {
  pickup: "Enter a pickup address or location.", destination: "Enter a destination address or location.",
  date: "Choose a pickup date.", time: "Choose a pickup time.", tripType: "Select a trip type.",
  passengers: "Enter a passenger count from 1 to 100.", luggage: "Enter a luggage count from 0 to 100.",
  airport: "Select an airport.", airportName: "Enter the airport name or code.",
  airportDirection: "Select arrival pickup or departure drop-off.", flight: "Enter your flight number.",
  name: "Enter your full name.", email: "Enter a valid email address.", phone: "Enter a valid phone number.",
};

export function BookingForm() {
  const [values, setValues] = useState(initial);
  const [step, setStep] = useState(0);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState("");
  const requestId = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);

  function move(next: number) {
    setIssues({});
    setError("");
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) {
      const result = (step === 0 ? tripStepSchema : contactSchema).safeParse(values);
      if (!result.success) {
        setIssues(Object.fromEntries(result.error.issues.map(({ path, message, code }) => [path[0], code === "custom" ? message : fieldErrors[path[0] as keyof typeof fieldErrors] ?? message])));
        requestAnimationFrame(() => document.querySelector<HTMLElement>("#booking-form [aria-invalid=true]")?.focus());
        return;
      }
      move(step + 1);
      return;
    }

    if (sending) return;
    setSending(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, requestId: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The request could not be submitted. Please try again.");
        return;
      }
      setReference(result.reference);
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setError("The request could not be submitted. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function field(name: keyof typeof initial, options?: readonly string[], type = "text", autoComplete?: string) {
    const props = {
      id: `booking-${name}`, name, value: values[name],
      required: true,
      "aria-invalid": !!issues[name],
      "aria-describedby": issues[name] ? `error-${name}` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        requestId.current = "";
        setValues((previous) => ({ ...previous, [name]: value }));
      },
    };
    return <div className="field">
      <label htmlFor={props.id}>{labels[name]}</label>
      {options ? <select {...props}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select>
        : <input {...props} type={type} autoComplete={autoComplete} min={type === "number" ? (name === "passengers" ? 1 : 0) : undefined} />}
      {issues[name] && <small id={`error-${name}`}>{issues[name]}</small>}
    </div>;
  }

  if (reference) return <div className="booking-form booking-receipt">
    <h3 ref={heading} tabIndex={-1} className="booking-heading">Request received</h3>
    <p role="status">Your request is pending. Temesgen will review availability and pricing.</p>
    <dl><dt>Booking reference</dt><dd>{reference}</dd></dl>
  </div>;

  return <form id="booking-form" className="booking-form" onSubmit={submit} noValidate aria-busy={sending}>
    <ol className="steps" aria-label="Booking progress">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol>
    <h3 ref={heading} tabIndex={-1} className="sr-only">{steps[step]}</h3>
    {step < 2 && <p className="booking-help">All displayed fields are required.</p>}
    {error && <p className="error mb-4" role="alert">{error}</p>}
    {step === 0 && <div className="fields">
      {field("pickup")}{field("destination")}{field("date", undefined, "date")}{field("time", undefined, "time")}
      {field("tripType", tripTypes)}{field("passengers", undefined, "number")}{field("luggage", undefined, "number")}
      {values.tripType === "Airport transfer" && <>{field("airport", airports)}{values.airport === "Other airport" && field("airportName")}{field("airportDirection", ["Arrival pickup", "Departure drop-off"])}{field("flight")}</>}
    </div>}
    {step === 1 && <div className="fields">{field("name", undefined, "text", "name")}{field("email", undefined, "email", "email")}{field("phone", undefined, "tel", "tel")}</div>}
    {step === 2 && <div className="booking-review">
      {([
        ["Route", ["pickup", "destination", "date", "time"]],
        ["Trip details", ["tripType", "passengers", "luggage", ...(values.tripType === "Airport transfer" ? ["airport", ...(values.airport === "Other airport" ? ["airportName"] : []), "airportDirection", "flight"] : [])]],
        ["Contact", ["name", "email", "phone"]],
      ] as [string, (keyof typeof initial)[]][]).map(([title, keys]) => <section key={title}>
        <h4>{title}</h4>
        <dl className="summary">{keys.map((key) => <div key={key}><dt>{labels[key]}</dt><dd>{values[key]}</dd></div>)}</dl>
      </section>)}
    </div>}
    <p className="sr-only" role="status">{sending ? "Submitting your booking request." : ""}</p>
    <div className="actions">
      {step > 0 && <button type="button" className="button button-outline" disabled={sending} onClick={() => move(step - 1)}>Back</button>}
      <button type="submit" className="button button-light" disabled={sending}>{step === 0 ? "Continue to Booking Details" : step === 1 ? "Review Request" : sending ? "Submitting…" : "Submit Booking Request"}</button>
    </div>
  </form>;
}

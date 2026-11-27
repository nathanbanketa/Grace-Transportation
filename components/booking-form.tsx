"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { airports, tripTypes, tripStepSchema, contactSchema } from "@/lib/booking";

const initial = { pickup:"", destination:"", date:"", time:"", tripType:"", passengers:"1", luggage:"0", airport:"", airportName:"", airportDirection:"", flight:"", name:"", email:"", phone:"" };
const labels: Record<keyof typeof initial, string> = {
  pickup:"Pickup location", destination:"Destination", date:"Pickup date", time:"Pickup time (Central)", tripType:"Trip type",
  passengers:"Passengers", luggage:"Luggage count", airport:"Airport", airportName:"Airport name or code", airportDirection:"Airport service", flight:"Flight number",
  name:"Full name", email:"Email address", phone:"Phone number",
};
const steps = ["Trip details", "Contact details", "Review"];

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
        setIssues(Object.fromEntries(result.error.issues.map(({ path, message, code }) => [path[0], code === "custom" ? message : "Enter a valid value."])));
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
      "aria-invalid": !!issues[name],
      "aria-describedby": issues[name] ? `error-${name}` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        requestId.current = "";
        setValues((previous) => ({ ...previous, [name]: value }));
      },
    };
    return <label className="field">{labels[name]}
      {options ? <select {...props}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select>
        : <input {...props} type={type} autoComplete={autoComplete} min={type === "number" ? (name === "passengers" ? 1 : 0) : undefined} />}
      {issues[name] && <small id={`error-${name}`}>{issues[name]}</small>}
    </label>;
  }

  if (reference) return <div className="booking-form" role="status"><CheckCircle2 className="mb-3"/><h3 ref={heading} tabIndex={-1}>Request received</h3><p className="mt-2">Your request is pending. Temesgen will review availability and pricing. Save reference <strong>{reference}</strong>.</p></div>;

  return <form id="booking-form" className="booking-form" onSubmit={submit} noValidate>
    <ol className="steps" aria-label="Booking progress">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</li>)}</ol>
    <h3 ref={heading} tabIndex={-1} className="mb-4 font-semibold">{steps[step]}</h3>
    {step === 0 && <div className="fields">
      {field("pickup")}{field("destination")}{field("date", undefined, "date")}{field("time", undefined, "time")}
      {field("tripType", tripTypes)}{field("passengers", undefined, "number")}{field("luggage", undefined, "number")}
      {values.tripType === "Airport transfer" && <>{field("airport", airports)}{values.airport === "Other airport" && field("airportName")}{field("airportDirection", ["Arrival pickup", "Departure drop-off"])}{field("flight")}</>}
    </div>}
    {step === 1 && <div className="fields">{field("name", undefined, "text", "name")}{field("email", undefined, "email", "email")}{field("phone", undefined, "tel", "tel")}</div>}
    {step === 2 && <dl className="summary">{(Object.keys(values) as (keyof typeof values)[]).filter((key) => values[key] && (key !== "airportName" || values.airport === "Other airport") && (values.tripType === "Airport transfer" || !["airport","airportName","airportDirection","flight"].includes(key))).map((key) => <div key={key}><dt>{labels[key]}</dt><dd>{values[key]}</dd></div>)}</dl>}
    {error && <p className="error mt-4" role="alert">{error}</p>}
    <div className="actions">
      {step > 0 && <button type="button" className="button button-outline" disabled={sending} onClick={() => move(step - 1)}>Back</button>}
      <button type="submit" className="button button-light" disabled={sending}>{step === 0 ? "Continue to Booking Details" : step === 1 ? "Review Request" : sending ? "Submitting…" : "Submit Booking Request"}</button>
    </div>
  </form>;
}

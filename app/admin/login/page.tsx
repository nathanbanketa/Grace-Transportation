import { ActionButton } from "@/components/action-button";
import { Brand } from "@/components/brand";
import { signIn } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <main className="shell driver-login">
    <Brand />
    <div className="driver-login-content">
    <h1>Driver sign in</h1>
    <form className="driver-form" action={signIn}>
      <label className="field">Email<input name="email" type="email" autoComplete="username" required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {message && <p className="error" role="alert">{message === "unavailable" ? "Driver sign-in is unavailable." : "Check your email and password."}</p>}
      <ActionButton pendingLabel="Signing in…">Sign in</ActionButton>
    </form>
    </div>
  </main>;
}

import { Brand } from "@/components/brand";
import { signIn } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <main className="shell admin max-w-lg">
    <Brand />
    <h1 className="text-4xl">Driver sign in</h1>
    <form className="admin-card" action={signIn}>
      <label className="field">Email<input name="email" type="email" autoComplete="username" required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {message && <p className="error" role="alert">{message === "unavailable" ? "Driver sign-in is unavailable." : "Check your email and password."}</p>}
      <button className="button button-light">Sign in</button>
    </form>
  </main>;
}

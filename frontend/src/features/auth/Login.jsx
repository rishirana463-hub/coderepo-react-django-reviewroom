import { useState } from "react";
import { api, setToken } from "../../shared/api/client";
import Icon from "../../shared/components/Icon";
import { FormField } from "../../shared/components/Primitives";

export default function Login({ onLogin }) {
	const [email, setEmail] = useState("owner@reviewroom.test");
	const [password, setPassword] = useState("Reviewroom2026!");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const result = await api("/auth/login", { method: "POST", body: { email, password } });
			setToken(result.token);
			onLogin(result.user);
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<main className="login-page">
			<section className="login-story">
				<a className="brand" href="#">
					<span className="brand-mark">
						r<span>•</span>
					</span>
					reviewroom<span className="brand-dot">.</span>
				</a>
				<div>
					<p className="eyebrow">A LITTLE CLARITY. A LOT OF GOOD WORK.</p>
					<h1>
						Great ideas deserve
						<br />
						<em>a clear way forward.</em>
					</h1>
					<p>Bring your creative work, thoughtful feedback, and final approvals into one shared space.</p>
					<div className="login-art">
						<img src="/assets/botanica.svg" alt="Botanica campaign artwork with sculptural green leaves" />
						<span className="login-approved">
							<Icon name="check" size={16} /> A little closer to approved.
						</span>
					</div>
				</div>
				<small>Made for teams who care about the details.</small>
			</section>
			<section className="login-form-wrap">
				<form className="login-form" onSubmit={submit}>
					<span className="pill">YOUR CREATIVE HQ</span>
					<h2>Good to have you here.</h2>
					<p>Sign in to your Reviewroom workspace.</p>
					<FormField label="Email address">
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
							autoComplete="username"
						/>
					</FormField>
					<FormField label="Password">
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
							autoComplete="current-password"
						/>
					</FormField>
					{error && (
						<p role="alert" className="form-error">
							{error}
						</p>
					)}
					<button className="button primary full" disabled={busy}>
						{busy ? "Signing in…" : "Enter your workspace"}
						<Icon name="arrow" size={18} />
					</button>
					<div className="demo-access">
						<strong>Take a look around</strong>
						<p>
							Seeded demo accounts share the password <code>Reviewroom2026!</code>
						</p>
						<div>
							{["owner", "editor", "reviewer"].map((role) => (
								<button
									type="button"
									className={email.startsWith(role) ? "active" : ""}
									key={role}
									onClick={() => {
										setEmail(`${role}@reviewroom.test`);
										setPassword("Reviewroom2026!");
									}}
								>
									{role}
								</button>
							))}
						</div>
					</div>
				</form>
				<p className="login-footnote">Feedback feels better when it’s all in one place.</p>
			</section>
		</main>
	);
}

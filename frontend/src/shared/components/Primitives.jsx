import { initials, statusLabel } from "../utils/format";
import Icon from "./Icon";

export function Avatar({ user, name, size = "", color = "" }) {
	const label = user?.name || user?.full_name || name || "Team member";
	return (
		<span className={`avatar ${size} ${color || user?.color || ""}`} title={label} role="img" aria-label={label}>
			{initials(label)}
		</span>
	);
}
export function AvatarStack({ users = [], limit = 3 }) {
	return (
		<div className="avatar-stack">
			{users.slice(0, limit).map((user, index) => (
				<Avatar key={user.id || index} user={user} size="small" color={["peach", "lavender", "mint"][index % 3]} />
			))}
			{users.length > limit && <span className="avatar small extra">+{users.length - limit}</span>}
		</div>
	);
}
export function Badge({ status, children }) {
	return (
		<span className={`badge ${status || ""}`}>
			<span className="status-dot" />
			{children || statusLabel(status)}
		</span>
	);
}
export function EmptyState({ title = "Nothing here yet", children, action }) {
	return (
		<div className="empty-state">
			<span className="empty-icon">
				<Icon name="layers" size={26} />
			</span>
			<h3>{title}</h3>
			{children && <p>{children}</p>}
			{action}
		</div>
	);
}
export function LoadingState({ label = "Loading your workspace…" }) {
	return (
		<div className="loading-state" role="status">
			<span className="spinner" />
			<p>{label}</p>
		</div>
	);
}
export function ErrorState({ error, retry }) {
	return (
		<div className="error-state" role="alert">
			<Icon name="help" />
			<div>
				<strong>Something needs a second look</strong>
				<p>{error?.message || String(error)}</p>
			</div>
			{retry && (
				<button className="button secondary" onClick={retry}>
					Try again
				</button>
			)}
		</div>
	);
}
export function SectionHeading({ title, subtitle, action }) {
	return (
		<div className="section-heading">
			<div>
				<h2>{title}</h2>
				{subtitle && <p>{subtitle}</p>}
			</div>
			{action}
		</div>
	);
}
export function FormField({ label, children, hint }) {
	return (
		<label className="form-field">
			<span>{label}</span>
			{children}
			{hint && <small>{hint}</small>}
		</label>
	);
}

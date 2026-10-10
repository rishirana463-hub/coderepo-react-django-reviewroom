const base = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
let token = sessionStorage.getItem("reviewroom-token") || "";
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
	onUnauthorized = handler;
}
export function setToken(value) {
	token = value || "";
	if (token) sessionStorage.setItem("reviewroom-token", token);
	else sessionStorage.removeItem("reviewroom-token");
}
export async function api(path, options = {}) {
	const requestToken = token;
	const headers = {
		...(options.body ? { "Content-Type": "application/json" } : {}),
		...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
		...options.headers,
	};
	const response = await fetch(`${base}${path}`, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		if (response.status === 401 && !path.includes("/auth/login") && token === requestToken) {
			setToken("");
			onUnauthorized();
		}
		const error = new Error(payload.error?.message || payload.detail || payload.message || `Request failed (${response.status})`);
		error.status = response.status;
		throw error;
	}
	return payload.data;
}
export function queryString(filters = {}) {
	return new URLSearchParams(
		Object.entries(filters)
			.filter(([, value]) => value !== "" && value !== undefined && value !== null && value !== false)
			.map(([key, value]) => [key, String(value)]),
	).toString();
}
export async function download(path, filename) {
	const response = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
	if (!response.ok) throw new Error("The export could not be prepared. Please try again.");
	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const initials = (name = "") =>
	name
		.split(" ")
		.map((word) => word[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
export const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
export const dateLabel = (value) =>
	value
		? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})
		: "No deadline";
export const relativeTime = (value) => {
	if (!value) return "Just now";
	const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
	return `${Math.floor(minutes / 1440)}d ago`;
};
export const localDateInput = (value) => (value ? String(value).slice(0, 10) : "");
export const statusLabel = (status) =>
	({
		in_review: "In review",
		changes_requested: "Changes requested",
		approved: "Approved",
		draft: "Draft",
		active: "Active",
		archived: "Archived",
		completed: "Completed",
	})[status] || titleCase(status);

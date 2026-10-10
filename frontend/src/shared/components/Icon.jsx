const paths = {
	grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
	folder: "M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
	layers: "m12 3 10 5-10 5L2 8l10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5",
	check: "m5 12 4 4L19 6",
	review: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
	inbox: "M3 4h18v16H3z M3 13h5l2 3h4l2-3h5",
	chart: "M4 3v18h18 M9 16v-5 M14 16V7 M19 16V4",
	search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
	plus: "M12 5v14 M5 12h14",
	arrow: "M5 12h14 m-5-5 5 5-5 5",
	chevron: "m9 5 7 7-7 7",
	down: "m6 9 6 6 6-6",
	bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
	clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
	message: "M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z",
	download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
	filter: "M4 7h16 M7 12h10 M10 17h4",
	image: "M3 3h18v18H3z m0 14 6-6 4 4 3-3 5 5 M15 7h.01",
	file: "M14 2H5v20h14V7l-5-5Z M14 2v6h5 M8 12h8 M8 16h6",
	close: "m6 6 12 12 M6 18 18 6",
	menu: "M4 6h16 M4 12h16 M4 18h16",
	logout: "M9 21H3V3h6 M9 12h13 m-5-5 5 5-5 5",
	people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
	sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
	more: "M5 12h.01 M12 12h.01 M19 12h.01",
	help: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
	link: "M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2",
};

export default function Icon({ name, size = 20, ...props }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.65"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<path d={paths[name] || paths.file} />
		</svg>
	);
}

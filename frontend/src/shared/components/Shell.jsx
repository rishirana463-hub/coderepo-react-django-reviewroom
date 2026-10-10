import { useState } from "react";
import Icon from "./Icon";
import { Avatar } from "./Primitives";
import { titleCase } from "../utils/format";

const links = [
	["overview", "grid", "Overview"],
	["projects", "folder", "Projects"],
	["assets", "layers", "All assets"],
	["reviews", "review", "My reviews"],
	["inbox", "inbox", "Inbox"],
	["reports", "chart", "Reports"],
];
export default function Shell({ user, page, navigate, unread, search, setSearch, onLogout, children }) {
	const [open, setOpen] = useState(false);
	const go = (path) => {
		navigate(path);
		setOpen(false);
	};
	return (
		<div className="app-layout">
			<a href="#main-content" className="skip-link">
				Skip to content
			</a>
			{open && <button className="sidebar-shade" aria-label="Close navigation" onClick={() => setOpen(false)} />}
			<aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Workspace navigation">
				<a
					href="#overview"
					className="brand"
					onClick={(event) => {
						event.preventDefault();
						go("overview");
					}}
				>
					<span className="brand-mark">
						r<span>•</span>
					</span>
					reviewroom<span className="brand-dot">.</span>
				</a>
				<div className="workspace-switch">
					<span className="workspace-mark">
						S<span>✳</span>
					</span>
					<div>
						<strong>Studio Collective</strong>
						<small>Your creative workspace</small>
					</div>
					<Icon name="down" size={15} />
				</div>
				<p className="nav-caption">WORKSPACE</p>
				<nav>
					{links.map(([path, icon, label]) => (
						<a
							key={path}
							href={`#${path}`}
							className={`nav-link ${page === path ? "active" : ""}`}
							aria-current={page === path ? "page" : undefined}
							onClick={(event) => {
								event.preventDefault();
								go(path);
							}}
						>
							<Icon name={icon} size={19} />
							<span>{label}</span>
							{path === "inbox" && unread > 0 && <span className="nav-count">{unread}</span>}
						</a>
					))}
				</nav>
				<div className="sidebar-bottom">
					<div className="sidebar-note">
						<Icon name="sparkle" size={23} />
						<strong>
							Less chasing.
							<br />
							More creating.
						</strong>
						<p>
							Good work is a team sport.
							<br />
							You’re in the right room.
						</p>
					</div>
					<button className="sidebar-help" onClick={() => go("help")}>
						<Icon name="help" size={18} />
						Workspace guide
						<Icon name="arrow" size={16} />
					</button>
					<div className="profile">
						<Avatar user={user} color="peach" />
						<div>
							<strong>{user.name}</strong>
							<small>{titleCase(user.role)}</small>
						</div>
						<button className="icon-button" aria-label="Sign out" onClick={onLogout}>
							<Icon name="logout" size={18} />
						</button>
					</div>
				</div>
			</aside>
			<div className="main-layout">
				<header className="topbar">
					<div className="topbar-start">
						<button
							className="icon-button mobile-menu"
							aria-label="Open navigation"
							aria-expanded={open}
							onClick={() => setOpen((value) => !value)}
						>
							<Icon name="menu" />
						</button>
						<span className="breadcrumb">
							Workspace <Icon name="chevron" size={13} />{" "}
							<strong>
								{page === "asset"
									? "Asset review"
									: page === "project"
										? "Project"
										: links.find((link) => link[0] === page)?.[2] || "Workspace guide"}
							</strong>
						</span>
					</div>
					<div className="topbar-actions">
						<label className="global-search">
							<Icon name="search" size={17} />
							<input
								type="search"
								placeholder="Find something good…"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									if (event.target.value) navigate("assets");
								}}
								aria-label="Search assets"
							/>
							<kbd>⌕</kbd>
						</label>
						<button
							className="icon-button notification-button"
							aria-label={`Inbox${unread ? `, ${unread} unread notifications` : ""}`}
							onClick={() => go("inbox")}
						>
							<Icon name="bell" size={21} />
							{unread > 0 && <span />}
						</button>
						<Avatar user={user} size="small" color="peach" />
					</div>
				</header>
				<main id="main-content" className={`main-content page-${page}`}>
					{children}
				</main>
				<footer className="app-footer">
					<span>A little clarity. A lot of good work.</span>
					<span>
						Made for thoughtful teams <span className="tiny-spark">✳</span>
					</span>
				</footer>
			</div>
		</div>
	);
}

import useResource from "../../shared/api/useResource";
import Icon from "../../shared/components/Icon";
import { Avatar, ErrorState, LoadingState, SectionHeading, EmptyState } from "../../shared/components/Primitives";
import { relativeTime } from "../../shared/utils/format";
import ProjectCard from "../projects/ProjectCard";
import AssetTable from "../assets/AssetTable";

export default function Dashboard({ user, projects, people, navigate, onCreate, refreshKey }) {
	const reports = useResource("/reports", null, refreshKey);
	const assets = useResource("/assets?pageSize=100&sort=due", null, refreshKey);
	const activity = useResource("/activity", [], refreshKey);
	if (reports.loading || assets.loading) return <LoadingState />;
	if (reports.error || assets.error)
		return (
			<ErrorState
				error={reports.error || assets.error}
				retry={() => {
					reports.refresh();
					assets.refresh();
				}}
			/>
		);
	const summary = reports.data?.summary || {};
	const items = assets.data?.items || [];
	const reviewQueue = items.filter((asset) => ["in_review", "changes_requested"].includes(asset.status)).slice(0, 4);
	const deadlines = items
		.filter((asset) => asset.dueAt && asset.status !== "approved")
		.sort((first, second) => new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime())
		.slice(0, 3);
	const stats = [
		["folder", "Active projects", projects.filter((project) => !project.archived).length, "Good things in motion", "violet"],
		["review", "Awaiting review", summary.inReview || 0, "Ready for a fresh pair of eyes", "amber"],
		["check", "Approved assets", summary.approved || 0, "One step closer to out there", "green"],
		["clock", "Overdue reviews", summary.overdue || 0, "A gentle nudge might help", "rose"],
	];
	return (
		<>
			<div className="page-heading">
				<div>
					<p className="eyebrow">YOUR WORK, IN A GOOD PLACE</p>
					<h1>
						Let’s make good things happen<span className="heading-star">✳</span>
					</h1>
					<p>Welcome back, {user.name.split(" ")[0]}. Here’s what’s moving in your workspace.</p>
				</div>
				{user.role !== "reviewer" && (
					<button className="button primary" onClick={onCreate}>
						<Icon name="plus" size={18} />
						New project
					</button>
				)}
			</div>
			<div className="dashboard-stats">
				{stats.map(([icon, label, value, description, color]) => (
					<button
						key={label}
						className="stat-card"
						onClick={() =>
							navigate(
								label === "Active projects"
									? "projects"
									: `assets${label === "Awaiting review" ? "?status=in_review" : label === "Approved assets" ? "?status=approved" : "?overdue=true"}`,
							)
						}
					>
						<div className="stat-label">
							<span>{label}</span>
							<span className={`stat-icon ${color}`}>
								<Icon name={icon} size={18} />
							</span>
						</div>
						<strong>{value}</strong>
						<small>{description}</small>
					</button>
				))}
			</div>
			<section className="projects-section">
				<SectionHeading
					title="Projects in motion"
					subtitle="A little progress, every day."
					action={
						<button className="text-button" onClick={() => navigate("projects")}>
							All projects
							<Icon name="arrow" size={15} />
						</button>
					}
				/>
				<div className="project-grid dashboard-projects">
					{projects
						.filter((project) => !project.archived)
						.slice(0, 3)
						.map((project) => (
							<ProjectCard key={project.id} project={project} people={people} onOpen={(id) => navigate(`project/${id}`)} />
						))}
				</div>
				{!projects.length && (
					<EmptyState
						title="Make room for your first project."
						action={
							<button className="button primary" onClick={onCreate}>
								New project
							</button>
						}
					/>
				)}
			</section>
			<div className="dashboard-bottom">
				<section className="panel review-panel">
					<SectionHeading
						title="Ready for a closer look"
						subtitle="These assets could use your thoughtful feedback."
						action={
							<button className="text-button" onClick={() => navigate("reviews")}>
								View all
								<Icon name="arrow" size={15} />
							</button>
						}
					/>
					<AssetTable assets={reviewQueue} people={people} onOpen={(id) => navigate(`asset/${id}`)} compact />
				</section>
				<section className="panel deadlines-panel">
					<SectionHeading
						title="Coming up"
						action={
							<span className="subtle-icon">
								<Icon name="clock" size={18} />
							</span>
						}
					/>
					<div className="deadline-list">
						{deadlines.map((asset) => (
							<button className="deadline-item" key={asset.id} onClick={() => navigate(`asset/${asset.id}`)}>
								<span className={`date-block ${new Date(asset.dueAt).getTime() < Date.now() ? "late" : ""}`}>
									<small>{new Date(asset.dueAt).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</small>
									<strong>{new Date(asset.dueAt).getDate()}</strong>
								</span>
								<span>
									<strong>{asset.title}</strong>
									<small>{asset.projectName}</small>
								</span>
								<Icon name="chevron" size={15} />
							</button>
						))}
						{!deadlines.length && <p className="muted">All caught up. Enjoy a little breathing room.</p>}
					</div>
					<div className="deadline-note">
						<span>✳</span>
						<p>
							A clear deadline makes
							<br />
							room for better work.
						</p>
					</div>
				</section>
			</div>
			<section className="activity-section">
				<SectionHeading title="Around the room" subtitle="The small steps behind the big ideas." />
				<div className="activity-strip">
					{activity.data?.slice(0, 3).map((event) => (
						<button
							className="activity-item"
							key={event.id}
							onClick={() => event.assetId && navigate(`asset/${event.assetId}`)}
						>
							<Avatar user={event.actor} color="lavender" size="small" />
							<div>
								<p>
									<strong>{event.actor?.name || "A teammate"}</strong>{" "}
									{event.description || event.action.replaceAll("_", " ")}
								</p>
								<small>
									{relativeTime(event.createdAt)}
									{event.assetTitle && ` · ${event.assetTitle}`}
								</small>
							</div>
						</button>
					))}
					{!activity.data?.length && <p className="muted">Your workspace activity will appear here.</p>}
				</div>
			</section>
		</>
	);
}

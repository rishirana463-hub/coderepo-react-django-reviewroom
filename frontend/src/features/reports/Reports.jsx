import { download } from "../../shared/api/client";
import useResource from "../../shared/api/useResource";
import Icon from "../../shared/components/Icon";
import { Avatar, ErrorState, LoadingState, SectionHeading } from "../../shared/components/Primitives";
import { dateLabel } from "../../shared/utils/format";

export default function Reports({ navigate, refreshKey, notify }) {
	const resource = useResource("/reports", null, refreshKey);
	if (resource.loading) return <LoadingState label="Putting the progress in perspective…" />;
	if (resource.error) return <ErrorState error={resource.error} retry={resource.refresh} />;
	const { summary, byProject = [], workload = [], trend = [] } = resource.data;
	const maxTrend = Math.max(1, ...trend.map((day) => day.approvals));
	async function exportReport() {
		try {
			await download("/reports/export.csv", "reviewroom-workspace-report.csv");
			notify("Your workspace report is ready.");
		} catch (error) {
			notify(error.message, "error");
		}
	}
	return (
		<>
			<div className="page-heading">
				<div>
					<p className="eyebrow">THE BIGGER PICTURE</p>
					<h1>
						Good work adds up<span className="heading-star">✳</span>
					</h1>
					<p>A clear view of your progress, your process, and your people.</p>
				</div>
				<button className="button secondary" onClick={exportReport}>
					<Icon name="download" size={17} />
					Export report
				</button>
			</div>
			<div className="dashboard-stats report-stats">
				{[
					["Total assets", summary.totalAssets, "Every piece of the work"],
					["Approval rate", `${summary.approvalRate}%`, "Assets with every stage approved"],
					["Average review cycle", `${summary.averageCycleHours}h`, "Submission to final approval"],
					["Awaiting review", summary.inReview, `${summary.overdue} overdue reviews`],
				].map(([label, value, description]) => (
					<div className="stat-card" key={label}>
						<div className="stat-label">
							{label}
							<Icon name="chart" size={16} />
						</div>
						<strong>{value}</strong>
						<small>{description}</small>
					</div>
				))}
			</div>
			<div className="reports-grid">
				<section className="panel report-projects">
					<SectionHeading title="Progress by project" subtitle="Small steps toward a shared finish line." />
					<div className="project-report-list">
						{byProject.map((project) => (
							<button key={project.id} onClick={() => navigate(`project/${project.id}`)}>
								<div>
									<strong>{project.name}</strong>
									<span>
										{project.approved} / {project.total} approved
									</span>
								</div>
								<div className="progress-track">
									<span
										style={{
											width: `${project.total ? (project.approved / project.total) * 100 : 0}%`,
											background: project.color,
										}}
									/>
								</div>
								<small>
									{project.inReview} in review <span>·</span> {project.overdue} overdue
								</small>
							</button>
						))}
					</div>
				</section>
				<section className="panel report-trend">
					<SectionHeading title="A week of forward motion" subtitle="Recorded approvals over the last 7 days." />
					<div
						className="trend-chart"
						role="img"
						aria-label={`Daily approvals: ${trend.map((day) => `${dateLabel(day.date)}, ${day.approvals}`).join("; ")}`}
					>
						{trend.map((day) => (
							<div className="trend-column" key={day.date}>
								<strong>{day.approvals}</strong>
								<div className="trend-bar-track">
									<span style={{ height: `${Math.max(3, (day.approvals / maxTrend) * 100)}%` }} />
								</div>
								<small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</small>
							</div>
						))}
					</div>
					<p className="chart-note">Every yes moves a good idea forward.</p>
				</section>
			</div>
			<section className="panel workload-panel">
				<SectionHeading
					title="The people behind the progress"
					subtitle="Current stage assignments that are still waiting for a decision."
				/>
				<div className="workload-grid">
					{workload.map((item) => (
						<div className="workload-card" key={item.reviewer.id}>
							<Avatar user={item.reviewer} color="lavender" />
							<div>
								<strong>{item.reviewer.name}</strong>
								<small>{item.reviewer.role}</small>
							</div>
							<span>
								<strong>{item.assigned}</strong>
								<small>assigned</small>
							</span>
							<span className={item.overdue ? "overdue" : "muted"}>{item.overdue} overdue</span>
						</div>
					))}
				</div>
			</section>
		</>
	);
}

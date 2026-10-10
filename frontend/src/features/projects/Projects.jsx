import { useState } from "react";
import Icon from "../../shared/components/Icon";
import { EmptyState } from "../../shared/components/Primitives";
import ProjectCard from "./ProjectCard";

export default function Projects({ projects, people, user, navigate, onCreate }) {
	const [tab, setTab] = useState("active");
	const [query, setQuery] = useState("");
	const visible = projects.filter(
		(project) =>
			(tab === "archived" ? project.archived : !project.archived) && project.name.toLowerCase().includes(query.toLowerCase()),
	);
	return (
		<>
			<div className="page-heading">
				<div>
					<p className="eyebrow">A SHARED SPACE FOR GOOD IDEAS</p>
					<h1>
						Projects in good company<span className="heading-star">✳</span>
					</h1>
					<p>Keep the work, the feedback, and the people together.</p>
				</div>
				{user.role !== "reviewer" && (
					<button className="button primary" onClick={onCreate}>
						<Icon name="plus" size={18} />
						New project
					</button>
				)}
			</div>
			<div className="view-toolbar">
				<div className="tabs">
					<button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>
						Active projects <span>{projects.filter((project) => !project.archived).length}</span>
					</button>
					<button className={tab === "archived" ? "active" : ""} onClick={() => setTab("archived")}>
						Archived
					</button>
				</div>
				<label className="inline-search">
					<Icon name="search" size={16} />
					<input
						type="search"
						aria-label="Search projects"
						placeholder="Find a project…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
			</div>
			<div className="project-grid all-projects">
				{visible.map((project) => (
					<ProjectCard key={project.id} project={project} people={people} onOpen={(id) => navigate(`project/${id}`)} />
				))}
			</div>
			{!visible.length && <EmptyState title="There’s room for something new.">No projects match this view.</EmptyState>}
		</>
	);
}

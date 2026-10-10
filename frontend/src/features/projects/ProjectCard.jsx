import Icon from "../../shared/components/Icon";
import { AvatarStack } from "../../shared/components/Primitives";

export function projectCover(project) {
	const name = project.name.toLowerCase();
	return `/assets/${name.includes("botan") ? "botanica" : name.includes("studio") ? "studio" : name.includes("field") ? "fieldnotes" : "forma"}.svg`;
}
export default function ProjectCard({ project, people = [], onOpen }) {
	const total = project.assetCount || 0;
	const approved = project.approvedCount || 0;
	const progress = total ? Math.round((approved / total) * 100) : 0;
	const members = people.filter((person) => project.memberIds?.includes(person.id));
	return (
		<button className="project-card" onClick={() => onOpen(project.id)}>
			<div className="project-cover">
				<img src={projectCover(project)} alt={`${project.name} project cover`} loading="lazy" />
				<span className="project-cover-tag">{project.archived ? "Archived" : "In progress"}</span>
			</div>
			<div className="project-card-body">
				<div className="project-card-title">
					<h3>{project.name}</h3>
					<Icon name="arrow" size={17} />
				</div>
				<p>{project.description || "A little clarity for your next big idea."}</p>
				<div className="project-progress-label">
					<span>
						{approved} of {total} assets approved
					</span>
					<strong>{progress}%</strong>
				</div>
				<div className="progress-track">
					<span style={{ width: `${progress}%`, background: project.color || "#8b76ae" }} />
				</div>
				<div className="project-card-footer">
					<AvatarStack users={members} />
					<span>
						<Icon name="layers" size={14} /> {total} assets
					</span>
				</div>
			</div>
		</button>
	);
}

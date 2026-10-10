import { useState } from "react";
import { api } from "../../shared/api/client";
import { AvatarStack, Badge, EmptyState } from "../../shared/components/Primitives";
import Icon from "../../shared/components/Icon";
import Modal from "../../shared/components/Modal";
import Assets from "../assets/Assets";
import ProjectForm from "./ProjectForm";

export default function ProjectDetail({ id, projects, people, user, navigate, onCreate, onChanged, refreshKey, notify, setSearch }) {
	const [editing, setEditing] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [busy, setBusy] = useState(false);
	const project = projects.find((item) => item.id === id);
	if (!project) return <EmptyState title="This room isn’t available.">It may have been removed, or you may not have access.</EmptyState>;
	const members = people.filter((person) => project.memberIds?.includes(person.id));
	async function archive() {
		setBusy(true);
		try {
			await api(`/projects/${id}`, { method: "PATCH", body: { archived: !project.archived } });
			onChanged();
			setArchiving(false);
			notify(project.archived ? "Your project is back in motion." : "Project archived. Your work is safely kept.");
		} catch (error) {
			notify(error.message, "error");
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<button className="text-button back-link" onClick={() => navigate("projects")}>
				<span>←</span>All projects
			</button>
			<div className="page-heading project-detail-heading">
				<div>
					<div className="project-kicker">
						<span style={{ background: project.color }} /> PROJECT <Badge status={project.archived ? "archived" : "active"} />
					</div>
					<h1>{project.name}</h1>
					<p>{project.description}</p>
					<div className="project-members">
						<AvatarStack users={members} />
						<span>{members.length} people bringing this to life</span>
					</div>
				</div>
				{user.role !== "reviewer" && (
					<div className="heading-actions">
						{user.role === "owner" && (
							<button className="button secondary" onClick={() => setEditing(true)}>
								Project settings
							</button>
						)}
						{!project.archived && (
							<button className="button primary" onClick={() => onCreate(id)}>
								<Icon name="plus" size={17} />
								New asset
							</button>
						)}
					</div>
				)}
			</div>
			<Assets
				user={user}
				people={people}
				projects={projects}
				projectId={id}
				navigate={navigate}
				setSearch={setSearch}
				onCreate={() => onCreate(id)}
				refreshKey={refreshKey}
				notify={notify}
			/>
			{user.role === "owner" && (
				<div className="archive-project">
					<p>
						{project.archived
							? "Ready to pick this back up?"
							: "All wrapped up here? Keep your history and clear a little space."}
					</p>
					<button className="text-button" onClick={() => setArchiving(true)}>
						{project.archived ? "Restore project" : "Archive project"}
						<Icon name="arrow" size={15} />
					</button>
				</div>
			)}
			{editing && (
				<ProjectForm
					people={people}
					user={user}
					project={project}
					onClose={() => setEditing(false)}
					onSaved={() => {
						setEditing(false);
						onChanged();
						notify("Project details updated.");
					}}
				/>
			)}
			{archiving && (
				<Modal
					title={project.archived ? "Bring this project back?" : "Wrap up this project?"}
					subtitle="Your assets, feedback, and approval history will stay right here."
					onClose={() => setArchiving(false)}
				>
					<div className="modal-footer">
						<button className="button secondary" onClick={() => setArchiving(false)}>
							Keep as is
						</button>
						<button className="button primary" disabled={busy} onClick={archive}>
							{busy ? "Saving…" : project.archived ? "Restore project" : "Archive project"}
						</button>
					</div>
				</Modal>
			)}
		</>
	);
}

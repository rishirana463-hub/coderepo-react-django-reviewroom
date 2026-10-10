import { useState } from "react";
import { api } from "../../shared/api/client";
import Modal from "../../shared/components/Modal";
import { FormField } from "../../shared/components/Primitives";
import StageEditor from "./StageEditor";

export const mediaOptions = [
	["/media/botanical.svg", "Botanica — botanical"],
	["/media/summer.svg", "Botanica — summer"],
	["/media/studio.svg", "Studio — identity"],
	["/media/editorial.svg", "Fieldnotes — editorial"],
	["/media/launch.svg", "Forma — collection"],
	["/media/social.svg", "Fieldnotes — social"],
];
export default function AssetForm({ projects, projectId, people, user, onClose, onSaved }) {
	const [fields, setFields] = useState({
		projectId: projectId || projects.find((project) => !project.archived)?.id || "",
		title: "",
		type: "copy",
		content: "",
		mediaPath: mediaOptions[0][0],
		tags: "",
		dueAt: "",
	});
	const [stages, setStages] = useState([{ name: "Creative review", reviewerIds: [], quorum: 1 }]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const change = (event) => setFields((previous) => ({ ...previous, [event.target.name]: event.target.value }));
	const members = people.filter(
		(person) => person.id !== user.id && projects.find((project) => project.id === fields.projectId)?.memberIds?.includes(person.id),
	);
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const result = await api("/assets", {
				method: "POST",
				body: {
					...fields,
					content: fields.type === "image" ? "" : fields.content,
					mediaPath: fields.type === "image" ? fields.mediaPath : "",
					tags: fields.tags
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean),
					dueAt: fields.dueAt ? `${fields.dueAt}T17:00:00Z` : null,
					stages: stages.filter((stage) => stage.reviewerIds.length),
				},
			});
			onSaved(result);
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<Modal
			title="Give your next idea a home"
			subtitle="Start with a draft. Bring the right people in when you’re ready."
			onClose={onClose}
			wide
		>
			<form onSubmit={submit}>
				<div className="modal-body">
					<div className="form-grid">
						<FormField label="Asset title">
							<input
								autoFocus
								name="title"
								value={fields.title}
								onChange={change}
								required
								maxLength={160}
								placeholder="e.g. Campaign launch email"
							/>
						</FormField>
						<FormField label="Project">
							<select
								name="projectId"
								value={fields.projectId}
								onChange={(event) => {
									change(event);
									setStages([{ name: "Creative review", reviewerIds: [], quorum: 1 }]);
								}}
								required
							>
								{projects
									.filter((project) => !project.archived)
									.map((project) => (
										<option key={project.id} value={project.id}>
											{project.name}
										</option>
									))}
							</select>
						</FormField>
					</div>
					<div className="form-grid">
						<FormField label="Asset type">
							<select name="type" value={fields.type} onChange={change}>
								<option value="copy">Copy / document</option>
								<option value="image">Visual / image</option>
							</select>
						</FormField>
						<FormField label="Review deadline">
							<input type="date" name="dueAt" value={fields.dueAt} onChange={change} />
						</FormField>
					</div>
					{fields.type === "copy" ? (
						<FormField label="Your content">
							<textarea
								name="content"
								value={fields.content}
								onChange={change}
								rows={5}
								required
								placeholder="Start the conversation with your first draft…"
								maxLength={20000}
							/>
						</FormField>
					) : (
						<FormField label="Choose a visual from your library">
							<div className="media-picker">
								{mediaOptions.map(([path, label]) => (
									<button
										type="button"
										className={fields.mediaPath === path ? "selected" : ""}
										key={path}
										aria-pressed={fields.mediaPath === path}
										onClick={() => setFields((previous) => ({ ...previous, mediaPath: path }))}
									>
										<img src={path} alt={label} loading="lazy" />
									</button>
								))}
							</div>
						</FormField>
					)}
					<FormField label="Tags" hint="Separate tags with a comma.">
						<input name="tags" value={fields.tags} onChange={change} placeholder="Campaign, launch, email" maxLength={200} />
					</FormField>
					<StageEditor stages={stages} setStages={setStages} people={members} />
					{error && (
						<p className="form-error" role="alert">
							{error}
						</p>
					)}
				</div>
				<div className="modal-footer">
					<button type="button" className="button secondary" onClick={onClose}>
						Cancel
					</button>
					<button className="button primary" disabled={busy || !fields.projectId}>
						{busy ? "Creating…" : "Create draft"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

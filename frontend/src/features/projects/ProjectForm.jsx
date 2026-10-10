import { useState } from "react";
import { api } from "../../shared/api/client";
import Modal from "../../shared/components/Modal";
import { FormField } from "../../shared/components/Primitives";

const colors = ["#8b9b77", "#9c83ac", "#c69d70", "#7296a1", "#b67d82"];
export default function ProjectForm({ people, user, project, onClose, onSaved }) {
	const [name, setName] = useState(project?.name || "");
	const [description, setDescription] = useState(project?.description || "");
	const [color, setColor] = useState(project?.color || colors[0]);
	const [memberIds, setMembers] = useState(project?.memberIds || people.map((person) => person.id));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const result = await api(project ? `/projects/${project.id}` : "/projects", {
				method: project ? "PATCH" : "POST",
				body: { name, description, color, memberIds: [...new Set([...memberIds, user.id])] },
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
			title={project ? "Make a little adjustment" : "Make room for something good"}
			subtitle={project ? "Keep your project details up to date." : "A shared space for the work and the people behind it."}
			onClose={onClose}
		>
			<form onSubmit={submit}>
				<div className="modal-body">
					<FormField label="Project name">
						<input
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="e.g. Summer campaign"
							maxLength={100}
							required
						/>
					</FormField>
					<FormField label="A little context">
						<textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="What are we making together?"
							maxLength={1000}
							rows={3}
						/>
					</FormField>
					<fieldset className="form-field">
						<legend>Project color</legend>
						<div className="color-options">
							{colors.map((value) => (
								<button
									key={value}
									type="button"
									className={color === value ? "selected" : ""}
									style={{ background: value }}
									aria-label={`Choose ${value}`}
									aria-pressed={color === value}
									onClick={() => setColor(value)}
								/>
							))}
						</div>
					</fieldset>
					<fieldset className="form-field">
						<legend>People in this room</legend>
						<div className="member-options">
							{people.map((person) => (
								<label key={person.id}>
									<input
										type="checkbox"
										checked={memberIds.includes(person.id)}
										disabled={person.id === user.id}
										onChange={(event) =>
											setMembers((previous) =>
												event.target.checked ? [...previous, person.id] : previous.filter((id) => id !== person.id),
											)
										}
									/>
									<span>
										{person.name}
										<small>{person.role}</small>
									</span>
								</label>
							))}
						</div>
					</fieldset>
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
					<button className="button primary" disabled={busy}>
						{busy ? "Saving…" : project ? "Save changes" : "Create project"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

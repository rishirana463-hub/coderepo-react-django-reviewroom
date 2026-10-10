import { useState } from "react";
import Modal from "../../shared/components/Modal";
import { FormField } from "../../shared/components/Primitives";
import { localDateInput } from "../../shared/utils/format";
import StageEditor from "./StageEditor";

export default function AssetSettings({ asset, people, mutate, onClose }) {
	const [dueAt, setDueAt] = useState(localDateInput(asset.dueAt));
	const [stages, setStages] = useState(asset.stages || []);
	const [tags, setTags] = useState((asset.tags || []).join(", "));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await mutate("", "PATCH", {
				revision: asset.revision,
				dueAt: dueAt ? `${dueAt}T17:00:00Z` : null,
				...(asset.status === "draft" ? { stages } : {}),
				tags: tags
					.split(",")
					.map((tag) => tag.trim())
					.filter(Boolean),
			});
			onClose();
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<Modal
			title="The right people. A clear next step."
			subtitle="Set up your review stages and give everyone a little clarity."
			onClose={onClose}
			wide
		>
			<form onSubmit={submit}>
				<div className="modal-body">
					<div className="form-grid">
						<FormField label="Review deadline">
							<input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
						</FormField>
						<FormField label="Tags">
							<input
								value={tags}
								onChange={(event) => setTags(event.target.value)}
								maxLength={200}
								placeholder="Separated by commas"
							/>
						</FormField>
					</div>
					{asset.status === "draft" ? (
						<StageEditor
							stages={stages}
							setStages={setStages}
							people={people.filter((person) => person.id !== asset.owner?.id)}
						/>
					) : (
						<div className="locked-stages">
							<strong>Review stages</strong>
							{stages.map((stage, index) => (
								<p key={index}>
									{index + 1}. {stage.name} · {stage.quorum} approval{stage.quorum === 1 ? "" : "s"} required
								</p>
							))}
						</div>
					)}
					{error && (
						<p className="form-error" role="alert">
							{error}
						</p>
					)}
					<p className="form-hint">
						Review stages can change while the asset is a draft. Once submitted, create a new version to change the workflow.
					</p>
				</div>
				<div className="modal-footer">
					<button className="button secondary" type="button" onClick={onClose}>
						Cancel
					</button>
					<button className="button primary" disabled={busy}>
						{busy ? "Saving…" : "Save review settings"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

import { useState } from "react";
import Modal from "../../shared/components/Modal";
import { FormField } from "../../shared/components/Primitives";
import { mediaOptions } from "./AssetForm";

export default function VersionForm({ asset, mutate, onClose }) {
	const [content, setContent] = useState(asset.content || "");
	const [title, setTitle] = useState(asset.title);
	const [mediaPath, setMediaPath] = useState(asset.mediaPath || mediaOptions[0][0]);
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await mutate("/versions", "POST", {
				revision: asset.revision,
				title,
				content,
				mediaPath: asset.type === "image" ? mediaPath : "",
				note,
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
			title={`A fresh take. Version ${asset.version + 1}.`}
			subtitle="Feedback and decisions stay with their original version. The new draft starts with a clean review."
			onClose={onClose}
			wide
		>
			<form onSubmit={submit}>
				<div className="modal-body">
					<FormField label="Asset title">
						<input value={title} required maxLength={160} onChange={(event) => setTitle(event.target.value)} />
					</FormField>
					{asset.type === "image" ? (
						<FormField label="Choose the revised visual">
							<div className="media-picker">
								{mediaOptions.map(([path, label]) => (
									<button
										type="button"
										key={path}
										className={mediaPath === path ? "selected" : ""}
										aria-pressed={mediaPath === path}
										onClick={() => setMediaPath(path)}
									>
										<img src={path} alt={label} loading="lazy" />
									</button>
								))}
							</div>
						</FormField>
					) : (
						<FormField label="Revised content">
							<textarea
								value={content}
								onChange={(event) => setContent(event.target.value)}
								required
								rows={10}
								maxLength={20000}
							/>
						</FormField>
					)}
					<FormField label="What changed?">
						<textarea
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={2}
							placeholder="A little context for your reviewers…"
							maxLength={2000}
						/>
					</FormField>
					{error && (
						<p className="form-error" role="alert">
							{error}
						</p>
					)}
				</div>
				<div className="modal-footer">
					<button className="button secondary" type="button" onClick={onClose}>
						Cancel
					</button>
					<button className="button primary" disabled={busy}>
						{busy ? "Saving…" : "Create new version"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

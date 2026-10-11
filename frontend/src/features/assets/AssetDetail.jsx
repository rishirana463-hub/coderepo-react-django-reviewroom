import { useEffect, useState } from "react";
import { api, download } from "../../shared/api/client";
import useResource from "../../shared/api/useResource";
import Icon from "../../shared/components/Icon";
import Modal from "../../shared/components/Modal";
import { Avatar, AvatarStack, Badge, EmptyState, ErrorState, FormField, LoadingState } from "../../shared/components/Primitives";
import { dateLabel, relativeTime, titleCase } from "../../shared/utils/format";
import AssetPreview from "./AssetPreview";
import AssetSettings from "./AssetSettings";
import VersionForm from "./VersionForm";
import Threads from "./Threads";

export default function AssetDetail({ id, user, people, projects, navigate, onChanged, notify }) {
	const resource = useResource(`/assets/${id}`);
	const [version, setVersion] = useState(null);
	const [tab, setTab] = useState("feedback");
	const [anchor, setAnchor] = useState(null);
	const [modal, setModal] = useState("");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		if (resource.data) setVersion(resource.data.version);
	}, [resource.data?.version]);
	useEffect(() => {
		setAnchor(null);
		setError("");
	}, [version, id]);
	async function mutate(path, method, body) {
		try {
			const result = await api(`/assets/${id}${path}`, { method, body });
			resource.setData(result);
			onChanged();
			return result;
		} catch (failure) {
			if (failure.status === 409) {
				resource.refresh();
				notify("This asset changed while you were working. The latest version is loading.", "error");
			}
			throw failure;
		}
	}
	async function submitReview() {
		setBusy(true);
		setError("");
		try {
			await mutate("/submit", "POST", { revision: resource.data.revision });
			notify("Your draft is on its way to the review room.");
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	async function decision(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await mutate("/decisions", "POST", {
				revision: resource.data.revision,
				version: resource.data.version,
				decision: modal === "approve" ? "approve" : "changes_requested",
				note,
			});
			setModal("");
			setNote("");
			notify(
				modal === "approve"
					? "Your approval is recorded. Good work moves forward."
					: "Your change request is recorded. A clearer next draft is on its way.",
			);
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	async function exportAsset() {
		try {
			await download(`/assets/${id}/export`, `reviewroom-approved-${id}.json`);
			notify("The approved manifest is ready to share.");
		} catch (failure) {
			notify(failure.message, "error");
		}
	}
	if (resource.loading && !resource.data) return <LoadingState label="Bringing the details into focus…" />;
	if (resource.error) return <ErrorState error={resource.error} retry={resource.refresh} />;
	const asset = resource.data;
	if (!asset) return <EmptyState title="This asset isn’t available." />;
	const selected = asset.versions?.find((item) => item.number === version);
	const current = version === asset.version;
	const stage = asset.stages?.[asset.currentStage || 0];
	const reviewers = people.filter((person) => stage?.reviewerIds?.includes(person.id));
	const members = people.filter((person) => projects.find((project) => project.id === asset.projectId)?.memberIds?.includes(person.id));
	const canEdit = asset.canEdit ?? user.role !== "reviewer";
	return (
		<>
			<button className="text-button back-link" onClick={() => navigate(`project/${asset.projectId}`)}>
				<span>←</span>
				{asset.projectName}
			</button>
			<div className="asset-detail-heading">
				<div>
					<div className="asset-kicker">
						<Icon name={asset.type === "image" ? "image" : "file"} size={15} />
						{asset.type === "image" ? "VISUAL ASSET" : "COPY DOCUMENT"}
						<span>·</span>VERSION {asset.version}
					</div>
					<h1>{asset.title}</h1>
					<div className="asset-meta">
						<Badge status={asset.status} />
						<span>
							<Avatar user={asset.owner} size="tiny" color="peach" />
							{asset.owner?.name}
						</span>
						<span>
							<Icon name="clock" size={14} />
							Due {dateLabel(asset.dueAt)}
						</span>
					</div>
				</div>
				<div className="asset-heading-actions">
					{canEdit && (
						<button className="button secondary" onClick={() => setModal("settings")}>
							<Icon name="people" size={16} />
							Review settings
						</button>
					)}
					{canEdit && (
						<button className="button secondary" onClick={() => setModal("version")}>
							<Icon name="plus" size={16} />
							New version
						</button>
					)}
					{asset.status === "approved" && (
						<button className="button primary" onClick={exportAsset}>
							<Icon name="download" size={16} />
							Export approved
						</button>
					)}
					{canEdit && asset.status === "draft" && (
						<button className="button primary" disabled={busy} onClick={submitReview}>
							<Icon name="arrow" size={16} />
							{busy ? "Submitting…" : "Send for review"}
						</button>
					)}
				</div>
			</div>
			{error && !modal && (
				<p className="form-error" role="alert">
					{error}
				</p>
			)}
			<div className="asset-workflow-bar">
				<div>
					<span className="workflow-symbol">
						<Icon name="review" size={18} />
					</span>
					<div>
						<strong>
							{asset.status === "approved"
								? "A good thing, approved."
								: asset.status === "changes_requested"
									? "A little refinement goes a long way."
									: asset.status === "draft"
										? "Good ideas start somewhere."
										: `${stage?.name || "Review"} is in progress`}
						</strong>
						<span>
							{asset.status === "approved"
								? "Every required stage is complete for this exact version."
								: asset.status === "changes_requested"
									? "Review the feedback, then create a new version."
									: asset.status === "draft"
										? "Check your review stages, then send this draft for feedback."
										: `${stage?.quorum || 1} approval${stage?.quorum === 1 ? "" : "s"} needed · stage ${(asset.currentStage || 0) + 1} of ${asset.stages?.length || 1}`}
						</span>
					</div>
				</div>
				<AvatarStack users={reviewers} />
				{asset.canDecide && current && (
					<div className="decision-buttons">
						<button
							className="button secondary small"
							onClick={() => {
								setModal("changes");
								setError("");
							}}
						>
							Request changes
						</button>
						<button
							className="button approved-button small"
							onClick={() => {
								setModal("approve");
								setError("");
							}}
						>
							<Icon name="check" size={15} />
							Approve
						</button>
					</div>
				)}
			</div>
			<div className="asset-review-layout">
				<div className="asset-preview-column">
					<div className="version-toolbar">
						<label>
							VERSION{" "}
							<select
								aria-label="Select asset version"
								value={version || asset.version}
								onChange={(event) => setVersion(Number(event.target.value))}
							>
								{asset.versions
									?.slice()
									.reverse()
									.map((item) => (
										<option value={item.number} key={item.number}>
											v{item.number}
											{item.number === asset.version ? " — Latest" : ""}
										</option>
									))}
							</select>
						</label>
						{!current && (
							<button className="text-button" onClick={() => setVersion(asset.version)}>
								Back to latest
								<Icon name="arrow" size={15} />
							</button>
						)}
						<span className="muted">{asset.tags?.join(" / ")}</span>
					</div>
					<AssetPreview
						asset={asset}
						version={selected}
						anchor={anchor}
						onAnchor={(value) => {
							setAnchor(value);
							setTab("feedback");
						}}
						current={current && !projects.find((project) => project.id === asset.projectId)?.archived}
					/>
					<div className="asset-stage-summary">
						<h3>The path to approved</h3>
						<div>
							{asset.stages?.map((item, index) => (
								<span
									key={index}
									className={`stage-chip ${asset.status === "approved" || index < asset.currentStage ? "complete" : index === asset.currentStage && asset.status === "in_review" ? "active" : ""}`}
								>
									<span>
										{asset.status === "approved" || index < asset.currentStage ? (
											<Icon name="check" size={12} />
										) : (
											index + 1
										)}
									</span>
									{item.name}
									<small>{item.quorum} required</small>
								</span>
							))}
						</div>
					</div>
				</div>
				<aside className="feedback-panel" aria-label="Feedback and version history">
					<div className="tabs feedback-tabs">
						<button
							className={tab === "feedback" ? "active" : ""}
							aria-pressed={tab === "feedback"}
							onClick={() => setTab("feedback")}
						>
							Feedback <span>{asset.comments?.filter((item) => item.version === version).length || 0}</span>
						</button>
						<button
							className={tab === "history" ? "active" : ""}
							aria-pressed={tab === "history"}
							onClick={() => setTab("history")}
						>
							History
						</button>
					</div>
					{tab === "feedback" ? (
						<Threads
							key={`${id}-${version}`}
							asset={asset}
							version={version || asset.version}
							anchor={anchor}
							setAnchor={setAnchor}
							mutate={mutate}
							user={user}
							writable={!projects.find((project) => project.id === asset.projectId)?.archived}
						/>
					) : (
						<div className="asset-history">
							<p>Every step, kept in context.</p>
							{asset.versions
								?.slice()
								.reverse()
								.map((item) => (
									<button
										className={`version-history-item ${version === item.number ? "active" : ""}`}
										key={item.number}
										onClick={() => {
											setVersion(item.number);
										}}
									>
										<span className="version-number">v{item.number}</span>
										<span>
											<strong>{item.number === asset.version ? "Latest version" : `Version ${item.number}`}</strong>
											<small>
												{item.author?.name} · {relativeTime(item.createdAt)}
											</small>
											{item.note && <p>{item.note}</p>}
										</span>
										<Icon name="chevron" size={16} />
									</button>
								))}
							<h4>Review decisions</h4>
							{asset.decisions
								?.slice()
								.reverse()
								.map((item, index) => (
									<div className="decision-history" key={index}>
										<span className={item.decision === "approve" ? "green" : "amber"}>
											<Icon name={item.decision === "approve" ? "check" : "message"} size={15} />
										</span>
										<div>
											<strong>{people.find((person) => person.id === item.reviewerId)?.name || "Reviewer"}</strong>
											<p>
												{titleCase(item.decision)} · v{item.version} / Stage {item.stageIndex + 1}
											</p>
											{item.note && <small>{item.note}</small>}
										</div>
									</div>
								))}
							{!asset.decisions?.length && <p className="muted">This story is still being written.</p>}
						</div>
					)}
				</aside>
			</div>
			{modal === "version" && <VersionForm asset={asset} mutate={mutate} onClose={() => setModal("")} />}
			{modal === "settings" && <AssetSettings asset={asset} people={members} mutate={mutate} onClose={() => setModal("")} />}
			{["approve", "changes"].includes(modal) && (
				<Modal
					title={modal === "approve" ? "Ready to give it your yes?" : "Make the next draft a little clearer"}
					subtitle={`Your decision applies to version ${asset.version}.`}
					onClose={() => setModal("")}
				>
					<form onSubmit={decision}>
						<div className="modal-body">
							<FormField label={modal === "approve" ? "A note for the team (optional)" : "What needs a little more work?"}>
								<textarea
									autoFocus
									rows={4}
									value={note}
									onChange={(event) => setNote(event.target.value)}
									maxLength={2000}
									required={modal === "changes"}
									placeholder={
										modal === "approve"
											? "Looking good. Ready for the next step…"
											: "Be specific. A clear request makes a better revision…"
									}
								/>
							</FormField>
							{error && (
								<p className="form-error" role="alert">
									{error}
								</p>
							)}
						</div>
						<div className="modal-footer">
							<button className="button secondary" type="button" onClick={() => setModal("")}>
								Cancel
							</button>
							<button className={`button ${modal === "approve" ? "approved-button" : "primary"}`} disabled={busy}>
								{busy ? "Recording…" : modal === "approve" ? "Approve this version" : "Request changes"}
							</button>
						</div>
					</form>
				</Modal>
			)}
		</>
	);
}

import { useState } from "react";
import Icon from "../../shared/components/Icon";
import { Avatar, EmptyState } from "../../shared/components/Primitives";
import { relativeTime } from "../../shared/utils/format";

function Thread({ thread, mutate, canResolve, current }) {
	const [reply, setReply] = useState("");
	const [replying, setReplying] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function send(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await mutate(`/comments/${thread.id}/replies`, "POST", { body: reply });
			setReply("");
			setReplying(false);
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	async function resolve() {
		setBusy(true);
		setError("");
		try {
			await mutate(`/comments/${thread.id}`, "PATCH", { resolved: !thread.resolved });
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<article className={`thread ${thread.resolved ? "resolved" : ""}`}>
			<div className="thread-header">
				<Avatar user={thread.author} size="small" color="lavender" />
				<div>
					<strong>{thread.author?.name}</strong>
					<small>{relativeTime(thread.createdAt)}</small>
				</div>
				{canResolve && current && (
					<button
						className={`icon-button ${thread.resolved ? "is-resolved" : ""}`}
						aria-label={thread.resolved ? "Reopen feedback" : "Resolve feedback"}
						title={thread.resolved ? "Reopen feedback" : "Resolve feedback"}
						onClick={resolve}
						disabled={busy}
					>
						<Icon name="check" size={16} />
					</button>
				)}
			</div>
			{["image", "text"].includes(thread.anchor?.type) && (
				<div className="thread-anchor">
					<Icon name={thread.anchor.type === "image" ? "image" : "file"} size={13} />
					{thread.anchor.type === "image"
						? `Image pin · ${Math.round(thread.anchor.x * 100)}%, ${Math.round(thread.anchor.y * 100)}%`
						: `Selected text · characters ${thread.anchor.start}–${thread.anchor.end}`}
				</div>
			)}
			<p className="thread-body">{thread.body}</p>
			{thread.resolved && (
				<span className="resolved-label">
					<Icon name="check" size={12} />
					Resolved
				</span>
			)}
			{thread.replies?.map((replyItem) => (
				<div className="thread-reply" key={replyItem.id}>
					<Avatar user={replyItem.author} size="tiny" color="peach" />
					<div>
						<strong>{replyItem.author?.name}</strong>
						<p>{replyItem.body}</p>
						<small>{relativeTime(replyItem.createdAt)}</small>
					</div>
				</div>
			))}
			{!replying && current && (
				<button className="text-button thread-reply-button" onClick={() => setReplying(true)}>
					Reply to thread
				</button>
			)}
			{replying && (
				<form className="thread-reply-form" onSubmit={send}>
					<label className="sr-only" htmlFor={`reply-${thread.id}`}>
						Your reply
					</label>
					<textarea
						id={`reply-${thread.id}`}
						value={reply}
						autoFocus
						required
						maxLength={4000}
						onChange={(event) => setReply(event.target.value)}
						rows={2}
						placeholder="Add your thoughts…"
					/>
					<div>
						<button className="text-button" type="button" onClick={() => setReplying(false)}>
							Cancel
						</button>
						<button className="button primary small" disabled={busy}>
							{busy ? "Sending…" : "Reply"}
						</button>
					</div>
				</form>
			)}
			{error && (
				<p className="form-error" role="alert">
					{error}
				</p>
			)}
		</article>
	);
}
export default function Threads({ asset, version, anchor, setAnchor, mutate, user, writable = true }) {
	const [body, setBody] = useState("");
	const [filter, setFilter] = useState("open");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const current = version === asset.version && writable;
	const comments = (asset.comments || []).filter((thread) => thread.version === version);
	const visible = comments.filter((thread) => filter === "all" || !thread.resolved);
	async function comment(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const { label: _label, ...coordinates } = anchor || {};
			await mutate("/comments", "POST", { version, body, ...(anchor ? { anchor: coordinates } : {}) });
			setBody("");
			setAnchor(null);
		} catch (failure) {
			setError(failure.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<div className="feedback-filter">
				<span>{comments.filter((thread) => !thread.resolved).length} open threads</span>
				<select aria-label="Filter feedback threads" value={filter} onChange={(event) => setFilter(event.target.value)}>
					<option value="open">Open</option>
					<option value="all">All feedback</option>
				</select>
			</div>
			<div className="thread-list">
				{visible.map((thread) => (
					<Thread
						key={thread.id}
						thread={thread}
						mutate={mutate}
						canResolve={asset.canEdit || user.role === "owner" || thread.author?.id === user.id}
						current={current}
					/>
				))}
				{!visible.length && (
					<EmptyState title={filter === "open" ? "A little space for feedback." : "No feedback on this version."}>
						{current
							? "Share a thought below, or select part of the work to be more specific."
							: "Feedback stays connected to the version it was left on."}
					</EmptyState>
				)}
			</div>
			{current ? (
				<form className="comment-composer" onSubmit={comment}>
					{anchor && (
						<div className="selected-anchor">
							<Icon name="link" size={14} />
							<span>{anchor.label || "Anchored feedback"}</span>
							<button
								className="icon-button"
								aria-label="Remove feedback anchor"
								type="button"
								onClick={() => setAnchor(null)}
							>
								<Icon name="close" size={13} />
							</button>
						</div>
					)}
					<div className="composer-top">
						<Avatar user={user} size="small" color="peach" />
						<label className="sr-only" htmlFor="new-comment">
							Add feedback
						</label>
						<textarea
							id="new-comment"
							value={body}
							onChange={(event) => setBody(event.target.value)}
							required
							rows={3}
							placeholder="A thought, a question, a little clarity…"
							maxLength={4000}
						/>
					</div>
					{error && (
						<p className="form-error" role="alert">
							{error}
						</p>
					)}
					<div className="composer-bottom">
						<small>Keep it thoughtful.</small>
						<button className="button primary small" disabled={busy || !body.trim()}>
							{busy ? "Posting…" : "Post feedback"}
							<Icon name="arrow" size={14} />
						</button>
					</div>
				</form>
			) : (
				<p className="past-version-note">
					<Icon name="clock" size={15} />
					{writable
						? "You’re viewing feedback on a previous version. Switch to the latest version to add a comment."
						: "This project is archived. Feedback is kept here for reference."}
				</p>
			)}
		</>
	);
}

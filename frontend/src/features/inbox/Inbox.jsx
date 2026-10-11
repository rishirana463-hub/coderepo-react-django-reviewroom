import { useState } from "react";
import { api } from "../../shared/api/client";
import Icon from "../../shared/components/Icon";
import { EmptyState } from "../../shared/components/Primitives";
import { relativeTime } from "../../shared/utils/format";

export default function Inbox({ items = [], navigate, onChanged, notify, user }) {
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [busy, setBusy] = useState(false);
	const visible = items.filter((item) => !unreadOnly || !item.read);
	async function markRead(item) {
		if (item.read) return;
		try {
			await api(`/inbox/${item.id}`, { method: "PATCH", body: { read: true } });
			onChanged();
		} catch (error) {
			notify(error.message, "error");
		}
	}
	async function reminders() {
		setBusy(true);
		try {
			const result = await api("/reminders/process", { method: "POST" });
			onChanged();
			notify(`${result?.created || 0} review reminders prepared.`);
		} catch (error) {
			notify(error.message, "error");
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<div className="page-heading">
				<div>
					<p className="eyebrow">KEEP A LITTLE ROOM IN THE LOOP</p>
					<h1>
						A note for you<span className="heading-star">✳</span>
					</h1>
					<p>Reviews, replies, and the next small thing that needs your attention.</p>
				</div>
				{user.role === "owner" && (
					<button className="button secondary" disabled={busy} onClick={reminders}>
						<Icon name="bell" size={17} />
						{busy ? "Preparing…" : "Process reminders"}
					</button>
				)}
			</div>
			<div className="tabs inbox-tabs">
				<button className={!unreadOnly ? "active" : ""} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
					All updates <span>{items.length}</span>
				</button>
				<button className={unreadOnly ? "active" : ""} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
					Unread <span>{items.filter((item) => !item.read).length}</span>
				</button>
			</div>
			<section className="panel inbox-panel">
				{visible.map((item) => (
					<article className={`inbox-item ${item.read ? "" : "unread"}`} key={item.id}>
						<span className="inbox-symbol">
							<Icon name={item.title.toLowerCase().includes("approv") ? "check" : "message"} size={20} />
						</span>
						<div>
							<button
								className="inbox-title"
								onClick={() => {
									markRead(item);
									if (item.assetId) navigate(`asset/${item.assetId}`);
								}}
							>
								{item.title}
							</button>
							<p>{item.body}</p>
							<small>{relativeTime(item.createdAt)}</small>
						</div>
						{!item.read && (
							<button className="icon-button" aria-label={`Mark ${item.title} as read`} onClick={() => markRead(item)}>
								<Icon name="check" size={17} />
							</button>
						)}
					</article>
				))}
				{!visible.length && (
					<EmptyState title="You’re all caught up.">A little quiet is a good thing. We’ll keep you in the loop.</EmptyState>
				)}
			</section>
		</>
	);
}

import Icon from "../../shared/components/Icon";
import { Avatar, Badge, EmptyState } from "../../shared/components/Primitives";
import { dateLabel } from "../../shared/utils/format";

export default function AssetTable({ assets = [], onOpen, people = [], compact = false }) {
	if (!assets.length)
		return (
			<EmptyState title="A clear desk. A fresh start.">
				No assets match this view. Try another filter or create your first asset.
			</EmptyState>
		);
	return (
		<div className="asset-table-wrap">
			<table className={`asset-table ${compact ? "compact" : ""}`}>
				<thead>
					<tr>
						<th>ASSET NAME</th>
						<th>STATUS</th>
						{!compact && <th>REVIEWERS</th>}
						<th>DUE DATE</th>
						<th aria-label="Open asset" />
					</tr>
				</thead>
				<tbody>
					{assets.map((asset) => {
						const reviewers = people.filter((person) => asset.reviewerIds?.includes(person.id));
						const overdue =
							asset.dueAt &&
							new Date(asset.dueAt).getTime() < Date.now() &&
							["in_review", "changes_requested"].includes(asset.status);
						return (
							<tr key={asset.id}>
								<td>
									<button className="asset-name-button" onClick={() => onOpen(asset.id)}>
										<span className={`asset-thumb ${asset.type === "copy" ? "copy-thumb" : ""}`}>
											{asset.thumbnail ? (
												<img src={asset.thumbnail} alt="" loading="lazy" />
											) : (
												<Icon name={asset.type === "image" ? "image" : "file"} size={22} />
											)}
										</span>
										<span>
											<strong>{asset.title}</strong>
											<small>
												{asset.projectName} <span>·</span> v{asset.version || 1}
											</small>
										</span>
									</button>
								</td>
								<td>
									<Badge status={asset.status} />
								</td>
								{!compact && (
									<td>
										<div className="avatar-stack">
											{reviewers.slice(0, 3).map((person, index) => (
												<Avatar
													key={person.id}
													user={person}
													size="small"
													color={["peach", "lavender", "mint"][index]}
												/>
											))}
											{!reviewers.length && <span className="muted">Unassigned</span>}
										</div>
									</td>
								)}
								<td>
									<span className={`due-date ${overdue ? "overdue" : ""}`}>
										<Icon name="clock" size={14} />
										{dateLabel(asset.dueAt)}
									</span>
								</td>
								<td>
									<button className="icon-button" aria-label={`Review ${asset.title}`} onClick={() => onOpen(asset.id)}>
										<Icon name="chevron" size={17} />
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

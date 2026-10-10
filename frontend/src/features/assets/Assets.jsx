import { useEffect, useState } from "react";
import { api, download, queryString } from "../../shared/api/client";
import useResource from "../../shared/api/useResource";
import Icon from "../../shared/components/Icon";
import { ErrorState, LoadingState } from "../../shared/components/Primitives";
import Modal from "../../shared/components/Modal";
import AssetTable from "./AssetTable";

export default function Assets({
	user,
	people,
	projects,
	navigate,
	onCreate,
	search = "",
	setSearch,
	query = "",
	projectId,
	refreshKey,
	notify,
	reviews = false,
}) {
	const [filters, setFilters] = useState(() => ({
		status: new URLSearchParams(query).get("status") || "",
		overdue: new URLSearchParams(query).get("overdue") || "",
		projectId: projectId || "",
		sort: "updated",
	}));
	const [page, setPage] = useState(1);
	const [saveOpen, setSaveOpen] = useState(false);
	const [viewName, setViewName] = useState("");
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	useEffect(() => {
		setFilters((previous) => ({
			...previous,
			status: new URLSearchParams(query).get("status") || "",
			overdue: new URLSearchParams(query).get("overdue") || "",
			projectId: projectId || "",
		}));
		setPage(1);
	}, [query, projectId]);
	useEffect(() => setPage(1), [search]);
	const activeFilters = { ...filters, q: search, ...(reviews ? { assigneeId: user.id } : {}), page, pageSize: 12 };
	const resource = useResource(`/assets?${queryString(activeFilters)}`, null, refreshKey);
	const savedViews = useResource("/saved-views", [], refreshKey);
	const update = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};
	async function saveView(event) {
		event.preventDefault();
		setSaving(true);
		setSaveError("");
		try {
			await api("/saved-views", {
				method: "POST",
				body: { name: viewName, filters: { ...filters, q: search, ...(reviews ? { assigneeId: user.id } : {}) } },
			});
			savedViews.refresh();
			setSaveOpen(false);
			setViewName("");
			notify("Your view is saved. One less thing to find.");
		} catch (error) {
			setSaveError(error.message);
		} finally {
			setSaving(false);
		}
	}
	async function exportCsv() {
		try {
			await download(`/reports/export.csv?${queryString(activeFilters)}`, "reviewroom-assets.csv");
			notify("Your asset report is ready.");
		} catch (error) {
			notify(error.message, "error");
		}
	}
	return (
		<>
			{!projectId && (
				<div className="page-heading">
					<div>
						<p className="eyebrow">{reviews ? "A FRESH PAIR OF EYES" : "EVERY PIECE OF THE BIGGER PICTURE"}</p>
						<h1>
							{reviews ? "Your feedback makes a difference" : "All your good work, together"}
							<span className="heading-star">✳</span>
						</h1>
						<p>
							{reviews
								? "The work waiting for your thoughtful review."
								: "From first draft to final approval. Nothing lost along the way."}
						</p>
					</div>
					{user.role !== "reviewer" && (
						<button className="button primary" onClick={onCreate}>
							<Icon name="plus" size={18} />
							New asset
						</button>
					)}
				</div>
			)}
			<div className="asset-filters">
				<div className="filter-group">
					<label>
						<span className="sr-only">Status</span>
						<select value={filters.status} onChange={(event) => update("status", event.target.value)}>
							<option value="">All statuses</option>
							<option value="draft">Draft</option>
							<option value="in_review">In review</option>
							<option value="changes_requested">Changes requested</option>
							<option value="approved">Approved</option>
						</select>
					</label>
					{!projectId && (
						<label>
							<span className="sr-only">Project</span>
							<select value={filters.projectId} onChange={(event) => update("projectId", event.target.value)}>
								<option value="">All projects</option>
								{projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.name}
									</option>
								))}
							</select>
						</label>
					)}
					<button
						className={`button filter-button ${filters.overdue ? "selected" : ""}`}
						aria-pressed={Boolean(filters.overdue)}
						onClick={() => update("overdue", filters.overdue ? "" : "true")}
					>
						<Icon name="clock" size={15} />
						Overdue
					</button>
				</div>
				<div className="filter-group">
					<label>
						<span className="sr-only">Sort assets</span>
						<select value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
							<option value="updated">Recently updated</option>
							<option value="due">Due date</option>
							<option value="title">Asset name</option>
						</select>
					</label>
					<button className="icon-button bordered" aria-label="Save current filters as a view" onClick={() => setSaveOpen(true)}>
						<Icon name="filter" size={18} />
					</button>
					<button className="icon-button bordered" aria-label="Export filtered assets as CSV" onClick={exportCsv}>
						<Icon name="download" size={18} />
					</button>
				</div>
			</div>
			{savedViews.data?.length > 0 && (
				<div className="saved-views">
					<span>YOUR VIEWS</span>
					{savedViews.data.map((view) => (
						<span className="saved-view" key={view.id}>
							<button
								onClick={() => {
									setFilters({
										status: "",
										overdue: "",
										sort: "updated",
										...view.filters,
										projectId: projectId || view.filters.projectId || "",
									});
									setSearch?.(view.filters.q || "");
									setPage(1);
								}}
							>
								{view.name}
							</button>
							<button
								aria-label={`Delete saved view ${view.name}`}
								onClick={async () => {
									try {
										await api(`/saved-views/${view.id}`, { method: "DELETE" });
										savedViews.refresh();
									} catch (error) {
										notify(error.message, "error");
									}
								}}
							>
								<Icon name="close" size={12} />
							</button>
						</span>
					))}
				</div>
			)}
			<section className="panel assets-panel">
				{resource.loading ? (
					<LoadingState label="Finding your good work…" />
				) : resource.error ? (
					<ErrorState error={resource.error} retry={resource.refresh} />
				) : (
					<>
						<AssetTable assets={resource.data?.items} people={people} onOpen={(id) => navigate(`asset/${id}`)} />
						<div className="table-pagination">
							<span>
								{resource.data?.total || 0} assets{" "}
								<span className="muted">
									· Page {page} of {Math.max(1, Math.ceil((resource.data?.total || 0) / 12))}
								</span>
							</span>
							<div>
								<button
									className="button secondary small"
									disabled={page <= 1}
									onClick={() => setPage((value) => value - 1)}
								>
									Previous
								</button>
								<button
									className="button secondary small"
									disabled={page * 12 >= (resource.data?.total || 0)}
									onClick={() => setPage((value) => value + 1)}
								>
									Next
								</button>
							</div>
						</div>
					</>
				)}
			</section>
			{saveOpen && (
				<Modal
					title="Keep this view handy"
					subtitle="Save these filters for the next time you need them."
					onClose={() => setSaveOpen(false)}
				>
					<form onSubmit={saveView}>
						<div className="modal-body">
							<label className="form-field">
								<span>View name</span>
								<input
									autoFocus
									value={viewName}
									required
									maxLength={80}
									onChange={(event) => setViewName(event.target.value)}
									placeholder="e.g. This week’s reviews"
								/>
							</label>
							{saveError && (
								<p className="form-error" role="alert">
									{saveError}
								</p>
							)}
						</div>
						<div className="modal-footer">
							<button className="button secondary" type="button" onClick={() => setSaveOpen(false)}>
								Cancel
							</button>
							<button className="button primary" disabled={saving}>
								{saving ? "Saving…" : "Save view"}
							</button>
						</div>
					</form>
				</Modal>
			)}
		</>
	);
}

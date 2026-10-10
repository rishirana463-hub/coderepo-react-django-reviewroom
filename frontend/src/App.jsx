import { useCallback, useEffect, useState } from "react";
import { api, setToken, setUnauthorizedHandler } from "./shared/api/client";
import useResource from "./shared/api/useResource";
import Shell from "./shared/components/Shell";
import Icon from "./shared/components/Icon";
import { ErrorState, LoadingState } from "./shared/components/Primitives";
import Guide from "./shared/components/Guide";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import Projects from "./features/projects/Projects";
import ProjectDetail from "./features/projects/ProjectDetail";
import ProjectForm from "./features/projects/ProjectForm";
import Assets from "./features/assets/Assets";
import AssetDetail from "./features/assets/AssetDetail";
import AssetForm from "./features/assets/AssetForm";
import Inbox from "./features/inbox/Inbox";
import Reports from "./features/reports/Reports";

function readRoute() {
	return window.location.hash.slice(1) || "overview";
}
export default function App() {
	const [user, setUser] = useState(null);
	const [booting, setBooting] = useState(true);
	const [route, setRoute] = useState(readRoute);
	const [search, setSearch] = useState("");
	const [refreshKey, setRefreshKey] = useState(0);
	const [modal, setModal] = useState(null);
	const [toast, setToast] = useState(null);
	const [routePath, query = ""] = route.split("?");
	const [page, id] = routePath.split("/");
	const projects = useResource(user ? "/projects" : null, null, refreshKey);
	const people = useResource(user ? "/people" : null, null, refreshKey);
	const inbox = useResource(user ? "/inbox" : null, [], refreshKey);
	const changed = useCallback(() => setRefreshKey((value) => value + 1), []);
	const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
	const navigate = useCallback((path) => {
		window.location.hash = path;
		setRoute(path);
		window.scrollTo({ top: 0, behavior: "instant" });
	}, []);
	useEffect(() => {
		const handleRoute = () => setRoute(readRoute());
		window.addEventListener("hashchange", handleRoute);
		setUnauthorizedHandler(() => {
			setUser(null);
			setModal(null);
		});
		const controller = new AbortController();
		api("/auth/me", { signal: controller.signal })
			.then(setUser)
			.catch((error) => {
				if (error.name !== "AbortError" && error.status !== 401)
					notify("The workspace could not connect. Sign in to try again.", "error");
			})
			.finally(() => {
				if (!controller.signal.aborted) setBooting(false);
			});
		return () => {
			controller.abort();
			window.removeEventListener("hashchange", handleRoute);
		};
	}, [notify]);
	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 5500);
		return () => clearTimeout(timer);
	}, [toast]);
	useEffect(() => {
		document.title = `${{ overview: "Overview", projects: "Projects", assets: "All assets", reviews: "My reviews", reports: "Reports", inbox: "Inbox", asset: "Asset review", project: "Project", help: "Workspace guide" }[page] || "Workspace"} · Reviewroom`;
	}, [page]);
	async function logout() {
		try {
			await api("/auth/logout", { method: "POST" });
		} catch {
			/* Clear the browser session even when the server is unavailable. */
		} finally {
			setToken("");
			setUser(null);
			setModal(null);
			setSearch("");
			navigate("overview");
		}
	}
	const createAsset = (projectId) => {
		if (!projects.data?.some((project) => !project.archived)) {
			notify("Create an active project first. Every good idea needs a home.");
			setModal({ type: "project" });
		} else setModal({ type: "asset", projectId });
	};
	if (booting) return <LoadingState label="Making a little room for your work…" />;
	if (!user)
		return (
			<>
				<Login
					onLogin={(value) => {
						setUser(value);
						changed();
						navigate("overview");
					}}
				/>
				{toast && (
					<div className={`toast ${toast.type}`} role="status">
						{toast.message}
					</div>
				)}
			</>
		);
	const common = { user, people: people.data || [], projects: projects.data || [], navigate, refreshKey, notify, setSearch };
	let content;
	if ((projects.loading && !projects.data) || (people.loading && !people.data)) content = <LoadingState />;
	else if (projects.error || people.error)
		content = (
			<ErrorState
				error={projects.error || people.error}
				retry={() => {
					projects.refresh();
					people.refresh();
				}}
			/>
		);
	else if (page === "overview") content = <Dashboard {...common} onCreate={() => setModal({ type: "project" })} />;
	else if (page === "projects") content = <Projects {...common} onCreate={() => setModal({ type: "project" })} />;
	else if (page === "project") content = <ProjectDetail {...common} key={id} id={id} onCreate={createAsset} onChanged={changed} />;
	else if (page === "assets" || page === "reviews")
		content = (
			<Assets {...common} key={page} search={search} query={query} reviews={page === "reviews"} onCreate={() => createAsset("")} />
		);
	else if (page === "asset") content = <AssetDetail {...common} key={id} id={id} onChanged={changed} />;
	else if (page === "inbox")
		content = inbox.error ? (
			<ErrorState error={inbox.error} retry={inbox.refresh} />
		) : (
			<Inbox {...common} items={inbox.data || []} onChanged={changed} />
		);
	else if (page === "reports") content = <Reports {...common} />;
	else content = <Guide />;
	return (
		<>
			<Shell
				user={user}
				page={page}
				navigate={navigate}
				unread={inbox.data?.filter((item) => !item.read).length || 0}
				search={search}
				setSearch={setSearch}
				onLogout={logout}
			>
				{content}
			</Shell>
			{modal?.type === "project" && (
				<ProjectForm
					people={people.data || []}
					user={user}
					onClose={() => setModal(null)}
					onSaved={(project) => {
						setModal(null);
						changed();
						navigate(`project/${project.id}`);
						notify("A new room for good work. Your project is ready.");
					}}
				/>
			)}
			{modal?.type === "asset" && (
				<AssetForm
					projects={projects.data || []}
					projectId={modal.projectId}
					people={people.data || []}
					user={user}
					onClose={() => setModal(null)}
					onSaved={(asset) => {
						setModal(null);
						changed();
						navigate(`asset/${asset.id}`);
						notify("Your first draft is in. Let’s make it a good one.");
					}}
				/>
			)}
			{toast && (
				<div className={`toast ${toast.type}`} role="status">
					<Icon name={toast.type === "error" ? "help" : "check"} size={18} />
					<span>{toast.message}</span>
					<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
						<Icon name="close" size={15} />
					</button>
				</div>
			)}
		</>
	);
}

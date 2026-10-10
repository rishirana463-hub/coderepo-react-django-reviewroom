import Icon from "./Icon";

const steps = [
	[
		"folder",
		"Make a little room",
		"Create a project and choose the people who should have access. Keep one campaign or body of work together.",
	],
	[
		"file",
		"Start with a draft",
		"Create a copy document or choose a bundled visual. Add a deadline, reviewers, and one or more ordered approval stages.",
	],
	[
		"review",
		"Bring fresh eyes in",
		"Send the exact draft for review. Assigned reviewers can approve or request changes. Authors cannot approve their own work.",
	],
	[
		"message",
		"Keep feedback in context",
		"Select text or click a point on an image to anchor a comment. Reply, resolve, and keep the conversation connected to its version.",
	],
	[
		"layers",
		"Make the next version better",
		"Create a revised version when content changes. Old feedback and decisions remain in history; the new version begins a fresh review.",
	],
	[
		"download",
		"Wrap up with confidence",
		"Once every stage is approved, export the approved content manifest. Check Reports for progress and reviewer workload.",
	],
];
export default function Guide() {
	return (
		<>
			<div className="page-heading">
				<div>
					<p className="eyebrow">A LITTLE ORIENTATION</p>
					<h1>
						You’re in the right room<span className="heading-star">✳</span>
					</h1>
					<p>A thoughtful workflow. A clearer path from draft to done.</p>
				</div>
			</div>
			<div className="guide-grid">
				{steps.map(([icon, title, body], index) => (
					<section className="panel guide-card" key={title}>
						<span className="guide-step">
							0{index + 1}
							<Icon name={icon} size={22} />
						</span>
						<h2>{title}</h2>
						<p>{body}</p>
					</section>
				))}
			</div>
			<div className="guide-permissions">
				<strong>Everyone has their part to play.</strong>
				<p>
					Owners manage the workspace. Editors create and revise work. Reviewers give feedback and record decisions on assigned
					review stages. Access is checked on every request.
				</p>
			</div>
		</>
	);
}

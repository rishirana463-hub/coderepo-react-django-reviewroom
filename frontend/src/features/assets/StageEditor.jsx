import { FormField } from "../../shared/components/Primitives";
import Icon from "../../shared/components/Icon";

export default function StageEditor({ stages, setStages, people }) {
	const update = (index, key, value) =>
		setStages((previous) => previous.map((stage, position) => (position === index ? { ...stage, [key]: value } : stage)));
	return (
		<div className="stage-editor">
			<div className="field-heading">
				<span>Review stages</span>
				<button
					type="button"
					className="text-button"
					disabled={stages.length >= 5}
					title="Up to 5 review stages"
					onClick={() =>
						setStages((previous) => [...previous, { name: `Stage ${previous.length + 1}`, reviewerIds: [], quorum: 1 }])
					}
				>
					<Icon name="plus" size={14} />
					Add stage
				</button>
			</div>
			{stages.map((stage, index) => (
				<fieldset className="stage-editor-row" key={index}>
					<legend>Stage {index + 1}</legend>
					<div className="stage-fields">
						<FormField label="Stage name">
							<input
								value={stage.name}
								required
								maxLength={80}
								onChange={(event) => update(index, "name", event.target.value)}
							/>
						</FormField>
						<FormField label="Approvals needed">
							<input
								type="number"
								min="1"
								max={Math.max(1, stage.reviewerIds.length)}
								required
								value={stage.quorum}
								onChange={(event) => update(index, "quorum", Number(event.target.value))}
							/>
						</FormField>
						{stages.length > 1 && (
							<button
								type="button"
								className="icon-button"
								aria-label={`Remove stage ${index + 1}`}
								onClick={() => setStages((previous) => previous.filter((_, position) => position !== index))}
							>
								<Icon name="close" size={16} />
							</button>
						)}
					</div>
					<div className="reviewer-checkboxes">
						{people.map((person) => (
							<label key={person.id}>
								<input
									type="checkbox"
									checked={stage.reviewerIds.includes(person.id)}
									onChange={(event) => {
										const ids = event.target.checked
											? [...stage.reviewerIds, person.id]
											: stage.reviewerIds.filter((id) => id !== person.id);
										setStages((previous) =>
											previous.map((item, position) =>
												position === index
													? { ...item, reviewerIds: ids, quorum: Math.min(item.quorum, Math.max(1, ids.length)) }
													: item,
											),
										);
									}}
								/>
								{person.name}
							</label>
						))}
					</div>
				</fieldset>
			))}
		</div>
	);
}

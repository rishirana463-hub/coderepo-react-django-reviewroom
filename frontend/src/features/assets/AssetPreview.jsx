import { useRef } from "react";
import Icon from "../../shared/components/Icon";

export default function AssetPreview({ asset, version, onAnchor, anchor, current }) {
	const copyRef = useRef(null);
	const content = version?.content ?? asset.content;
	const media = version?.mediaPath || asset.mediaPath || asset.thumbnail;
	function selectText() {
		if (!current) return;
		const selection = window.getSelection();
		if (
			!selection ||
			selection.isCollapsed ||
			!copyRef.current?.contains(selection.anchorNode) ||
			!copyRef.current?.contains(selection.focusNode)
		)
			return;
		const range = selection.getRangeAt(0);
		const prefix = range.cloneRange();
		prefix.selectNodeContents(copyRef.current);
		prefix.setEnd(range.startContainer, range.startOffset);
		const start = Array.from(prefix.toString()).length;
		onAnchor({ type: "text", start, end: start + Array.from(range.toString()).length, label: range.toString().slice(0, 75) });
	}
	function selectPoint(event) {
		if (!current) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		const position = (coordinate, origin, size) => Number(Math.min(1, Math.max(0, (coordinate - origin) / size)).toFixed(4));
		onAnchor({
			type: "image",
			x: event.detail === 0 ? 0.5 : position(event.clientX, bounds.left, bounds.width),
			y: event.detail === 0 ? 0.5 : position(event.clientY, bounds.top, bounds.height),
			label: "Point on image",
		});
	}
	return (
		<section
			className={`asset-preview ${asset.type === "image" ? "visual-preview" : ""}`}
			aria-label={`Preview of ${asset.title}, version ${version?.number || asset.version}`}
		>
			<div className="preview-toolbar">
				<span>
					<Icon name={asset.type === "image" ? "image" : "file"} size={16} />
					{asset.type === "image" ? "Visual asset" : "Copy document"}
					<span>·</span>Version {version?.number || asset.version}
				</span>
				<span className="preview-hint">
					{current
						? asset.type === "image"
							? "Click the visual to pin feedback"
							: "Select text to anchor feedback"
						: "Previous version · read only"}
				</span>
			</div>
			{asset.type === "image" ? (
				<div className="visual-canvas">
					<button className="image-anchor-area" disabled={!current} onClick={selectPoint} aria-label="Pin feedback on image">
						<img src={media} alt={asset.title} />
						{anchor?.type === "image" && (
							<span className="annotation-pin" style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}>
								<Icon name="message" size={13} />
							</span>
						)}
					</button>
					<p>Thoughtful details make all the difference.</p>
				</div>
			) : (
				<div className="copy-canvas">
					<div className="copy-paper">
						<span className="copy-kicker">{asset.projectName} / COPY REVIEW</span>
						<h2>{version?.title || asset.title}</h2>
						<div
							ref={copyRef}
							className="copy-content"
							tabIndex={0}
							role="region"
							aria-label="Copy content for review"
							onMouseUp={selectText}
							onKeyUp={selectText}
						>
							{content || "This draft is waiting for its first words."}
						</div>
						<div className="paper-bottom">
							<span>REVIEWROOM</span>
							<span>v{version?.number || asset.version}</span>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

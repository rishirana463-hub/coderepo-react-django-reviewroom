import { useEffect, useRef } from "react";
import Icon from "./Icon";

export default function Modal({ title, subtitle, children, onClose, wide = false }) {
	const dialog = useRef(null);
	useEffect(() => {
		const node = dialog.current;
		const previous = document.activeElement;
		node.showModal();
		return () => {
			node.close();
			previous?.focus?.();
		};
	}, []);
	return (
		<dialog
			ref={dialog}
			className={`modal ${wide ? "wide" : ""}`}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			aria-labelledby="modal-title"
		>
			<div className="modal-header">
				<div>
					<h2 id="modal-title">{title}</h2>
					{subtitle && <p>{subtitle}</p>}
				</div>
				<button className="icon-button" aria-label="Close dialog" onClick={onClose}>
					<Icon name="close" />
				</button>
			</div>
			{children}
		</dialog>
	);
}

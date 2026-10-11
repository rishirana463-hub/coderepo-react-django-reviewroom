import { Component } from "react";
import { ErrorState } from "./Primitives";

export default class ScreenBoundary extends Component {
	state = { error: null };
	static getDerivedStateFromError(error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			return (
				<ErrorState
					error={{ message: "This screen could not load. Reload to get the latest workspace." }}
					retry={() => window.location.reload()}
				/>
			);
		}
		return this.props.children;
	}
}

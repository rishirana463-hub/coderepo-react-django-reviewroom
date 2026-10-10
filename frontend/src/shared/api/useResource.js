import { useCallback, useEffect, useState } from "react";
import { api } from "./client";

export default function useResource(path, initialValue = null, refreshKey = 0) {
	const [state, setState] = useState({ data: initialValue, loading: true, error: null });
	const [revision, setRevision] = useState(0);
	const refresh = useCallback(() => setRevision((value) => value + 1), []);
	useEffect(() => {
		if (!path) {
			setState({ data: initialValue, loading: false, error: null });
			return;
		}
		const controller = new AbortController();
		setState((previous) => ({ ...previous, loading: true, error: null }));
		api(path, { signal: controller.signal })
			.then((data) => setState({ data, loading: false, error: null }))
			.catch((error) => {
				if (error.name !== "AbortError") setState((previous) => ({ ...previous, loading: false, error }));
			});
		return () => controller.abort();
	}, [path, revision, refreshKey]);
	return { ...state, refresh, setData: (data) => setState((previous) => ({ ...previous, data })) };
}

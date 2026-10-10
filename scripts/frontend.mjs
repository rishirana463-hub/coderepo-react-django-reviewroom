import { resolve } from "node:path";
import { command, root, run, vitePath } from "./runtime.mjs";
await command(async () => {
	const deadline = Date.now() + 45000;
	let ready = false;
	while (Date.now() < deadline) {
		try {
			const response = await fetch("http://127.0.0.1:8000/api/v1/health", { signal: AbortSignal.timeout(1500) });
			if (response.ok) {
				ready = true;
				break;
			}
		} catch {
			/* Backend is still starting. */
		}
		await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
	}
	if (!ready) throw new Error("The backend did not become healthy on port 8000. Check MongoDB and backend logs.");
	await run(process.execPath, [vitePath(), "--host", "0.0.0.0", "--port", "3000", "--strictPort"], { cwd: resolve(root, "frontend") });
});

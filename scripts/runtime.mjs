import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const frontendRequire = createRequire(resolve(root, "frontend/package.json"));
export const vitePath = () => resolve(dirname(frontendRequire.resolve("vite/package.json")), "bin/vite.js");
export function pythonPath() {
	const candidate = resolve(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
	if (!existsSync(candidate)) throw new Error("Python environment is missing. Run bash setup.sh --seed first.");
	return candidate;
}
async function stopOwnedChild(child) {
	if (process.platform === "win32") {
		// Capture process identity before a graceful exit can detach descendants.
		const script = `
$reviewroomProcesses = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate
$reviewroomIds = [Collections.Generic.HashSet[uint32]]::new()
[void]$reviewroomIds.Add(${child.pid})
do {
    $reviewroomAdded = $false
    foreach ($reviewroomItem in $reviewroomProcesses) {
        if ($reviewroomIds.Contains($reviewroomItem.ParentProcessId) -and $reviewroomIds.Add($reviewroomItem.ProcessId)) { $reviewroomAdded = $true }
    }
} while ($reviewroomAdded)
$reviewroomOwned = @($reviewroomProcesses | Where-Object { $reviewroomIds.Contains($_.ProcessId) })
taskkill /PID ${child.pid} /T 2>$null | Out-Null
Start-Sleep -Milliseconds 250
$reviewroomRemaining = @($reviewroomOwned | Where-Object {
    $reviewroomCurrent = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.ProcessId)
    $reviewroomCurrent -and $reviewroomCurrent.CreationDate -eq $_.CreationDate
})
if ($reviewroomRemaining.Count) {
    Start-Sleep -Milliseconds 2750
    foreach ($reviewroomItem in $reviewroomRemaining) {
        $reviewroomCurrent = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $reviewroomItem.ProcessId)
        if ($reviewroomCurrent -and $reviewroomCurrent.CreationDate -eq $reviewroomItem.CreationDate) {
            taskkill /PID $reviewroomItem.ProcessId /T /F 2>$null | Out-Null
        }
    }
}`;
		await new Promise((resolveStop) => {
			const killer = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
				stdio: "ignore",
				windowsHide: true,
			});
			killer.once("error", () => {
				child.kill();
				resolveStop();
			});
			killer.once("close", resolveStop);
		});
		return;
	}
	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		child.kill("SIGTERM");
	}
	const deadline = Date.now() + 3000;
	while (Date.now() < deadline) {
		try {
			process.kill(-child.pid, 0);
		} catch {
			return;
		}
		await new Promise((resolveStop) => setTimeout(resolveStop, 100));
	}
	try {
		process.kill(-child.pid, "SIGKILL");
	} catch {
		child.kill("SIGKILL");
	}
}
export function run(command, args, options = {}) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, {
			cwd: root,
			stdio: "inherit",
			windowsHide: true,
			detached: process.platform !== "win32",
			...options,
		});
		let shutdown;
		const stop = () => {
			if (!shutdown && child.pid) shutdown = stopOwnedChild(child);
		};
		const cleanup = () => {
			process.removeListener("SIGTERM", stop);
			process.removeListener("SIGINT", stop);
		};
		child.once("error", (error) => {
			cleanup();
			reject(error);
		});
		child.once("close", async (code, signal) => {
			await shutdown;
			cleanup();
			if (signal) reject(new Error(`${command} stopped with ${signal}`));
			else if (code === 0) resolvePromise();
			else reject(new Error(`${command} exited with code ${code}`));
		});
		process.once("SIGTERM", stop);
		process.once("SIGINT", stop);
	});
}
export async function command(main) {
	try {
		await main();
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}

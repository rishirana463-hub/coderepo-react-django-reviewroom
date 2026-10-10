import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { command, pythonPath, root, run } from "./runtime.mjs";

function reachable() {
	return new Promise((resolvePromise) => {
		const socket = createConnection({ host: "127.0.0.1", port: 27017 });
		socket.setTimeout(750);
		const finish = (value) => {
			socket.destroy();
			resolvePromise(value);
		};
		socket.once("connect", () => finish(true));
		socket.once("error", () => finish(false));
		socket.once("timeout", () => finish(false));
	});
}
function prepareEnvironment() {
	for (const folder of ["", "frontend", "backend"]) {
		const target = resolve(root, folder, ".env");
		const source = resolve(root, folder, ".env.example");
		if (!existsSync(target) && existsSync(source)) copyFileSync(source, target);
	}
	const target = resolve(root, "backend/.env");
	let content = readFileSync(target, "utf8");
	for (const key of ["DJANGO_SECRET_KEY", "JWT_SECRET"]) {
		const pattern = new RegExp(`^${key}=.*$`, "m");
		const current = content
			.match(pattern)?.[0]
			?.slice(key.length + 1)
			.trim();
		if (!current || current === "GENERATE_ON_SETUP") {
			const value = `${key}=${randomBytes(48).toString("hex")}`;
			content = pattern.test(content) ? content.replace(pattern, value) : `${content}\n${value}\n`;
		}
	}
	writeFileSync(target, content);
}
async function prepareMongo() {
	if (await reachable()) return;
	const directory = resolve(root, ".mongodb");
	mkdirSync(directory, { recursive: true });
	const processMongo = spawn(
		"mongod",
		["--dbpath", directory, "--bind_ip", "127.0.0.1", "--port", "27017", "--logpath", resolve(directory, "mongod.log")],
		{ detached: true, stdio: "ignore", windowsHide: true },
	);
	let startupError;
	processMongo.once("error", (error) => {
		startupError = error;
	});
	processMongo.unref();
	const deadline = Date.now() + 15000;
	while (Date.now() < deadline && !startupError) {
		if (await reachable()) return;
		await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
	}
	throw new Error("MongoDB 8 is required on 127.0.0.1:27017. Install/start MongoDB or place mongod on PATH, then retry.");
}
await command(async () => {
	const mode = process.argv[2] || "--seed";
	if (!["--start", "--seed"].includes(mode)) throw new Error(`Unknown setup mode: ${mode}`);
	prepareEnvironment();
	if (!existsSync(resolve(root, ".venv/pyvenv.cfg"))) await run("uv", ["venv", "--python", "3.12", ".venv"]);
	await run("uv", ["--system-certs", "pip", "install", "--python", pythonPath(), "-r", "backend/requirements.txt", "--quiet"]);
	await prepareMongo();
	await run(pythonPath(), ["-m", "scripts.seed"], { cwd: resolve(root, "backend") });
	process.stdout.write("Reviewroom setup complete. Starting the application restores the seeded workspace.\n");
});

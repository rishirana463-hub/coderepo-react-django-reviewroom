import { resolve } from "node:path";
import { command, pythonPath, root, run } from "./runtime.mjs";

await command(() => run(pythonPath(), ["-m", "scripts.seed"], { cwd: resolve(root, "backend") }));

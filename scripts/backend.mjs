import { command, pythonPath, root, run } from "./runtime.mjs";
import { resolve } from "node:path";
await command(() => run(pythonPath(), ["manage.py", "runserver", "0.0.0.0:8000"], { cwd: resolve(root, "backend") }));

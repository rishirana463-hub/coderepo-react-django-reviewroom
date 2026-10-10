import { resolve } from "node:path";
import { command, root, run, vitePath } from "./runtime.mjs";
await command(() => run(process.execPath, [vitePath(), "build"], { cwd: resolve(root, "frontend") }));

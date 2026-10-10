import { command, pythonPath, run } from "./runtime.mjs";
await command(() => run(pythonPath(), process.argv.slice(2)));

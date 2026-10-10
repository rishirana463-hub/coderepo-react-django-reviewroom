import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { command, root, pythonPath, run, frontendRequire } from "./runtime.mjs";
const { parseSync, transformWithOxc } = await import(pathToFileURL(frontendRequire.resolve("vite")).href);

function files(directory) {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)],
	);
}
function localImportExists(file, specifier) {
	const target = resolve(dirname(file), specifier.split(/[?#]/, 1)[0]);
	const candidates = [
		target,
		...[".js", ".jsx", ".mjs"].map((extension) => `${target}${extension}`),
		...["index.js", "index.jsx", "index.mjs"].map((name) => resolve(target, name)),
	];
	return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}
function inspectSource(program) {
	const imports = new Map();
	const references = new Set();
	const sources = new Set();
	let debugging = false;
	function visit(node, parent, key) {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) visit(item, parent, key);
			return;
		}
		if (node.type === "ImportDeclaration") {
			sources.add(node.source.value);
			for (const specifier of node.specifiers) imports.set(specifier.local.name, node.source.value);
			return;
		}
		if (
			["ExportAllDeclaration", "ExportNamedDeclaration", "ImportExpression"].includes(node.type) &&
			typeof node.source?.value === "string"
		)
			sources.add(node.source.value);
		if (node.type === "DebuggerStatement") debugging = true;
		if (
			node.type === "CallExpression" &&
			node.callee.type === "MemberExpression" &&
			node.callee.object.name === "console" &&
			(node.callee.computed ? node.callee.property.value : node.callee.property.name) === "log"
		)
			debugging = true;
		if (node.type === "Identifier" || node.type === "JSXIdentifier") {
			const memberKey = ["MemberExpression", "JSXMemberExpression"].includes(parent?.type) && key === "property" && !parent.computed;
			const propertyKey =
				["Property", "PropertyDefinition", "MethodDefinition"].includes(parent?.type) && key === "key" && !parent.computed;
			const binding =
				(parent?.type === "VariableDeclarator" && key === "id") ||
				((parent?.type?.includes("Function") || parent?.type === "ClassDeclaration" || parent?.type === "ClassExpression") &&
					["id", "params"].includes(key)) ||
				(parent?.type === "CatchClause" && key === "param");
			const label = key === "label";
			const attribute = parent?.type === "JSXAttribute" && key === "name";
			const intrinsicElement =
				node.type === "JSXIdentifier" &&
				["JSXOpeningElement", "JSXClosingElement"].includes(parent?.type) &&
				/^[a-z]/.test(node.name);
			if (!memberKey && !propertyKey && !binding && !label && !attribute && !intrinsicElement) references.add(node.name);
		}
		for (const [childKey, child] of Object.entries(node)) {
			if (child && typeof child === "object") visit(child, node, childKey);
		}
	}
	visit(program);
	return { sources, debugging, unused: [...imports.keys()].filter((name) => !references.has(name)) };
}
await command(async () => {
	const sourceFiles = [
		...files(resolve(root, "frontend/src")),
		...files(resolve(root, "scripts")),
		resolve(root, "frontend/vite.config.js"),
	].filter((name) => [".js", ".jsx", ".mjs"].includes(extname(name)));
	const errors = [];
	for (const file of sourceFiles) {
		const source = readFileSync(file, "utf8");
		try {
			await transformWithOxc(source, file, { sourcemap: false });
			const parsed = parseSync(file, source);
			if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join("; "));
			const inspection = inspectSource(parsed.program);
			if (inspection.debugging) errors.push(`${file}: remove debugging statements`);
			for (const name of inspection.unused) errors.push(`${file}: unused import ${name}`);
			for (const specifier of inspection.sources) {
				if (specifier.startsWith(".") && !localImportExists(file, specifier)) errors.push(`${file}: missing import ${specifier}`);
			}
		} catch (error) {
			errors.push(`${file}: ${error.message}`);
		}
		if (source.length && !source.endsWith("\n")) errors.push(`${file}: missing final newline`);
	}
	await run(pythonPath(), ["-m", "compileall", "-q", "backend"]);
	await run(pythonPath(), ["backend/manage.py", "check"]);
	if (errors.length) throw new Error(errors.join("\n"));
	process.stdout.write(
		`Source syntax, local imports, conservative unused-import checks, debug hygiene, Python compilation, and Django checks passed (${sourceFiles.length} JavaScript files).\n`,
	);
});

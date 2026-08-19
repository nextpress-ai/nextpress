#!/usr/bin/env node
/**
 * Extract lucide-react icon path data into standalone SVG files.
 * Used to build the animated feature glyphs on the demo transition cards.
 *
 * Usage: node extract-icons.mjs <out-dir> <icon-name...>
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const ICON_DIR = resolve(
	process.cwd(),
	"node_modules/lucide-react/dist/esm/icons",
);

// Pull the element tuples out of the `createLucideIcon("Name", [...])` call.
function parseIconSource(source) {
	const start = source.indexOf("createLucideIcon(");
	if (start === -1) throw new Error("no createLucideIcon call");
	const arrayStart = source.indexOf("[", start);
	let depth = 0;
	let end = -1;
	for (let i = arrayStart; i < source.length; i += 1) {
		if (source[i] === "[") depth += 1;
		else if (source[i] === "]") {
			depth -= 1;
			if (depth === 0) {
				end = i + 1;
				break;
			}
		}
	}
	if (end === -1) throw new Error("unbalanced icon array");
	// The tuple list is plain JS data: [["path", { d: "...", key: "..." }], ...]
	return new Function(`return ${source.slice(arrayStart, end)};`)();
}

function toSvg(elements) {
	const body = elements
		.map(([tag, attrs]) => {
			const props = Object.entries(attrs)
				.filter(([name]) => name !== "key")
				.map(([name, value]) => `${name}="${value}"`)
				.join(" ");
			return `  <${tag} ${props} />`;
		})
		.join("\n");

	return [
		'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"',
		'     fill="none" stroke="#ffffff" stroke-width="2"',
		'     stroke-linecap="round" stroke-linejoin="round">',
		body,
		"</svg>",
		"",
	].join("\n");
}

const [outDir, ...names] = process.argv.slice(2);
if (!outDir || names.length === 0) {
	console.error("usage: extract-icons.mjs <out-dir> <icon-name...>");
	process.exit(1);
}

await mkdir(outDir, { recursive: true });
for (const name of names) {
	const source = await readFile(join(ICON_DIR, `${name}.js`), "utf8");
	await writeFile(join(outDir, `${name}.svg`), toSvg(parseIconSource(source)));
	console.log(`[icons] ${name}.svg`);
}

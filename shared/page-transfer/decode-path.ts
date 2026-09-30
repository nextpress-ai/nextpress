/** Non-fatal: a broken byte sequence becomes a replacement character instead of throwing. */
const decoder = new TextDecoder("utf-8");

/**
 * `%20`-style escapes in an address, decoded without ever throwing (a lone `%` or a broken
 * sequence stays readable instead of failing the whole page).
 */
export function decodePath(text: string): string {
	return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (sequence) =>
		decoder.decode(new Uint8Array(sequence.slice(1).split("%").map((hex) => Number.parseInt(hex, 16)))),
	);
}

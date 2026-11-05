import type { BlockConfig } from "../schema-types.js";

/** Where writing starts on a new docs page or post: a normal paragraph with nothing in it, kept as inline HTML so bold, italic, code and links work. */
export const emptyParagraphContent = (): BlockConfig["content"] => ({ kind: "text", value: "", format: "html", dropCap: false, anchor: "", className: "" }) as BlockConfig["content"];

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";
import { tailwindThemeExtend } from "@shared/tailwind-theme";

export default {
	darkMode: ["class"],
	content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: tailwindThemeExtend,
	},
	plugins: [tailwindcssAnimate, typography],
} satisfies Config;

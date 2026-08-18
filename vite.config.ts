import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const projectRoot = import.meta.dirname;
const clientRoot = path.resolve(projectRoot, "client");

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(clientRoot, "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
      // Fallback if anything still imports the Node-only subpath in the client.
      "tailwindcss/resolveConfig.js": path.resolve(
        projectRoot,
        "shared/tailwind-resolve-config.browser.ts",
      ),
      "@shared/tailwind-resolve-config.browser": path.resolve(
        projectRoot,
        "shared/tailwind-resolve-config.browser.ts",
      ),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  root: clientRoot,
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    // Stop mid-session dep discovery — a second optimize pass loads another React
    // copy and hooks throw (null dispatcher / useState / useEffect / useRef).
    noDiscovery: process.env.NODE_ENV !== "production",
    holdUntilCrawlEnd: false,
    exclude: ["drizzle-orm", "drizzle-zod"],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "react-markdown",
      "remark-gfm",
      "better-auth/react",
      "better-auth/client/plugins",
      "@tanstack/react-query",
      "wouter",
      "sonner",
      "lucide-react",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "@uiw/react-md-editor",
      "react-helmet",
      "cmdk",
      "input-otp",
      "react-icons/lu",
      "react-icons/tb",
      "react-icons/fa6",
      "react-icons/hi2",
      "react-icons/ri",
      "react-icons/pi",
      "react-icons/bs",
      "react-icons/io5",
      "react-icons/rx",
      "react-icons/bi",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "@radix-ui/react-popover",
      "@radix-ui/react-slot",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-label",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-accordion",
      "@radix-ui/react-progress",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-aspect-ratio",
      "nanoid",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "zod",
      "date-fns",
      "date-fns-tz",
      "vaul",
      "embla-carousel-react",
      "recharts",
      "tailwindcss-animate",
      "tailwindcss/resolveConfig",
      "@tailwindcss/typography",
    ],
  },
});

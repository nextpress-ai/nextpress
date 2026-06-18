import { models } from "./storage.js";
import hooks from "./hooks.js";

// Flag to ensure renderer warning is logged only once
let rendererWarningLogged = false;

class ThemeManager {
	private renderers: Map<string, any>;

	constructor() {
		this.renderers = new Map();
		this.registerDefaultRenderers();
	}

	// Register default theme renderers
	registerDefaultRenderers() {
		// React renderer
		this.renderers.set("react", {
			name: "React Renderer",
			render: async (template: string, data: any) => {
				// React server-side rendering would go here
				return `<!-- React rendered content for ${template} -->`;
			},
		});

		// Next.js renderer
		this.renderers.set("nextjs", {
			name: "Next.js Renderer",
			render: async (template: string, data: any) => {
				return this.renderNextJsTemplate(template, data);
			},
		});

		// Custom SSR renderer - uses the built-in template methods
		this.renderers.set("custom-ssr", {
			name: "Custom SSR Renderer",
			render: async (template: string, data: any) => {
				return this.renderNextJsTemplate(template, data);
			},
		});

		// Custom renderer
		this.renderers.set("custom", {
			name: "Custom Renderer",
			render: async (template: string, data: any) => {
				// Custom rendering logic
				return `<!-- Custom rendered content for ${template} -->`;
			},
		});
	}

	// Register a new theme renderer
	registerRenderer(name: string, renderer: any) {
		this.renderers.set(name, renderer);
	}

	// Get available renderers
	getRenderers() {
		return Array.from(this.renderers.keys());
	}

	// Install a new theme
	async installTheme(themeData: any) {
		const theme = await models.themes.create(themeData);
		hooks.doAction("theme_installed", theme);
		return theme;
	}

	// Activate a theme
	async activateTheme(themeId: string) {
		const oldTheme = await models.themes.findActiveTheme();
		await models.themes.setActiveTheme(themeId);
		const newTheme = await models.themes.findById(themeId);

		hooks.doAction("switch_theme", newTheme, oldTheme);
		return newTheme;
	}

	// Get active theme
	async getActiveTheme() {
		return await models.themes.findActiveTheme();
	}

	// Next.js specific rendering method
	renderNextJsTemplate(template: string, data: any): string {
		const { post, page, site } = data;
		const content = post || page;

		if (!content) {
			return this.render404();
		}

		switch (template) {
			case "single-post":
			case "post":
				return this.renderSinglePost(content, site);
			case "page":
				return this.renderSinglePage(content, site);
			case "home":
			case "index":
				return this.renderHomePage(data.posts || [], site);
			default:
				return this.renderSinglePost(content, site);
		}
	}

	renderSinglePost(post: any, site: any): string {
		const siteTitle = site?.name || "NextPress";
		const siteDescription =
			site?.description || "A modern WordPress alternative";

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} | ${siteTitle}</title>
    <meta name="description" content="${post.excerpt || post.title}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.excerpt || post.title}">
    <meta property="og:url" content="${site?.url || ""}/posts/${post.id}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${post.title}">
    <meta property="twitter:description" content="${post.excerpt || post.title}">
    
    <!-- Next.js-style CSS -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #eee;
        }
        
        .site-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
        }
        
        .site-description {
            color: #666;
            font-size: 1.1rem;
        }
        
        .post-header {
            margin-bottom: 2rem;
        }
        
        .post-title {
            font-size: 2.5rem;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 1rem;
            color: #1a1a1a;
        }
        
        .post-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 1rem;
        }
        
        .post-status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .status-published { background: #dcfce7; color: #166534; }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-private { background: #fee2e2; color: #991b1b; }
        
        .post-content {
            font-size: 1.1rem;
            line-height: 1.8;
            margin-bottom: 2rem;
        }
        
        .post-content h1, .post-content h2, .post-content h3 {
            margin: 2rem 0 1rem 0;
            line-height: 1.3;
        }
        
        .post-content h1 { font-size: 2rem; }
        .post-content h2 { font-size: 1.75rem; }
        .post-content h3 { font-size: 1.5rem; }
        
        .post-content p {
            margin-bottom: 1.5rem;
        }
        
        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1.5rem 0;
        }
        
        .post-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            font-style: italic;
            color: #666;
        }
        
        .post-content code {
            background: #f3f4f6;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.9em;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .post-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
        }
        
        .post-content pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }
        
        .back-link {
            display: inline-block;
            margin-bottom: 1rem;
            color: #3b82f6;
            text-decoration: none;
            font-weight: 500;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 640px) {
            .container {
                padding: 1rem;
            }
            
            .post-title {
                font-size: 2rem;
            }
            
            .post-meta {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="site-title">${siteTitle}</h1>
            <p class="site-description">${siteDescription}</p>
        </header>
        
        <main>
            <a href="/" class="back-link">← Back to Home</a>
            
            <article>
                <div class="post-header">
                    <h1 class="post-title">${post.title}</h1>
                    <div class="post-meta">
                        <time datetime="${post.createdAt}">
                            ${new Date(post.createdAt).toLocaleDateString(
															"en-US",
															{
																year: "numeric",
																month: "long",
																day: "numeric",
															},
														)}
                        </time>
                        <span class="post-status status-${post.status}">${post.status}</span>
                    </div>
                </div>
                
                <div class="post-content">
                    ${this.parseContent(post.content)}
                </div>
            </article>
        </main>
        
        <footer>
            <p>Powered by NextPress - A modern WordPress alternative</p>
        </footer>
    </div>
</body>
</html>`;
	}

	renderSinglePage(page: any, site: any): string {
		// Similar to post but with different structure
		return this.renderSinglePost(page, site);
	}

	renderHomePage(posts: any[], site: any): string {
		const siteTitle = site?.name || "NextPress";
		const siteDescription =
			site?.description || "A modern WordPress alternative";

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteTitle}</title>
    <meta name="description" content="${siteDescription}">
    <style>
        /* Same base styles as single post */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #eee;
        }
        
        .site-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
        }
        
        .site-description {
            color: #666;
            font-size: 1.1rem;
        }
        
        .posts-grid {
            display: grid;
            gap: 2rem;
        }
        
        .post-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            transition: shadow 0.2s;
        }
        
        .post-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .post-card-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
        }
        
        .post-card-title a {
            color: inherit;
            text-decoration: none;
        }
        
        .post-card-title a:hover {
            color: #3b82f6;
        }
        
        .post-card-meta {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 1rem;
        }
        
        .post-card-excerpt {
            color: #666;
            line-height: 1.6;
        }
        
        .no-posts {
            text-align: center;
            padding: 3rem 0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="site-title">${siteTitle}</h1>
            <p class="site-description">${siteDescription}</p>
        </header>
        
        <main>
            ${
							posts.length > 0
								? `
                <div class="posts-grid">
                    ${posts
											.map(
												(post) => `
                        <article class="post-card">
                            <h2 class="post-card-title">
                                <a href="/posts/${post.id}">${post.title}</a>
                            </h2>
                            <div class="post-card-meta">
                                ${new Date(post.createdAt).toLocaleDateString(
																	"en-US",
																	{
																		year: "numeric",
																		month: "long",
																		day: "numeric",
																	},
																)}
                            </div>
                            ${post.excerpt ? `<p class="post-card-excerpt">${post.excerpt}</p>` : ""}
                        </article>
                    `,
											)
											.join("")}
                </div>
            `
								: `
                <div class="no-posts">
                    <p>No posts published yet.</p>
                </div>
            `
						}
        </main>
    </div>
</body>
</html>`;
	}

	render404(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f9fafb;
        }
        
        .error-container {
            text-align: center;
            max-width: 400px;
            padding: 2rem;
        }
        
        .error-code {
            font-size: 6rem;
            font-weight: 700;
            color: #374151;
            margin-bottom: 1rem;
        }
        
        .error-message {
            font-size: 1.5rem;
            color: #6b7280;
            margin-bottom: 2rem;
        }
        
        .back-link {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">404</div>
        <div class="error-message">Page Not Found</div>
        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>`;
	}

	parseContent(content: string): string {
		// Basic content parsing - convert markdown-like syntax to HTML
		if (!content) return "";

		return content
			.replace(/\n\n/g, "</p><p>")
			.replace(/\n/g, "<br>")
			.replace(/^/, "<p>")
			.replace(/$/, "</p>")
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.replace(/`(.*?)`/g, "<code>$1</code>");
	}

	// Render content using active theme
	async renderContent(template: string, data: any): Promise<string> {
		const activeTheme = await this.getActiveTheme();

		if (!activeTheme) {
			throw new Error("No active theme found");
		}

		// Runtime fallback for missing renderer field with one-time warning
		const other = activeTheme.other as Record<string, any> | null | undefined;
		const rendererName = activeTheme.renderer ?? other?.renderer ?? 'custom-ssr';
		
		if (!activeTheme.renderer && !rendererWarningLogged) {
			console.warn(
				`[ThemeManager] Active theme '${activeTheme.name}' has no renderer field. ` +
				`Falling back to '${rendererName}'. Consider adding a renderer field to the theme.`
			);
			rendererWarningLogged = true;
		}

		const renderer = this.renderers.get(rendererName);
		if (!renderer) {
			throw new Error(`Renderer '${rendererName}' not found`);
		}

		// Apply theme filters
		const filteredData = hooks.applyFilters("theme_data", data, activeTheme);
		const filteredTemplate = hooks.applyFilters(
			"theme_template",
			template,
			activeTheme,
		);

		// Render content
		const content = await renderer.render(filteredTemplate, filteredData);

		// Apply content filters
		return hooks.applyFilters("theme_content", content, activeTheme);
	}

	// Get theme templates
	getTemplateHierarchy(type: string, slug: string | null = null): string[] {
		const templates = [];

		switch (type) {
			case "single":
				if (slug) templates.push(`single-${slug}.js`);
				templates.push("single.js", "index.js");
				break;
			case "page":
				if (slug) templates.push(`page-${slug}.js`);
				templates.push("page.js", "index.js");
				break;
			case "archive":
				templates.push("archive.js", "index.js");
				break;
			case "home":
				templates.push("home.js", "index.js");
				break;
			default:
				templates.push("index.js");
		}

		return templates;
	}

	// WordPress-compatible theme functions
	async getCurrentTheme() {
		return await this.getActiveTheme();
	}

	async switchTheme(themeName: string) {
		const themes = await models.themes.findMany();
		const theme = themes.find((t) => t.name === themeName);

		if (!theme) {
			throw new Error(`Theme '${themeName}' not found`);
		}

		return await this.activateTheme(theme.id);
	}
}

/** Links the default site to the active theme when both exist (FK-safe). */
async function linkDefaultSiteTheme(themeId: string): Promise<void> {
	const site = await models.sites.findDefaultSite();
	if (!site || site.activeThemeId) {
		return;
	}

	const verified = await models.themes.findById(themeId);
	if (!verified) {
		console.warn("[themes] Skipping activeThemeId link — theme not found:", themeId);
		return;
	}

	await models.sites.update(site.id, { activeThemeId: verified.id });
}

// Initialize default themes
async function initializeDefaultThemes() {
	const themes = await models.themes.findMany();

	if (themes.length > 0) {
		const activeTheme = await models.themes.findActiveTheme();
		if (activeTheme?.id) {
			await linkDefaultSiteTheme(activeTheme.id);
		}
		return;
	}

	// Get the first user to use as author, or create a system user if none exists
	let authorId: string;
	const users = await models.users.findMany();

	if (users.length === 0) {
		const systemUser = await models.users.create({
			username: "system",
			email: "system@nextpress.local",
			firstName: "System",
			lastName: "User",
			status: "active",
		});
		authorId = systemUser.id;
	} else {
		authorId = users[0].id;
	}

	const customSSRTheme = await models.themes.create({
		name: "Custom SSR",
		description:
			"A custom server-side rendered theme with modern styling and responsive design. Built specifically for NextPress with optimized HTML output.",
		authorId: authorId,
		version: "1.0.0",
		requires: "1.0.0",
		status: "active",
		renderer: "custom",
		settings: {
			colors: {
				primary: "#0073aa",
				secondary: "#005177",
				background: "#ffffff",
				text: "#23282d",
				accent: "#00a0d2",
			},
			layout: {
				maxWidth: "800px",
				sidebar: "none",
				navigation: "top",
			},
			features: {
				serverSideRendering: true,
				responsiveDesign: true,
				darkMode: false,
				customHTML: true,
			},
		},
	});

	console.log("Default theme initialized:", customSSRTheme.name);
	await linkDefaultSiteTheme(customSSRTheme.id);
}

const themeManager = new ThemeManager();

// Export initialization function to be called after database is ready
export { initializeDefaultThemes };

export default themeManager;

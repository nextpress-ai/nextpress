/**
 * Editorial agency workflow demo — exercises SDK Result mutations end-to-end.
 * Run: pnpm exec tsx scripts/editorial-workflow-demo.ts
 */
import { PAGE_SLUG_EXISTS, VERSION_STALE } from "../src/client/sdk-result.js";
import { loadIntegrationTestConfig } from "../src/test/integration/config.js";
import { loadShippedSdk } from "../src/test/integration/load-shipped-sdk.js";
import { waitForServerReady } from "../src/test/integration/wait-for-server.js";

const runId = Date.now().toString(36);

const logStep = (label: string, ok: boolean, detail?: string) => {
	console.log(`[${ok ? "ok" : "fail"}] ${label}${detail ? ` — ${detail}` : ""}`);
};

async function main(): Promise<void> {
	const config = await loadIntegrationTestConfig();
	if (!config) {
		throw new Error("integration.config.ts required with enabled: true");
	}

	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const { sdk } = await loadShippedSdk();
	const client = sdk.createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	const slug = `editorial-demo-${runId}`;

	const createPage = await client.pages.create({
		title: `Editorial Demo ${runId}`,
		slug,
		status: "draft",
		blocks: client.blocks.starterLayout(),
	});
	logStep("create page (draft)", !createPage.isErr);
	if (createPage.isErr) {
		process.exit(1);
	}
	const page = createPage.value;

	const duplicate = await client.pages.create({
		title: "Duplicate slug",
		slug,
		status: "draft",
	});
	logStep(
		"duplicate slug rejected",
		duplicate.isErr && duplicate.error.code === PAGE_SLUG_EXISTS,
		duplicate.isErr ? duplicate.error.code : "unexpected success",
	);

	const editor = client.createEditorSession();
	await editor.load({ type: "page", id: page.id });
	editor.setBlocks([
		...editor.getBlocks(),
		client.blocks.paragraph({ text: "Agency copy edit" }),
	]);
	editor.undo();
	editor.setBlocks([
		...editor.getBlocks(),
		client.blocks.paragraph({ text: "Final agency copy" }),
	]);

	const saveDraft = await editor.save({ status: "draft" });
	logStep("save draft", !saveDraft.isErr);

	const publish = await editor.publish();
	logStep("publish", !publish.isErr);

	const unpublish = await editor.unpublish();
	logStep("unpublish", !unpublish.isErr);

	const blogResult = await client.blogs.create({
		name: `Editorial Blog ${runId}`,
		slug: `editorial-blog-${runId}`,
	});
	if (blogResult && typeof blogResult === "object" && "id" in blogResult) {
		const blog = blogResult as { id: string };
		const postCreate = await client.posts.create({
			title: `Editorial Post ${runId}`,
			blogId: blog.id,
			status: "draft",
			blocks: [client.blocks.paragraph({ text: "Post body" })],
		});
		logStep("create post", !postCreate.isErr);

		if (!postCreate.isErr) {
			const post = postCreate.value;
			const postEditor = client.createEditorSession();
			await postEditor.load({ type: "post", id: post.id });
			postEditor.setBlocks([
				...postEditor.getBlocks(),
				client.blocks.paragraph({ text: "Post revision" }),
			]);
			const postSave = await postEditor.save();
			logStep("save post", !postSave.isErr);
			const postPublish = await postEditor.publish();
			logStep("publish post", !postPublish.isErr);
			const postUnpublish = await postEditor.unpublish();
			logStep("unpublish post", !postUnpublish.isErr);

			const stalePost = await client.posts.update({
				id: post.id,
				expectedVersion: 0,
				title: post.title,
			});
			logStep(
				"stale post update rejected",
				stalePost.isErr && stalePost.error.code === VERSION_STALE,
			);

			const delPost = await client.posts.delete({ id: post.id });
			logStep("delete post", !delPost.isErr);
		}
	}

	const stalePage = await client.pages.update({
		id: page.id,
		expectedVersion: 0,
		blocks: page.blocks ?? [],
	});
	logStep(
		"stale page update rejected",
		stalePage.isErr && stalePage.error.code === VERSION_STALE,
		stalePage.isErr ? stalePage.error.code : undefined,
	);

	const delPage = await client.pages.delete({ id: page.id });
	logStep("delete page", !delPage.isErr);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

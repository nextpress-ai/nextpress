/**
 * Published post-list overlay: intercept card clicks, fetch public post HTML,
 * show a dialog. Links still work if JS is off.
 */
(function initPostListOverlay() {
	if (typeof document === "undefined") return;

	var overlayAbort = null;

	function visitorSiteIdHint() {
		try {
			var fromQuery = new URLSearchParams(location.search).get("siteId");
			if (fromQuery) return fromQuery;
			var pathMatch = location.pathname.match(/^\/sites\/([^/]+)\//);
			if (!pathMatch || !pathMatch[1]) return "";
			return decodeURIComponent(pathMatch[1]);
		} catch (err) {
			return "";
		}
	}

	function withSiteId(url) {
		var siteId = visitorSiteIdHint();
		if (!siteId) return url;
		return url + (url.indexOf("?") >= 0 ? "&" : "?") + "siteId=" + encodeURIComponent(siteId);
	}

	function isSafeHttpUrl(url) {
		if (!url || typeof url !== "string") return false;
		var trimmed = url.trim();
		if (!trimmed) return false;
		if (trimmed.charAt(0) === "/" && trimmed.charAt(1) !== "/") return true;
		try {
			var parsed = new URL(trimmed);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch (err) {
			return false;
		}
	}

	function hashSlug() {
		var hash = location.hash || "";
		if (hash.indexOf("#post/") !== 0) return "";
		try {
			return decodeURIComponent(hash.slice(6));
		} catch (err) {
			return "";
		}
	}

	function overlayRoot() {
		var existing = document.getElementById("np-post-overlay");
		if (existing) return existing;
		var dialog = document.createElement("dialog");
		dialog.id = "np-post-overlay";
		dialog.className = "np-post-overlay";
		dialog.setAttribute("aria-labelledby", "np-post-overlay-title");
		dialog.innerHTML =
			'<form method="dialog" class="np-post-overlay__chrome">' +
			'<button type="submit" class="np-post-overlay__close" aria-label="Close">Close</button>' +
			"</form>" +
			'<article class="np-post-overlay__article">' +
			'<h2 id="np-post-overlay-title" class="np-post-overlay__title"></h2>' +
			'<div class="np-post-overlay__body"></div>' +
			"</article>";
		document.body.appendChild(dialog);
		dialog.addEventListener("close", function () {
			if (overlayAbort) overlayAbort.abort();
			if (location.hash.indexOf("#post/") === 0) {
				history.replaceState(null, "", location.pathname + location.search);
			}
		});
		return dialog;
	}

	function fillOverlay(post) {
		var dialog = overlayRoot();
		var title = dialog.querySelector(".np-post-overlay__title");
		var body = dialog.querySelector(".np-post-overlay__body");
		if (title) title.textContent = post.title || "Untitled";
		if (body) {
			body.replaceChildren();
			if (post.featuredImage && isSafeHttpUrl(post.featuredImage)) {
				var img = document.createElement("img");
				img.src = post.featuredImage;
				img.alt = "";
				img.className = "np-post-overlay__image";
				body.appendChild(img);
			}
			if (post.excerpt) {
				var lead = document.createElement("p");
				lead.className = "np-post-overlay__excerpt";
				lead.textContent = post.excerpt;
				body.appendChild(lead);
			}
			if (typeof post.renderedHtml === "string" && post.renderedHtml.trim()) {
				var html = document.createElement("div");
				html.className = "np-post-overlay__html";
				html.innerHTML = post.renderedHtml;
				body.appendChild(html);
			}
		}
		if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
	}

	function openSlug(slug) {
		if (!slug) return;
		if (overlayAbort) overlayAbort.abort();
		overlayAbort = typeof AbortController === "function" ? new AbortController() : null;
		var signal = overlayAbort ? overlayAbort.signal : undefined;
		var requested = slug;
		fetch(withSiteId("/api/public/post/" + encodeURIComponent(slug)), signal ? { signal: signal } : undefined)
			.then(function (res) {
				if (!res.ok) throw new Error("Post not found");
				return res.json();
			})
			.then(function (post) {
				if (hashSlug() !== requested) return;
				fillOverlay(post);
			})
			.catch(function (err) {
				if (err && err.name === "AbortError") return;
				if (hashSlug() !== requested) return;
				window.location.href = withSiteId("/post/" + encodeURIComponent(slug));
			});
	}

	document.addEventListener("click", function (event) {
		var target = event.target;
		if (!(target instanceof Element)) return;
		var link = target.closest("a[data-np-post-slug]");
		if (!link) return;
		if (link.getAttribute("data-np-open") === "page") return;
		var slug = link.getAttribute("data-np-post-slug");
		if (!slug) return;
		event.preventDefault();
		if (location.hash !== "#post/" + encodeURIComponent(slug)) {
			location.hash = "post/" + encodeURIComponent(slug);
		} else {
			openSlug(slug);
		}
	});

	window.addEventListener("hashchange", function () {
		if (location.hash.indexOf("#post/") === 0) {
			openSlug(hashSlug());
		} else {
			var dialog = document.getElementById("np-post-overlay");
			if (dialog && dialog.open && typeof dialog.close === "function") dialog.close();
		}
	});

	if (location.hash.indexOf("#post/") === 0) {
		openSlug(hashSlug());
	}
})();

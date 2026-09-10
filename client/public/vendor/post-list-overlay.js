/**
 * Published post-list overlay: intercept card clicks, fetch public post HTML,
 * show a dialog. Links still work if JS is off.
 */
(function initPostListOverlay() {
	if (typeof document === "undefined") return;

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
			if (post.featuredImage) {
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
		fetch("/api/public/post/" + encodeURIComponent(slug))
			.then(function (res) {
				if (!res.ok) throw new Error("Post not found");
				return res.json();
			})
			.then(fillOverlay)
			.catch(function () {
				window.location.href = "/post/" + encodeURIComponent(slug);
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
			openSlug(decodeURIComponent(location.hash.slice(6)));
		} else {
			var dialog = document.getElementById("np-post-overlay");
			if (dialog && dialog.open && typeof dialog.close === "function") dialog.close();
		}
	});

	if (location.hash.indexOf("#post/") === 0) {
		openSlug(decodeURIComponent(location.hash.slice(6)));
	}
})();

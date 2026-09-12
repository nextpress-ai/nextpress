import * as React from "react";
import {
	headerBarClassName,
	visibleHeaderSlots,
	type HeaderAction,
	type HeaderBrand,
	type HeaderContent,
	type HeaderNavItem,
} from "./header-model.js";

function BrandMark({ brand }: { brand: HeaderBrand }) {
	const href = brand.href || "/";
	return (
		<a className="wp-block-header__brand" href={href}>
			{brand.kind === "logo" && brand.logoUrl ? (
				<img src={brand.logoUrl} alt={brand.text || "Site"} />
			) : (
				<>
					<span className="wp-block-header__mark" aria-hidden="true" />
					<span>{brand.text}</span>
				</>
			)}
		</a>
	);
}

function NavLinks({ items }: { items: HeaderNavItem[] }) {
	if (items.length === 0) return null;
	return (
		<nav className="wp-block-header__nav" aria-label="Site">
			{items.map((item) =>
				item.children && item.children.length > 0 ? (
					<details key={item.id} className="wp-block-header__dropdown">
						<summary>{item.label}</summary>
						<ul className="wp-block-header__dropdown-list">
							{item.children.map((child) => (
								<li key={child.id}>
									<a href={child.href || "#"}>{child.label}</a>
								</li>
							))}
						</ul>
					</details>
				) : (
					<a key={item.id} href={item.href || "#"}>
						{item.label}
					</a>
				),
			)}
		</nav>
	);
}

function ActionButtons({ actions }: { actions: HeaderAction[] }) {
	if (actions.length === 0) return null;
	return (
		<div className="wp-block-header__actions">
			{actions.map((action) => (
				<a
					key={action.id}
					href={action.href || "#"}
					className={
						action.style === "solid"
							? "wp-block-header__action is-solid"
							: "wp-block-header__action"
					}
				>
					{action.label}
				</a>
			))}
		</div>
	);
}

function SlotParts({
	names,
	content,
}: {
	names: Array<"brand" | "nav" | "actions">;
	content: HeaderContent;
}) {
	return (
		<>
			{names.map((name) => {
				if (name === "brand") return <BrandMark key="brand" brand={content.brand} />;
				if (name === "nav") return <NavLinks key="nav" items={content.nav} />;
				return <ActionButtons key="actions" actions={content.actions} />;
			})}
		</>
	);
}

/** Shared header chrome for canvas, preview, and publish. */
export function HeaderBar({
	content,
	disableLinks = false,
}: {
	content: HeaderContent;
	disableLinks?: boolean;
}) {
	const slots = visibleHeaderSlots(content);
	return (
		<header
			className={headerBarClassName({ sticky: content.sticky })}
			onClick={(event) => {
				if (!disableLinks) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("a")) event.preventDefault();
			}}
		>
			<div className="wp-block-header__bar">
				<div className="wp-block-header__slot is-left">
					<SlotParts names={slots.left} content={content} />
				</div>
				<div className="wp-block-header__desktop">
					{slots.middle.length > 0 ? (
						<div className="wp-block-header__slot is-middle">
							<SlotParts names={slots.middle} content={content} />
						</div>
					) : null}
					{slots.right.length > 0 ? (
						<div className="wp-block-header__slot is-right">
							<SlotParts names={slots.right} content={content} />
						</div>
					) : null}
				</div>
				<details className="wp-block-header__mobile-toggle wp-block-header__mobile-panel">
					<summary aria-label="Open menu">
						<span className="wp-block-header__burger" aria-hidden="true" />
					</summary>
					<div className="wp-block-header__mobile-body">
						<NavLinks items={content.nav} />
						<ActionButtons actions={content.actions} />
					</div>
				</details>
			</div>
		</header>
	);
}

import * as React from "react";
import {
	HEADER_PLACEHOLDERS,
	headerBarClassName,
	headerActionLookStyle,
	headerCollapsesToMenu,
	headerLogoMarkStyle,
	resolveHeaderHref,
	visibleHeaderSlots,
	type HeaderAction,
	type HeaderBrand,
	type HeaderContent,
	type HeaderNavItem,
	type HeaderSlotPart,
} from "./header-model.js";

function LogoPlaceholderIcon() {
	return (
		<svg
			className="wp-block-header__logo-placeholder-icon"
			viewBox="0 0 16 16"
			width="16"
			height="16"
			aria-hidden="true"
			fill="none"
		>
			<rect
				x="2"
				y="3"
				width="12"
				height="10"
				rx="1.25"
				stroke="currentColor"
				strokeWidth="1.25"
			/>
			<circle cx="5.75" cy="6.75" r="1.1" fill="currentColor" opacity="0.72" />
			<path
				d="M3.5 11.5 6.5 8.75 8.25 10.25 11.25 7.25 12.5 8.5"
				stroke="currentColor"
				strokeWidth="1.1"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function BrandMark({ brand }: { brand: HeaderBrand }) {
	const href = resolveHeaderHref(brand.href, HEADER_PLACEHOLDERS.brandHref);
	const label = brand.text.trim() || HEADER_PLACEHOLDERS.brandName;

	if (brand.kind === "logo") {
		const markStyle = headerLogoMarkStyle(brand);
		const name = brand.showName || !brand.logoUrl ? (
			<span className="wp-block-header__brand-label">{label}</span>
		) : null;
		return (
			<a className="wp-block-header__brand" href={href}>
				{brand.logoUrl ? (
					<img src={brand.logoUrl} alt={brand.showName ? "" : label} style={markStyle} />
				) : (
					<span className="wp-block-header__logo-placeholder" aria-hidden="true" style={markStyle}>
						<LogoPlaceholderIcon />
					</span>
				)}
				{name}
			</a>
		);
	}

	return (
		<a className="wp-block-header__brand" href={href}>
			<span className="wp-block-header__brand-label">{label}</span>
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
						<summary>{item.label || HEADER_PLACEHOLDERS.linkLabel}</summary>
						<ul className="wp-block-header__dropdown-list">
							{item.children.map((child) => (
								<li key={child.id}>
									<a href={resolveHeaderHref(child.href, HEADER_PLACEHOLDERS.menuItemHref)}>
										{child.label || HEADER_PLACEHOLDERS.menuItemLabel}
									</a>
								</li>
							))}
						</ul>
					</details>
				) : (
					<a key={item.id} href={resolveHeaderHref(item.href, HEADER_PLACEHOLDERS.linkHref)}>
						{item.label || HEADER_PLACEHOLDERS.linkLabel}
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
					href={resolveHeaderHref(action.href, HEADER_PLACEHOLDERS.buttonHref)}
					className={
						action.style === "solid"
							? "wp-block-header__action is-solid"
							: "wp-block-header__action"
					}
					style={headerActionLookStyle(action)}
				>
					{action.label || HEADER_PLACEHOLDERS.buttonLabel}
				</a>
			))}
		</div>
	);
}

function SlotParts({
	names,
	content,
	blocks,
}: {
	names: HeaderSlotPart[];
	content: HeaderContent;
	blocks?: React.ReactNode;
}) {
	return (
		<>
			{names.map((name) => {
				if (name === "brand") return <BrandMark key="brand" brand={content.brand} />;
				if (name === "nav") return <NavLinks key="nav" items={content.nav} />;
				if (name === "blocks") return <React.Fragment key="blocks">{blocks}</React.Fragment>;
				return <ActionButtons key="actions" actions={content.actions} />;
			})}
		</>
	);
}

/**
 * Shared header chrome for canvas, preview, and publish.
 *
 * `blocks` is what the caller paints in the blocks layout's right side (the editor passes a drop
 * area, publish passes rendered child blocks). Layouts without links get no menu button at all.
 */
export function HeaderBar({
	content,
	disableLinks = false,
	blocks,
}: {
	content: HeaderContent;
	disableLinks?: boolean;
	blocks?: React.ReactNode;
}) {
	const slots = visibleHeaderSlots(content);
	const hasMenu = headerCollapsesToMenu(content.variant);
	return (
		<header
			className={headerBarClassName({ sticky: content.sticky, variant: content.variant })}
			onClick={(event) => {
				if (!disableLinks) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("a")) event.preventDefault();
			}}
		>
			<div className="wp-block-header__bar">
				<div className="wp-block-header__slot is-left">
					<SlotParts names={slots.left} content={content} blocks={blocks} />
				</div>
				<div className="wp-block-header__desktop">
					{slots.middle.length > 0 ? (
						<div className="wp-block-header__slot is-middle">
							<SlotParts names={slots.middle} content={content} blocks={blocks} />
						</div>
					) : null}
					{slots.right.length > 0 ? (
						<div className="wp-block-header__slot is-right">
							<SlotParts names={slots.right} content={content} blocks={blocks} />
						</div>
					) : null}
				</div>
			</div>
			{hasMenu ? (
				<details className="wp-block-header__mobile-panel">
					<summary className="wp-block-header__mobile-toggle" aria-label="Open menu">
						<span className="wp-block-header__burger" aria-hidden="true" />
					</summary>
					<div className="wp-block-header__mobile-body">
						<NavLinks items={content.nav} />
						<ActionButtons actions={content.actions} />
					</div>
				</details>
			) : null}
		</header>
	);
}

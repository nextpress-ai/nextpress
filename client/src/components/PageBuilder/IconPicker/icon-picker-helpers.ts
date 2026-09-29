import type { IconReference } from "@/lib/icon-indexes";

/** Which picker tab an icon belongs to (react-icons tabs are per family prefix). */
export function getStorageKey(icon: IconReference): string {
  if (icon.iconSet === "lucide") return "lucide";
  if (icon.iconSet === "svgl") return "svgl";
  if (icon.iconSet === "custom") return "custom";
  if (icon.iconSet === "react-icons") {
    const colonIdx = icon.iconName.indexOf(":");
    if (colonIdx > -1) return `react-icons:${icon.iconName.slice(0, colonIdx)}`;
  }
  return "lucide";
}

export function getInitialSearch(icon?: IconReference): string {
  if (!icon?.iconName) return "";
  const colonIdx = icon.iconName.indexOf(":");
  const raw = colonIdx > -1 ? icon.iconName.slice(colonIdx + 1) : icon.iconName;
  return raw.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function isSameIcon({
  current,
  iconSet,
  storageName,
}: {
  current?: IconReference;
  iconSet: IconReference["iconSet"];
  storageName: string;
}): boolean {
  if (!current) return false;
  return current.iconSet === iconSet && current.iconName === storageName;
}

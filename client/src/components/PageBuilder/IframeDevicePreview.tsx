import type { JSX } from "react";
import type { DeviceView } from "@shared/block-device-styles";

type IframeDevicePreviewProps = {
	device: DeviceView;
	previewUrl: string;
	refreshKey: number;
};

const deviceWidth = (device: DeviceView): string => {
	if (device === "mobile") return "390px";
	if (device === "tablet") return "768px";
	return "100%";
};

/**
 * True device preview — iframe loads the publish preview route so @media rules
 * match what visitors see. Used when editor preview mode is enabled.
 */
export function IframeDevicePreview({
	device,
	previewUrl,
	refreshKey,
}: IframeDevicePreviewProps): JSX.Element {
	const width = deviceWidth(device);
	const src = previewUrl.includes("?")
		? `${previewUrl}&embed=1`
		: `${previewUrl}?embed=1`;

	return (
		<div className="flex min-w-0 justify-center">
			<div
				className="overflow-hidden rounded-md border border-npb-border-default bg-npb-canvas-page shadow-lg transition-all duration-300 ease-in-out"
				style={{
					width,
					maxWidth: "100%",
					minHeight: device === "mobile" ? "667px" : device === "tablet" ? "900px" : "800px",
				}}
			>
				<iframe
					key={`${src}-${refreshKey}`}
					title="Page preview"
					src={src}
					className="block h-full min-h-[inherit] w-full border-0 bg-white"
					style={{ minHeight: "inherit" }}
				/>
			</div>
		</div>
	);
}

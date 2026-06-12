import React, { createContext, useContext } from "react";

export type DeviceView = "desktop" | "tablet" | "mobile";

const DeviceViewContext = createContext<DeviceView>("desktop");

type DeviceViewProviderProps = {
  device: DeviceView;
  children: React.ReactNode;
};

export function DeviceViewProvider({ device, children }: DeviceViewProviderProps) {
  return (
    <DeviceViewContext.Provider value={device}>{children}</DeviceViewContext.Provider>
  );
}

/** Active device preview mode — desktop uses base styles only. */
export function useDeviceView(): DeviceView {
  return useContext(DeviceViewContext);
}

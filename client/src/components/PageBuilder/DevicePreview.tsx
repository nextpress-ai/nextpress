import React from 'react';
import { PublishBlockStyles } from './PublishBlockStyles';
import { EDITOR_CANVAS_CONTAINER_CSS } from '@shared/publish-block-css';

interface DevicePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
}

export default function DevicePreview({ device, children }: DevicePreviewProps) {
  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          maxWidth: '390px',
          width: '100%',
          minHeight: '667px',
        };
      case 'tablet':
        return {
          maxWidth: '768px',
          width: '100%',
          minHeight: '1024px',
        };
      case 'desktop':
      default:
        return {
          width: '100%',
          minHeight: '800px',
        };
    }
  };

  return (
    <div className="flex min-w-0 justify-center">
      <div
        style={{
          ...getDeviceStyles(),
          overflowX: 'hidden',
          overflowY: 'visible',
          transition: 'all 300ms ease-in-out',
          containerType: 'inline-size',
          containerName: 'npb-canvas',
        }}
        className="transition-all duration-300 ease-in-out"
      >
        <PublishBlockStyles />
        <style dangerouslySetInnerHTML={{ __html: EDITOR_CANVAS_CONTAINER_CSS }} />
        <div
          style={{
            width: '100%',
            minWidth: 0,
            overflow: 'visible',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

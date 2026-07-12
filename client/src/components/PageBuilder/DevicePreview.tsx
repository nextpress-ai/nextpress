interface DevicePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
}

export default function DevicePreview({ device, children }: DevicePreviewProps) {
  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          maxWidth: '375px',
          minHeight: '667px',
        };
      case 'tablet':
        return {
          maxWidth: '768px',
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
    <div className="flex justify-center">
      <div 
        style={{
          ...getDeviceStyles(),
          width: device === 'desktop' ? '100%' : undefined,
          overflowX: 'hidden',
          overflowY: 'visible',
          transition: 'all 300ms ease-in-out',
        }}
        className="transition-all duration-300 ease-in-out"
      >
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
import { useEffect, useRef } from 'react';
import './index.css';

interface AdContainerProps {
  /**
   * PropellerAds zone ID
   */
  zoneId: string;
  /**
   * Ad width (optional, defaults to auto)
   */
  width?: number | string;
  /**
   * Ad height (optional, defaults to auto)
   */
  height?: number | string;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * PropellerAds Ad Container component
 *
 * @example
 * <AdContainer zoneId="1234567" width="300" height="250" />
 */
const AdContainer = ({
  zoneId,
  width = '100%',
  height = 'auto',
  className = '',
}: AdContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create script element for PropellerAds
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = `//thubanoa.com/${zoneId}/invoke.js`;

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup script when component unmounts
      if (containerRef.current && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [zoneId]);

  return (
    <div className={`ad-container ${className}`}>
      <div
        ref={containerRef}
        id={`propeller-ad-${zoneId}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: '100px',
        }}
      />
    </div>
  );
};

export default AdContainer;

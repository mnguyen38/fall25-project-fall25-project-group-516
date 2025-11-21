import { useEffect, useRef } from 'react';
import './index.css';

interface AdContainerProps {
  /**
   * AdSterra ad key
   */
  adKey: string;
  /**
   * Ad width (defaults to 300)
   */
  width?: number;
  /**
   * Ad height (defaults to 250)
   */
  height?: number;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * AdSterra Ad Container component for banner ads
 */
const AdContainer = ({ adKey, width = 300, height = 250, className = '' }: AdContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create atOptions configuration script
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `
      atOptions = {
        'key': '${adKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    `;

    // Create the invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;

    if (containerRef.current) {
      containerRef.current.appendChild(configScript);
      containerRef.current.appendChild(invokeScript);
    }

    return () => {
      // Cleanup scripts when component unmounts
      if (containerRef.current) {
        if (configScript.parentNode) {
          configScript.parentNode.removeChild(configScript);
        }
        if (invokeScript.parentNode) {
          invokeScript.parentNode.removeChild(invokeScript);
        }
      }
    };
  }, [adKey, width, height]);

  return (
    <div className={`ad-container ${className}`}>
      <div
        ref={containerRef}
        id={`adsterra-ad-${adKey}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          minHeight: '100px',
        }}
      />
    </div>
  );
};

export default AdContainer;

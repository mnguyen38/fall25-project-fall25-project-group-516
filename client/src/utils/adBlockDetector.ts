/**
 * Detects if an ad blocker is active in the user's browser
 * @returns Promise that resolves to true if ad blocker is detected, false otherwise
 */
export const detectAdBlock = async (): Promise<boolean> => {
  return new Promise(resolve => {
    // Create a bait element that ad blockers typically target
    const bait = document.createElement('div');
    bait.className = 'ad adsbox doubleclick ad-placement carbon-ads';
    bait.style.position = 'absolute';
    bait.style.top = '-1px';
    bait.style.left = '-1px';
    bait.style.width = '1px';
    bait.style.height = '1px';
    bait.innerHTML = '&nbsp;';

    document.body.appendChild(bait);

    // Wait a bit for ad blockers to process
    setTimeout(() => {
      // Check if the element is hidden or removed
      const isBlocked =
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        bait.offsetWidth === 0 ||
        window.getComputedStyle(bait).display === 'none' ||
        window.getComputedStyle(bait).visibility === 'hidden';

      // Clean up
      document.body.removeChild(bait);

      resolve(isBlocked);
    }, 100);
  });
};

/**
 * Alternative detection method using fetch request
 * Tries to fetch a common ad script that would be blocked
 */
export const detectAdBlockFetch = async (): Promise<boolean> => {
  try {
    // Try to fetch a common ad-related resource
    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return false;
  } catch {
    return true;
  }
};

/**
 * Combined detection using multiple methods for better accuracy
 */
export const detectAdBlockCombined = async (): Promise<boolean> => {
  const [elementBlocked, fetchBlocked] = await Promise.all([detectAdBlock(), detectAdBlockFetch()]);

  // Return true if either method detects blocking
  return elementBlocked || fetchBlocked;
};

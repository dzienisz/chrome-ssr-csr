/**
 * Device & Context Detector
 * Collects device, browser, and connection information
 */

/**
 * Detect device type based on screen width
 */
function getDeviceType() {
  const width = window.innerWidth;
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Get screen information
 */
function getScreenInfo() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type || 'unknown'
  };
}

/**
 * Detect if device has touch capability
 */
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get browser information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let engineName = 'Unknown';
  
  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Gecko';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'WebKit';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    browserName = 'Opera';
    browserVersion = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  }
  
  return {
    name: browserName,
    version: browserVersion,
    engine: engineName,
    userAgent: ua
  };
}

/**
 * Get connection information
 * Uses Network Information API if available
 */
function getConnectionInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null, // Mbps
    rtt: connection.rtt || null, // milliseconds
    saveData: connection.saveData || false
  };
}

/**
 * Get timezone and language
 */
function getLocaleInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'unknown',
    languages: navigator.languages || []
  };
}

/**
 * Detect if user has reduced motion preference
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect if user prefers dark mode
 */
function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get memory information (if available)
 */
function getMemoryInfo() {
  if (performance.memory) {
    return {
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize
    };
  }
  return null;
}

/**
 * Get hardware concurrency (CPU cores)
 */
function getHardwareConcurrency() {
  return navigator.hardwareConcurrency || null;
}

/**
 * Collect all device and context information
 */
function collectDeviceInfo() {
  console.log('[Device] Collecting device information...');
  
  const deviceInfo = {
    deviceType: getDeviceType(),
    screen: getScreenInfo(),
    isTouchDevice: isTouchDevice(),
    browser: getBrowserInfo(),
    connection: getConnectionInfo(),
    locale: getLocaleInfo(),
    preferences: {
      reducedMotion: prefersReducedMotion(),
      darkMode: prefersDarkMode()
    },
    hardware: {
      cpuCores: getHardwareConcurrency(),
      memory: getMemoryInfo()
    }
  };
  
  console.log('[Device] Device info collected:', deviceInfo);
  return deviceInfo;
}

/**
 * Get simplified device info for telemetry
 * (removes sensitive/detailed information)
 */
function getDeviceInfoForTelemetry() {
  const fullInfo = collectDeviceInfo();
  
  return {
    deviceType: fullInfo.deviceType,
    screenWidth: fullInfo.screen.width,
    screenHeight: fullInfo.screen.height,
    devicePixelRatio: fullInfo.screen.devicePixelRatio,
    isTouchDevice: fullInfo.isTouchDevice,
    browserName: fullInfo.browser.name,
    browserVersion: fullInfo.browser.version,
    engineName: fullInfo.browser.engine,
    connectionType: fullInfo.connection.type,
    effectiveType: fullInfo.connection.effectiveType,
    downlink: fullInfo.connection.downlink,
    rtt: fullInfo.connection.rtt,
    saveData: fullInfo.connection.saveData,
    timezone: fullInfo.locale.timezone,
    language: fullInfo.locale.language,
    prefersReducedMotion: fullInfo.preferences.reducedMotion,
    prefersDarkMode: fullInfo.preferences.darkMode,
    cpuCores: fullInfo.hardware.cpuCores
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.collectDeviceInfo = collectDeviceInfo;
  window.getDeviceInfoForTelemetry = getDeviceInfoForTelemetry;
}

// src/utils/envRuntime.ts
export function isGeminiPreview(): boolean {
  try {
    const isAiStudio = window.location.hostname.includes('aistudio.google.com');
    // Accessing window.top can throw a cross-origin error in sandboxed iframes,
    // which is a strong signal we are in a preview environment.
    const isCrossOriginIframe = window.self !== window.top;
    
    return isAiStudio || isCrossOriginIframe;
  } catch (e) {
    // If an error is thrown, we are in a cross-origin iframe.
    return true;
  }
}

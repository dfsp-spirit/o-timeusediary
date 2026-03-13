// Global state
let isMobile = window.innerWidth < 1440;
let lastBreakpointState = isMobile;
let isReloading = false; // Prevent multiple reloads

// Get current mobile state
export function getIsMobile() {
    return isMobile;
}
// Make getIsMobile available globally
window.getIsMobile = getIsMobile;

// Update function
export function updateIsMobile() {
    if (isReloading) return false;
    
    const newIsMobile = window.innerWidth < 1440;
    const breakpointChanged = newIsMobile !== lastBreakpointState;
    
    if (breakpointChanged) {
        isReloading = true;
        // Save timeline state before reloading so it can be restored afterwards
        if (window.timelineManager) {
            try {
                const state = {
                    activities: window.timelineManager.activities,
                    currentIndex: window.timelineManager.currentIndex
                };
                sessionStorage.setItem('timelineManagerState', JSON.stringify(state));
            } catch (e) {
                console.warn('Could not save timeline state to sessionStorage:', e);
            }
        }
        window.location.reload();
        return false; // Won't actually reach this point due to reload
    }
    
    isMobile = newIsMobile;
    lastBreakpointState = newIsMobile;
    return false;
}

// Initialize immediately
updateIsMobile();

export { isMobile };

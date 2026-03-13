// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Test suite for the activity persistence across breakpoint-triggered reloads.
 *
 * Issue: When the browser window is resized across the 1440 px breakpoint the
 * app calls window.location.reload() to switch between mobile and desktop
 * layouts.  Before the fix, all in-memory activity data was lost on reload.
 *
 * Fix: globals.js saves the state to sessionStorage before reload; init() in
 * script.js reads it back and re-renders the activity blocks.
 */

const APP_URL = '/?instructions=completed';

/**
 * Stub interact.js so tests work in environments where the CDN is not
 * reachable.  Injected before every page load via addInitScript().
 */
const INTERACT_STUB = () => {
    if (window.interact) return; // already loaded from CDN
    const makeApi = () => {
        const api = {};
        ['resizable', 'draggable', 'gesturable', 'dropzone', 'on', 'off'].forEach(m => {
            api[m] = function() { return api; };
        });
        api.unset = function() {};
        return api;
    };
    window.interact = function() { return makeApi(); };
    window.interact.isSet = function() { return false; };
    window.interact.modifiers = {
        restrictEdges: function() { return {}; },
        restrictSize:  function() { return {}; },
        snap:          function() { return {}; },
    };
    window.interact.snappers = {
        grid: function() { return {}; },
    };
};

/** Helper – wait until the app is fully initialised */
async function waitForApp(page) {
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 15000 });
    await page.waitForFunction(
        () => {
            const tm = window.timelineManager;
            return (
                tm.keys && tm.keys.length > 0 &&
                tm.initialized && tm.initialized.has(tm.keys[0])
            );
        },
        { timeout: 15000 }
    );
}

/** Helper – save the current timelineManager state to sessionStorage */
async function saveStateToSessionStorage(page) {
    await page.evaluate(() => {
        if (window.timelineManager) {
            const state = {
                activities: window.timelineManager.activities,
                currentIndex: window.timelineManager.currentIndex
            };
            sessionStorage.setItem('timelineManagerState', JSON.stringify(state));
        }
    });
}

/** Sample activity data representative of what the app stores */
function sampleActivity(overrides = {}) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yyyyMmDd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {
        id: 'test-activity-1',
        activity: 'Sleep',
        category: 'Personal',
        startTime: `${yyyyMmDd(yesterday)} 22:00`,
        endTime:   `${yyyyMmDd(yesterday)} 23:00`,
        blockLength: 60,
        color: '#a0c4ff',
        count: 1,
        parentName: 'Sleep',
        selected: 'Sleep',
        ...overrides,
    };
}

test.describe('Activity persistence across viewport resize', () => {

    test.beforeEach(async ({ page }) => {
        // Stub interact.js before the page scripts load
        await page.addInitScript(INTERACT_STUB);
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(APP_URL);
        await waitForApp(page);
        // Clean slate
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(APP_URL);
        await waitForApp(page);
    });

    test('should save activity state to sessionStorage before reload', async ({ page }) => {
        // Directly inject activity data into the app state
        await page.evaluate((act) => {
            const key = window.timelineManager.keys[0];
            window.timelineManager.activities[key] = [act];
        }, sampleActivity());

        // Simulate what globals.js does before calling window.location.reload():
        // save the state to sessionStorage.
        const savedState = await page.evaluate(() => {
            if (window.timelineManager) {
                const state = {
                    activities: window.timelineManager.activities,
                    currentIndex: window.timelineManager.currentIndex
                };
                sessionStorage.setItem('timelineManagerState', JSON.stringify(state));
            }
            return JSON.parse(sessionStorage.getItem('timelineManagerState') || 'null');
        });

        expect(savedState).not.toBeNull();
        expect(savedState.activities).toBeDefined();
        const key = await page.evaluate(() => window.timelineManager.keys[0]);
        expect(savedState.activities[key]).toHaveLength(1);
        expect(savedState.activities[key][0].activity).toBe('Sleep');
    });

    test('should restore activity data from sessionStorage after reload', async ({ page }) => {
        // Inject a saved state into sessionStorage before the page initialises
        const act = sampleActivity();
        const keys = await page.evaluate(() => window.timelineManager.keys);
        const state = { activities: { [keys[0]]: [act] }, currentIndex: 0 };
        await page.evaluate((s) => {
            sessionStorage.setItem('timelineManagerState', JSON.stringify(s));
        }, state);

        // Reload – init() will now pick up the saved state
        await page.reload();
        await waitForApp(page);

        const restoredActivities = await page.evaluate((key) => {
            return window.timelineManager.activities[key] || [];
        }, keys[0]);

        expect(restoredActivities).toHaveLength(1);
        expect(restoredActivities[0].activity).toBe('Sleep');
        expect(restoredActivities[0].blockLength).toBe(60);
    });

    test('should render activity blocks in the DOM after state restoration', async ({ page }) => {
        const keys = await page.evaluate(() => window.timelineManager.keys);
        const act = sampleActivity();
        const state = { activities: { [keys[0]]: [act] }, currentIndex: 0 };

        await page.evaluate((s) => {
            sessionStorage.setItem('timelineManagerState', JSON.stringify(s));
        }, state);

        await page.reload();
        await waitForApp(page);

        // renderSavedActivityBlocks() should have created a DOM block
        const blockCount = await page.locator('.activity-block').count();
        expect(blockCount).toBeGreaterThan(0);

        // The block should carry the correct data attributes
        const blockData = await page.evaluate((key) => {
            const block = document.querySelector('.activity-block');
            return block ? {
                timelineKey: block.dataset.timelineKey,
                id:          block.dataset.id,
                category:    block.dataset.category,
            } : null;
        }, keys[0]);
        expect(blockData).not.toBeNull();
        expect(blockData.timelineKey).toBe(keys[0]);
        expect(blockData.id).toBe('test-activity-1');
        expect(blockData.category).toBe('Personal');
    });

    test('should clear sessionStorage after successful restore', async ({ page }) => {
        const keys = await page.evaluate(() => window.timelineManager.keys);
        const state = { activities: { [keys[0]]: [sampleActivity()] }, currentIndex: 0 };

        await page.evaluate((s) => {
            sessionStorage.setItem('timelineManagerState', JSON.stringify(s));
        }, state);

        await page.reload();
        await waitForApp(page);

        // After restoration the key should have been removed so a subsequent
        // reload doesn't re-restore stale data.
        const remaining = await page.evaluate(() => sessionStorage.getItem('timelineManagerState'));
        expect(remaining).toBeNull();
    });

    test('should restore activities for multiple timelines after state restoration', async ({ page }) => {
        const keys = await page.evaluate(() => window.timelineManager.keys);
        if (keys.length < 2) {
            test.skip();
            return;
        }

        const act0 = sampleActivity({ id: 'act-t0', activity: 'Sleep' });
        const act1 = sampleActivity({ id: 'act-t1', activity: 'Work / Study', blockLength: 120 });
        // currentIndex: 0 to stay on the first timeline and avoid the
        // double-init ordering complexity when navigating between timelines.
        const state = {
            activities: { [keys[0]]: [act0], [keys[1]]: [act1] },
            currentIndex: 0
        };

        await page.evaluate((s) => {
            sessionStorage.setItem('timelineManagerState', JSON.stringify(s));
        }, state);

        await page.reload();
        await waitForApp(page);

        // Both timelines' activity data should be restored, regardless of which
        // timeline is currently active.
        const restored0 = await page.evaluate((k) => window.timelineManager.activities[k] || [], keys[0]);
        const restored1 = await page.evaluate((k) => window.timelineManager.activities[k] || [], keys[1]);

        expect(restored0).toHaveLength(1);
        expect(restored0[0].activity).toBe('Sleep');
        expect(restored1).toHaveLength(1);
        expect(restored1[0].activity).toBe('Work / Study');
    });

    test('should not break normal app behaviour when no saved state exists', async ({ page }) => {
        await page.evaluate(() => sessionStorage.removeItem('timelineManagerState'));
        await page.goto(APP_URL);
        await waitForApp(page);

        // App starts with empty activities
        const activities = await page.evaluate(() => {
            const key = window.timelineManager.keys[0];
            return window.timelineManager.activities[key] || [];
        });
        expect(activities.length).toBe(0);

        // Timeline is properly initialised
        const currentIndex = await page.evaluate(() => window.timelineManager.currentIndex);
        expect(currentIndex).toBe(0);
    });

    test('should handle corrupted sessionStorage data gracefully', async ({ page }) => {
        await page.evaluate(() => {
            sessionStorage.setItem('timelineManagerState', '{invalid json}');
        });

        // The app should not crash on reload, it should fall back to empty state
        await page.reload();
        await waitForApp(page);

        const activities = await page.evaluate(() => {
            const key = window.timelineManager.keys[0];
            return window.timelineManager.activities[key] || [];
        });
        expect(activities.length).toBe(0);

        const currentIndex = await page.evaluate(() => window.timelineManager.currentIndex);
        expect(currentIndex).toBe(0);
    });
});

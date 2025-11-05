const { test, expect } = require('@playwright/test');

/// To run this test, first set up Playwright in your project if you haven't already:
/// npm init playwright@latest  // Answer the prompts carefully, make sure to install system dependencies
///
///
/// Then run, e.g. one of the following commands:
/// npx playwright test
/// npx playwright test --project=chromium


test.describe('Timeline Basic Flow', () => {
  test('should add activity to first timeline and navigate to next', async ({ page }) => {
    // 1. Go to app
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Verify we're on the first timeline (primary activities)
    await expect(page.locator('.timeline-title')).toContainText("Primary activity");

    // 4. Add a primary activity (e.g., Sleeping)
    await page.click('.activity-button:has-text("Sleeping")');

    // Now click on the timeline to place the activity
    await page.click('.timeline[data-active="true"]');

    // 5. Verify activity was added to timeline
    await page.waitForSelector('.activity-block');
    const activityBlock = page.locator('.activity-block');
    await expect(activityBlock).toBeVisible();

    // 6. Click Next button to go to Device timeline
    const nextButton = page.locator('#nextBtn');
    await nextButton.click();

    // 7. Wait for transition and verify we're on Device timeline
    await page.waitForTimeout(1000);
    await expect(page.locator('.timeline-title')).toContainText("Device");

    // 8. Verify we can add multiple-choice activities on Device timeline
    await page.click('.floating-add-button');
    await page.waitForSelector('#activitiesModal', { state: 'visible' });

    // 9. Select multiple devices
    await page.click('.activity-button:has-text("Computer")');
    await page.click('.activity-button:has-text("Tablet")');

    // 10. Place on timeline
    await page.click('.timeline[data-active="true"]');

    // 11. Verify multiple-choice activity has gradient background
    await page.waitForSelector('.activity-block');
    const deviceActivity = page.locator('.activity-block').last();
    const background = await deviceActivity.evaluate((el) => {
      return window.getComputedStyle(el).background;
    });

    // This should pass now that you fixed the multiple-choice gradient bug
    expect(background).toContain('linear-gradient');
  });
});
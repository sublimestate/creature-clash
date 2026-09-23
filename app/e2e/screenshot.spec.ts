import { test, expect } from '@playwright/test';

test('take a screenshot during an attack', async ({ page }) => {
  // Go to home, start game
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');
  
  await page.getByText('Start New Game').click();
  await page.getByText('Yes, start over').click();

  await page.getByPlaceholder('Trainer Name').fill('Tester');
  await page.getByText('Continue').click();

  // Pick first two
  const buttons = page.locator('div[role="button"]:has-text("Pick")');
  await buttons.nth(0).click();
  await buttons.nth(1).click();
  await page.getByText('Confirm Team').click();

  await page.getByText('Finish').click();

  // Wait for home screen
  await expect(page.getByText('Continue Adventure')).toBeVisible();

  // Click continue adventure
  await page.getByText('Continue Adventure').click();

  // Click stage 1
  await page.getByText('Backyard Tussle').click();

  // Wait for preview
  await expect(page.getByText('FIGHT')).toBeVisible();
  
  // Fight!
  await page.getByText('FIGHT').click();

  // It should be in battle now. Wait for the hitEffectText to appear.
  // Wait a little bit for an attack to happen
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/battle-screenshot.png' });
});

import { expect, test } from '@playwright/test';
import { buildSave, seedSave, STRONG_TEAM } from './save';

// Fresh browser context = empty localStorage = new player. The tabs layout
// must redirect to onboarding, and the full 3-step flow must land on home.
test('new player is routed through onboarding to the home screen', async ({ page }) => {
  await page.goto('/');

  // Step 1: trainer name. First assertion gets extra time — Metro may still
  // be bundling on the very first request.
  await expect(page.getByText('What do they call you?')).toBeVisible({
    timeout: 90_000,
  });
  await page.getByPlaceholder('e.g. Sam, Reggie, Toast').fill('Tester');
  await page.getByText('Continue', { exact: true }).click();

  // Step 2: pick 2 of 5 starters.
  await expect(page.getByText('Choose two pets')).toBeVisible();
  await page.getByText('Tabby', { exact: true }).click();
  await page.getByText('Pugling', { exact: true }).click();
  await expect(page.getByText('2 / 2 chosen')).toBeVisible();
  await page.getByText('Continue', { exact: true }).click();

  // Step 3: nicknames (optional), then begin.
  await expect(page.getByText('Welcome, Tester.')).toBeVisible();
  await page.getByPlaceholder('Name your tabby').fill('Mittens');
  await page.getByText('Begin Adventure').click();

  // Landed on home with a usable save; header greets the new trainer.
  await expect(page.getByText('Continue Adventure')).toBeVisible();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
});

test('returning player with a save skips onboarding', async ({ page }) => {
  await seedSave(page, buildSave(STRONG_TEAM, { displayName: 'Veteran' }));
  await page.goto('/');

  await expect(page.getByText('Continue Adventure')).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText('What do they call you?')).not.toBeVisible();
});

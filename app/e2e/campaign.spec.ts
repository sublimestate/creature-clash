import { expect, test, type Page } from '@playwright/test';
import { buildSave, seedSave, STRONG_TEAM } from './save';

// Cranks playback to 4x (2x is the default; the button cycles).
async function setMaxSpeed(page: Page) {
  await page.getByText('2×', { exact: true }).click();
  await page.getByText('3×', { exact: true }).click();
}

// expo-router keeps the previous screen mounted (hidden) in the DOM after
// replace(), so plain getByText can resolve to a stale duplicate. Filter to
// the copy that's actually on screen.
function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

test('player wins the first stage, earns rewards, and unlocks the next', async ({ page }) => {
  await seedSave(page, buildSave(STRONG_TEAM));
  await page.goto('/battle');

  // Campaign list → stage → preview → fight.
  await page.getByText('Backyard Tussle').click({ timeout: 90_000 });
  await page.getByText('FIGHT', { exact: true }).click();

  await setMaxSpeed(page);
  // exact: true — the battle log can contain a "Victory!" line too.
  await expect(page.getByText('VICTORY!', { exact: true })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText('+50 gold, +80 XP')).toBeVisible();

  // Back on the campaign list: stage 1 starred, stage 2 no longer "???".
  await page.getByText('Continue', { exact: true }).click();
  await expect(onScreen(page, 'Garden Hose Standoff')).toBeVisible();
  await expect(onScreen(page, /★/)).toBeVisible();
});

test('full chapter 1 playthrough unlocks chapter 2', async ({ page }) => {
  test.setTimeout(600_000);
  await seedSave(page, buildSave(STRONG_TEAM));

  const chapterOne = ['c1s1', 'c1s2', 'c1s3', 'c1s4', 'c1s5'];
  for (const stageId of chapterOne) {
    await page.goto(`/preview/${stageId}`);
    await page.getByText('FIGHT', { exact: true }).click({ timeout: 90_000 });
    await setMaxSpeed(page);
    await expect(page.getByText('VICTORY!', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
    await page.getByText('Continue', { exact: true }).click();
    await expect(onScreen(page, 'Campaign')).toBeVisible();
  }

  // c2s1 unlocks only when c1s5 is completed; locked stages render as "???".
  await expect(onScreen(page, 'Alley Skirmish')).toBeVisible();
});

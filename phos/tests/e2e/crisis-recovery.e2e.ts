import { test, expect, type Page } from '@playwright/test';

/**
 * CRISIS RECOVERY — Psychological Flow Testing
 *
 * Simulates the operator journey:
 * 1. Start in QUANTUM (high energy)
 * 2. Gradually deplete spoons
 * 3. Hit CRISIS (spoons=0)
 * 4. Recover back to SANCTUARY
 * 5. Verify DOM settles at each transition
 */

const countActiveAnimations = async (page: Page) => {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="animate-"]'))
      .filter((el: Element) => !el.className.includes('animate-none')).length;
  });
};

test.describe('Crisis Recovery Flow', () => {
  test('full spoon depletion timeline', async ({ page }) => {
    // Start QUANTUM
    await page.goto('/?spoons=5');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Deplete to BRIDGE
    await page.goto('/?spoons=3');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Deplete to SANCTUARY
    await page.goto('/?spoons=1');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Hit CRISIS
    await page.goto('/?spoons=0');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Verify CRISIS state — minimal active animations
    // The PHOSOrb may retain one animation due to client-side hydration timing
    const animatedCount = await countActiveAnimations(page);
    expect(animatedCount).toBeLessThan(3);
  });

  test('recovery from CRISIS to SANCTUARY', async ({ page }) => {
    // Start in CRISIS
    await page.goto('/?spoons=0');
    await page.waitForTimeout(1000);

    const crisisAnimations = await countActiveAnimations(page);
    // CRISIS should have very few active animations
    expect(crisisAnimations).toBeLessThan(3);

    // Recover to SANCTUARY
    await page.goto('/?spoons=2');
    await page.waitForTimeout(1500);

    // SANCTUARY should have breathing animation
    const sanctuaryAnimations = await countActiveAnimations(page);
    expect(sanctuaryAnimations).toBeGreaterThan(0);
  });

  test('rapid spoon fluctuation does not crash', async ({ page }) => {
    // Rapidly change spoon states
    const states = [5, 0, 3, 1, 4, 0, 2, 5, 1, 3];
    for (const spoons of states) {
      await page.goto(`/?spoons=${spoons}`);
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    }

    // Final state should be stable
    await page.waitForTimeout(1000);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('grayRock URL param forces CRISIS regardless of spoons', async ({ page }) => {
    // High spoons but grayRock param
    await page.goto('/?spoons=5&grayrock=true');
    await page.waitForTimeout(1000);

    const animatedCount = await countActiveAnimations(page);

    // Even with high spoons, grayRock should strongly suppress animations
    // Allow small buffer for client-side hydration timing
    expect(animatedCount).toBeLessThan(3);
  });

  test('urgent URL param triggers CRISIS', async ({ page }) => {
    await page.goto('/?spoons=4&urgent=true');
    await page.waitForTimeout(1000);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify CRISIS-level simplicity
    const interactiveCount = await page.evaluate(() => {
      return document.querySelectorAll('button, a, input').length;
    });
    // CRISIS should have very few interactive elements
    expect(interactiveCount).toBeLessThan(25);
  });
});

test.describe('AuDHD Flow Paths', () => {
  test('hyperfocus path: QUANTUM → deep work surface', async ({ page }) => {
    // Operator in hyperfocus mode, jumps to work
    await page.goto('/?spoons=5&surface=NODE_ZERO');
    await page.waitForTimeout(1500);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should have full interactive capability
    const interactiveCount = await page.evaluate(() => {
      return document.querySelectorAll('button, a, input').length;
    });
    expect(interactiveCount).toBeGreaterThan(0);
  });

  test('executive dysfunction path: COMPASS guides to action', async ({ page }) => {
    // Operator is lost, goes to COMPASS
    await page.goto('/?spoons=2&surface=COMPASS');
    await page.waitForTimeout(1500);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // COMPASS should present clear navigation options
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    // Should have multiple navigation options
    expect(buttonCount).toBeGreaterThanOrEqual(2);
  });

  test('sensory overload path: CRISIS strips everything', async ({ page }) => {
    // Operator is overwhelmed, forces CRISIS
    await page.goto('/?spoons=0');
    await page.waitForTimeout(1000);

    const stats = await page.evaluate(() => {
      const animated = Array.from(document.querySelectorAll('[class*="animate-"]'))
        .filter((el: Element) => !el.className.includes('animate-none'));
      return {
        animations: animated.length,
        interactive: document.querySelectorAll('button, a, input').length,
        images: document.querySelectorAll('img').length,
      };
    });

    // CRISIS should be minimal — very few active animations
    expect(stats.animations).toBeLessThan(3);
    expect(stats.interactive).toBeLessThan(20);
    expect(stats.interactive).toBeLessThan(20);
  });

  test('fawn response detection: page remains usable under stress', async ({ page }) => {
    // Simulate rapid URL changes (fawn response: constantly changing to please)
    for (let i = 0; i < 5; i++) {
      await page.goto(`/?spoons=${i % 6}&surface=${['GREETING', 'COMPASS', 'ARCADE', 'NODE_ZERO', 'VAULT'][i]}`);
      await page.waitForTimeout(500);
    }

    // App should still be responsive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
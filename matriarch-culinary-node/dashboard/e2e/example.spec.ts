import { test, expect } from '@playwright/test';

test('should display context toggle', async ({ page }) => {
  await page.goto('http://localhost:5173'); // Assuming Vite default port

  const familyButton = page.getByRole('button', { name: 'FAMILY' });
  await expect(familyButton).toBeVisible();

  const mechanicsButton = page.getByRole('button', { name: 'MECHANICS' });
  await expect(mechanicsButton).toBeVisible();
});

test('should switch context on button click', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const familyButton = page.getByRole('button', { name: 'FAMILY' });
  const mechanicsButton = page.getByRole('button', { name: 'MECHANICS' });

  // Initial state should be 'home' (FAMILY)
  await expect(familyButton).toHaveAttribute('data-active', 'true');
  await expect(mechanicsButton).toHaveAttribute('data-active', 'false');

  // Click MECHANICS button
  await mechanicsButton.click();
  await expect(familyButton).toHaveAttribute('data-active', 'false');
  await expect(mechanicsButton).toHaveAttribute('data-active', 'true');

  // Click FAMILY button back
  await familyButton.click();
  await expect(familyButton).toHaveAttribute('data-active', 'true');
  await expect(mechanicsButton).toHaveAttribute('data-active', 'false');
});
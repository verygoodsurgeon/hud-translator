import { test, expect } from '@playwright/test';

// 데모(mock) 엔진으로 시작 → 자막 표시 → 설정 토글 반영을 확인
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const s = {
      state: { s: { engine: 'mock', privacyAck: true, latencyOverlay: true } },
      version: 0,
    };
    localStorage.setItem('hudtr.settings.v1', JSON.stringify(s));
  });
});

test('mock session shows original and translation subtitles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('status')).toHaveText('대기');
  await page.getByTestId('rec').click();
  await expect(page.getByTestId('hud-trans')).toContainText('외상 처치실이 어디인가요?', { timeout: 5000 });
  await expect(page.getByTestId('hud-orig')).toContainText('Where is the trauma bay?');
  await expect(page.getByTestId('latency')).toContainText('첫 원문');
  await page.getByTestId('rec').click();
  await expect(page.getByTestId('status')).toHaveText('대기');
});

test('settings toggles apply to HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-original').uncheck();
  await page.getByTestId('close-settings').click();
  await page.getByTestId('rec').click();
  await expect(page.getByTestId('hud-trans')).toContainText('외상', { timeout: 5000 });
  await expect(page.getByTestId('hud-orig')).toHaveCount(0);
});

test('conversation mode renders two halves', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '대화' }).click();
  await page.getByTestId('rec').click();
  await expect(page.getByTestId('conv')).toContainText('There is abdominal tenderness.', { timeout: 8000 });
});

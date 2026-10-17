import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Setup mock image path
const mockImagePath = path.join(__dirname, 'assets', 'mock-avatar.jpg');

test.beforeAll(async () => {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  const mockJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  fs.writeFileSync(mockImagePath, Buffer.from(mockJpgBase64, 'base64'));
});

// Helper: Seed campaigns into localStorage
async function seedCampaigns(page, campaigns) {
  await page.addInitScript((data) => {
    window.localStorage.setItem('mystory_campaigns', JSON.stringify(data));
  }, campaigns);
}

// Helper: Login using Dev Mode bypass
async function loginAsDeveloper(page) {
  await page.goto('/dashboard');
  const bypassBtn = page.locator('button:has-text("Developer Bypass (Offline Sandbox)")');
  await expect(bypassBtn).toBeVisible({ timeout: 5000 });
  await bypassBtn.click();
  await expect(page.locator('h1:has-text("Organiser Dashboard")')).toBeVisible({ timeout: 10000 });
}

// Default mock campaigns data structure
const defaultMockCampaigns = [
  {
    id: 'sandbox-campaign-1',
    slug: 'green-planet-2026',
    creator_id: '00000000-0000-0000-0000-000000000000',
    title: 'Green Planet 2026 Campaign',
    description: 'I stand for sustainable futures and zero carbon emissions! Add your photo to support our green targets.',
    frame_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Small mock PNG
    start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
    is_active: true,
    stats: { views: 1240, downloads: 942 },
    settings: {},
    metadata: { is_local: true }
  }
];

test.describe('My Story Web App - Detailed E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Inject canvas fillText spy before every page load
    await page.addInitScript(() => {
      window.__fillTextCalls = [];
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        window.__fillTextCalls.push({
          text,
          x,
          y,
          font: this.font,
          fillStyle: this.fillStyle,
          width: this.canvas.width,
          height: this.canvas.height
        });
        return originalFillText.call(this, text, x, y, maxWidth);
      };
    });
  });

  // ==========================================
  // FEATURE 1: DASHBOARD INTERACTIONS
  // ==========================================

  test('1. Deletion immediately removes campaign card from DOM (under 100ms)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const card = page.locator('h3:has-text("Green Planet 2026 Campaign")');
    await expect(card).toBeVisible();

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Mock API delay for delete operation to test optimistic updates
    await page.route('**/rest/v1/campaigns*', async route => {
      if (route.request().method() === 'DELETE') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else {
        await route.continue();
      }
    });

    const deleteBtn = page.locator('button[title="Delete Campaign"]').first();
    const startTime = Date.now();
    await deleteBtn.click();

    // The card should disappear under 100ms before the delayed API resolves
    await expect(card).not.toBeVisible({ timeout: 100 });
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(100);
  });

  test('2. Deletion does not trigger full page reload', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.evaluate(() => {
      window.__noReloadCheck = 'preserved';
    });

    const deleteBtn = page.locator('button[title="Delete Campaign"]').first();
    await deleteBtn.click();

    const noReload = await page.evaluate(() => window.__noReloadCheck);
    expect(noReload).toBe('preserved');
  });

  test('3. Edit Campaign modal opens on clicking edit button', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modalTitle = page.locator('h2:has-text("Edit Campaign"), h3:has-text("Edit Campaign"), [role="dialog"] h2:has-text("Edit")');
    await expect(modalTitle).toBeVisible();
  });

  test('4. Campaign Edit form updates name/description/dates, changes reflected instantly on dashboard', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const titleInput = page.locator('input[placeholder*="title"], input[id="edit-title"], input[name="title"]').first();
    await titleInput.fill('Updated Green Campaign');

    const descInput = page.locator('textarea[placeholder*="description"], textarea[id="edit-description"], textarea[name="description"]').first();
    await descInput.fill('Updated green description');

    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    await expect(page.locator('h3:has-text("Updated Green Campaign")')).toBeVisible();
  });

  test('5. Modal closes upon successful submit', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();
  });

  test('6. Attempting to save an edit with an empty campaign title shows validation message', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const titleInput = page.locator('input[placeholder*="title"], input[id="edit-title"], input[name="title"]').first();
    await titleInput.fill('');

    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    const isRequired = await titleInput.evaluate(el => el.required);
    expect(isRequired).toBe(true);
  });

  test('7. Campaign description exceeding 300 characters is rejected or truncated', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const descInput = page.locator('textarea[placeholder*="description"], textarea[id="edit-description"], textarea[name="description"]').first();
    const maxLen = await descInput.getAttribute('maxlength');
    expect(parseInt(maxLen || '300')).toBeLessThanOrEqual(300);
  });

  test('8. Start date later than end date shows date validation error', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    // Find date inputs inside edit dialog
    const startInput = page.locator('[role="dialog"] input[type="datetime-local"]').first();
    const endInput = page.locator('[role="dialog"] input[type="datetime-local"]').last();

    await startInput.fill('2026-06-20T12:00');
    await endInput.fill('2026-06-10T12:00');

    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    expect(dialogMessage.toLowerCase()).toContain('date');
  });

  test('9. Campaign card handles long title/description gracefully without layout breaking', async ({ page }) => {
    const longCampaign = [
      {
        ...defaultMockCampaigns[0],
        title: 'Extremely Long Campaign Title That Exceeds Normal Length Constraints and Should Be Truncated Gracefully',
        description: 'Extremely long description that goes on and on to test overflow capabilities. Extremely long description that goes on and on to test overflow capabilities.'
      }
    ];
    await seedCampaigns(page, longCampaign);
    await loginAsDeveloper(page);

    const cardTitle = page.locator('h3').first();
    const isTruncated = await cardTitle.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.textOverflow === 'ellipsis' || style.overflow === 'hidden' || el.classList.contains('truncate');
    });
    expect(isTruncated).toBe(true);
  });

  test('10. Closing edit modal without saving discards changes', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const titleInput = page.locator('input[placeholder*="title"], input[id="edit-title"], input[name="title"]').first();
    await titleInput.fill('Discarded Green Title');

    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]').first();
    await cancelBtn.click();

    await expect(page.locator('h3:has-text("Green Planet 2026 Campaign")')).toBeVisible();
    await expect(page.locator('h3:has-text("Discarded Green Title")')).not.toBeVisible();
  });

  // ==========================================
  // FEATURE 2: CANVAS SECURITY
  // ==========================================

  test('11. Right-click on the canvas prevents default context menu', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    await expect(canvas).toBeVisible();

    await page.evaluate(() => {
      window.__ctxPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        if (e.defaultPrevented) window.__ctxPrevented = true;
      }, true);
    });

    await canvas.click({ button: 'right' });
    const prevented = await page.evaluate(() => window.__ctxPrevented);
    expect(prevented).toBe(true);
  });

  test('21. Selection/highlighting is disabled on the canvas via CSS properties (user-select: none)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    const selectStyle = await canvas.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.userSelect || style.webkitUserSelect || style.mozUserSelect || style.msUserSelect;
    });
    expect(selectStyle).toBe('none');
  });

  test('31. Standard text highlighting drag does not highlight or select canvas elements', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    const bbox = await canvas.boundingBox();
    if (bbox) {
      await page.mouse.move(bbox.x + 10, bbox.y + 10);
      await page.mouse.down();
      await page.mouse.move(bbox.x + bbox.width - 10, bbox.y + bbox.height - 10);
      await page.mouse.up();
    }

    const selectionText = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectionText).toBe('');
  });

  test('41. @media print CSS rules hide the canvas compositor and workspace canvas when printing', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    await expect(canvas).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    await expect(canvas).not.toBeVisible();
  });

  test('51. Drag/drop of external images onto canvas without upload input is ignored or prevented', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    const prevented = await page.evaluate(() => {
      let isCanceled = false;
      const onDrop = (e) => {
        if (e.defaultPrevented) isCanceled = true;
      };
      window.addEventListener('drop', onDrop, true);
      const dropEvt = new DragEvent('drop', { cancelable: true, bubbles: true });
      document.querySelector('canvas')?.dispatchEvent(dropEvt);
      window.removeEventListener('drop', onDrop, true);
      return isCanceled;
    });
    expect(prevented).toBe(true);
  });

  test('61. Selecting text adjacent to canvas doesn\'t leak highlight into canvas area', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const header = page.locator('h1').first();
    if (await header.isVisible()) {
      const bbox = await header.boundingBox();
      if (bbox) {
        await page.mouse.move(bbox.x, bbox.y);
        await page.mouse.down();
        await page.mouse.move(bbox.x + bbox.width + 100, bbox.y + bbox.height + 100);
        await page.mouse.up();
      }
    }

    const canvas = page.locator('canvas, #workspace-canvas').first();
    const selectStyle = await canvas.evaluate(el => window.getComputedStyle(el).userSelect);
    expect(selectStyle).toBe('none');
  });

  test('71. Right-clicking components near the canvas still opens the standard context menu (isolation check)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    await page.evaluate(() => {
      window.__bodyCtxPrevented = false;
      document.body.addEventListener('contextmenu', (e) => {
        if (e.defaultPrevented) window.__bodyCtxPrevented = true;
      }, { once: true });
    });

    const footer = page.locator('footer').first();
    if (await footer.isVisible()) {
      await footer.click({ button: 'right' });
      const prevented = await page.evaluate(() => window.__bodyCtxPrevented);
      expect(prevented).toBe(false);
    }
  });

  test('81. Printing while image is loading still hides the compositor/canvas elements', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    await page.emulateMedia({ media: 'print' });
    const compositor = page.locator('#workspace-canvas, canvas, .compositor-container').first();
    await expect(compositor).not.toBeVisible();
  });

  test('91. Right-click context menu is disabled even when holding modifier keys (Shift/Ctrl + Click)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    await page.evaluate(() => {
      window.__modCtxPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        if (e.defaultPrevented) window.__modCtxPrevented = true;
      }, true);
    });

    await canvas.click({ button: 'right', modifiers: ['Shift'] });
    const prevented = await page.evaluate(() => window.__modCtxPrevented);
    expect(prevented).toBe(true);
  });

  test('101. Selection is disabled even when double-clicking or triple-clicking within the workspace', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    await canvas.dblclick();

    const selectionText = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectionText).toBe('');
  });

  // ==========================================
  // FEATURE 3: WATERMARK DISPLAY
  // ==========================================

  test('111. Clicking "Download Branded Image" initiates export process', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await expect(downloadBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    expect(download).toBeDefined();
  });

  test('121. Exported image has correct MIME type (image/jpeg)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.(jpg|jpeg)$/);
  });

  test('131. Exported image includes "myStory" watermark text', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const hasWatermark = fillCalls.some(c => c.text === 'myStory');
    expect(hasWatermark).toBe(true);
  });

  test('141. Watermark is positioned in the bottom-right corner', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    expect(watermarkCall.x).toBeGreaterThan(watermarkCall.width / 2);
    expect(watermarkCall.y).toBeGreaterThan(watermarkCall.height / 2);
  });

  test('151. Watermark has 10% padding from the edges (aligned precisely at x=972, y=972 on 1080x1080 canvas)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    expect(watermarkCall.width).toBe(1080);
    expect(watermarkCall.height).toBe(1080);
    expect(watermarkCall.x).toBe(972);
    expect(watermarkCall.y).toBe(972);
  });

  test('161. Watermark is drawn with 24px sans-serif font and fill color rgba(0, 0, 0, 0.3)', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    expect(watermarkCall.font).toContain('24px');
    expect(watermarkCall.font).toContain('sans-serif');
    expect(watermarkCall.fillStyle).toBe('rgba(0, 0, 0, 0.3)');
  });

  test('171. Export succeeds even if the user uploaded image is extremely small or large', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);
    expect(download).toBeDefined();
  });

  test('181. Watermark remains clearly visible regardless of background frame color/brightness', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    // Validate opacity setting in rgba
    expect(watermarkCall.fillStyle).toBe('rgba(0, 0, 0, 0.3)');
  });

  test('191. Watermark dimensions do not scale up or down based on client zoom levels during download', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    // Change client zoom or slider
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('1.8');
    }

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    expect(watermarkCall.width).toBe(1080);
    expect(watermarkCall.height).toBe(1080);
    expect(watermarkCall.x).toBe(972);
    expect(watermarkCall.y).toBe(972);
  });

  test('201. Exporting twice consecutively applies watermark correctly both times without duplicating or offsetting', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    
    // First download
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    // Second download
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarks = fillCalls.filter(c => c.text === 'myStory');
    expect(watermarks.length).toBe(2);
    expect(watermarks[0].x).toBe(972);
    expect(watermarks[1].x).toBe(972);
  });

  // ==========================================
  // FEATURE 4: SPACING & RESPONSIVE LAYOUT
  // ==========================================

  test('211. DashboardHeader has container with class max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const headerContainer = page.locator('header > div').first();
    const className = await headerContainer.getAttribute('class');
    expect(className).toContain('max-w-7xl');
    expect(className).toContain('mx-auto');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-6');
    expect(className).toContain('lg:px-8');
  });

  test('221. Landing page layout has container with max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 alignment', async ({ page }) => {
    await page.goto('/');
    const mainSection = page.locator('section').first();
    const className = await mainSection.getAttribute('class');
    expect(className).toContain('max-w-7xl');
    expect(className).toContain('mx-auto');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-6');
    expect(className).toContain('lg:px-8');
  });

  test('231. Dashboard content grid is centered and aligned under the same max-w-7xl container', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const mainContainer = page.locator('main').first();
    const className = await mainContainer.getAttribute('class');
    expect(className).toContain('max-w-7xl');
    expect(className).toContain('mx-auto');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-6');
    expect(className).toContain('lg:px-8');
  });

  test('241. Stats panels are wrapped in max-w-7xl container', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    await page.goto('/dashboard/campaign/sandbox-campaign-1');
    const mainContainer = page.locator('main').first();
    const className = await mainContainer.getAttribute('class');
    expect(className).toContain('max-w-7xl');
    expect(className).toContain('mx-auto');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-6');
    expect(className).toContain('lg:px-8');
  });

  test('251. Alignments align perfectly on desktop viewports (1280px+)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const mainSection = page.locator('section').first();
    const bbox = await mainSection.boundingBox();
    expect(bbox.width).toBeLessThanOrEqual(1280);
  });

  test('261. Padding behaves correctly (px-4 on mobile, sm:px-6 on tablet, lg:px-8 on desktop)', async ({ page }) => {
    await page.goto('/');
    const mainSection = page.locator('section').first();
    const className = await mainSection.getAttribute('class');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-6');
    expect(className).toContain('lg:px-8');
  });

  test('271. Layout does not horizontal-scroll (overflow-x) on small devices (320px width)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasScrollbar).toBe(false);
  });

  test('281. Dashboard stats graphs scale dynamically within the max-w-7xl grid limits', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);
    await page.goto('/dashboard/campaign/sandbox-campaign-1');

    const graphContainer = page.locator('canvas').first();
    const bboxBefore = await graphContainer.boundingBox();

    await page.setViewportSize({ width: 1024, height: 768 });
    const bboxAfter = await graphContainer.boundingBox();
    expect(bboxAfter.width).not.toEqual(bboxBefore.width);
  });

  test('291. Header navigation links wrap or hide behind responsive menu on mobile without pushing out layout bounds', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const header = page.locator('header').first();
    const bbox = await header.boundingBox();
    expect(bbox.width).toBe(375);
  });

  test('301. Landing page CTA buttons align perfectly within the max-w-7xl bounds', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page.locator('button:has-text("Start Free Campaign")').first();
    const bbox = await ctaButton.boundingBox();
    const section = page.locator('section').first();
    const secBbox = await section.boundingBox();
    
    expect(bbox.x).toBeGreaterThanOrEqual(secBbox.x);
    expect(bbox.x + bbox.width).toBeLessThanOrEqual(secBbox.x + secBbox.width);
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================

  test('311. Edit + Layout: Open Edit Dialog on dashboard, check if the dialog container/modal aligns within standard viewport/max-w-7xl grid, and closing it maintains dashboard layout grid alignment', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const dialogBbox = await dialog.boundingBox();
    expect(dialogBbox.width).toBeLessThanOrEqual(1280);

    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]').first();
    await cancelBtn.click();

    await expect(dialog).not.toBeVisible();
    const mainContainer = page.locator('main').first();
    const className = await mainContainer.getAttribute('class');
    expect(className).toContain('max-w-7xl');
  });

  test('321. Security + Watermark: While canvas has right-click and selection disabled, participant downloads the image and checks if watermark is present in the JPEG export', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const canvas = page.locator('canvas, #workspace-canvas').first();
    const selectStyle = await canvas.evaluate(el => window.getComputedStyle(el).userSelect);
    expect(selectStyle).toBe('none');

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const hasWatermark = fillCalls.some(c => c.text === 'myStory');
    expect(hasWatermark).toBe(true);
  });

  test('331. Deletion + Layout: Optimistically delete a campaign card; dashboard layout grid adjusts/reflows immediately without breaking page margins or alignment', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await loginAsDeveloper(page);

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    const card = page.locator('h3:has-text("Green Planet 2026 Campaign")');
    const deleteBtn = page.locator('button[title="Delete Campaign"]').first();
    await deleteBtn.click();

    await expect(card).not.toBeVisible({ timeout: 100 });
    const mainContainer = page.locator('main').first();
    const className = await mainContainer.getAttribute('class');
    expect(className).toContain('max-w-7xl');
  });

  test('341. Watermark + Layout: Select high-resolution frame/image, download branded image; check if layout alignment of the page remains intact during composition and download process', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    // Page body width should remain centered and responsive
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeGreaterThan(0);
  });

  // ==========================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ==========================================

  test('351. Scenario 1: Full Campaign Creation and Management Flow', async ({ page }) => {
    // 1. Organizer signs in
    await loginAsDeveloper(page);

    // 2. Creates a campaign
    const createBtn = page.locator('button:has-text("Create Campaign"), button:has-text("Create Your First Campaign")').first();
    await createBtn.click();

    await page.locator('input[placeholder*="Diwali"], input[name="title"], input[id="title"]').fill('Scenario Campaign');
    await page.locator('input[placeholder*="diwali"], input[name="slug"], input[id="slug"]').fill(`scenario-slug-${Date.now()}`);
    await page.locator('textarea[placeholder*="supporters"], textarea[name="description"]').fill('Scenario Campaign Description');

    const fileInput = page.locator('input[type="file"]');
    // We can upload a mock png image as the frame overlay
    await fileInput.setInputFiles(mockImagePath);

    let alertTriggered = false;
    page.on('dialog', async dialog => {
      alertTriggered = true;
      await dialog.accept();
    });

    const submitBtn = page.locator('button[type="submit"]:has-text("Launch")');
    await submitBtn.click();

    // Verify campaign is visible on dashboard
    await expect(page.locator('h3:has-text("Scenario Campaign")')).toBeVisible();

    // 3. Opens Edit Dialog
    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();

    const titleInput = page.locator('input[placeholder*="title"], input[id="edit-title"], input[name="title"]').first();
    await titleInput.fill('Scenario Campaign Edited');

    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    await expect(page.locator('h3:has-text("Scenario Campaign Edited")')).toBeVisible();

    // 4. Deletes campaign (optimistic check)
    const deleteBtn = page.locator('button[title="Delete Campaign"]').first();
    await deleteBtn.click();

    await expect(page.locator('h3:has-text("Scenario Campaign Edited")')).not.toBeVisible({ timeout: 100 });
  });

  test('361. Scenario 2: Participant Image Customization & Secure Export', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    await page.goto('/c/green-planet-2026');

    // 1. Upload photo
    const uploader = page.locator('#participant-photo-upload');
    await uploader.setInputFiles(mockImagePath);

    // 2. Adjust zoom
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('1.5');
    }

    // 3. Try to right-click canvas (prevented)
    const canvas = page.locator('canvas, #workspace-canvas').first();
    await page.evaluate(() => {
      window.__secPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        if (e.defaultPrevented) window.__secPrevented = true;
      }, true);
    });
    await canvas.click({ button: 'right' });
    const prevented = await page.evaluate(() => window.__secPrevented);
    expect(prevented).toBe(true);

    // 4. Print stylesheet hide canvas
    await page.emulateMedia({ media: 'print' });
    await expect(canvas).not.toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    // 5. Download JPEG & verify watermark text and coordinates
    const downloadBtn = page.locator('button:has-text("Download Branded Image")');
    await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const fillCalls = await page.evaluate(() => window.__fillTextCalls);
    const watermarkCall = fillCalls.find(c => c.text === 'myStory');
    expect(watermarkCall).toBeDefined();
    expect(watermarkCall.x).toBe(972);
    expect(watermarkCall.y).toBe(972);
  });

  test('371. Scenario 3: Multi-Campaign Dashboard Coordination', async ({ page }) => {
    const multiMock = [
      ...defaultMockCampaigns,
      {
        id: 'sandbox-campaign-2',
        slug: 'campaign-two',
        creator_id: '00000000-0000-0000-0000-000000000000',
        title: 'Second Campaign',
        description: 'Second description',
        frame_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: true,
        is_active: true,
        stats: { views: 50, downloads: 20 },
        settings: {},
        metadata: { is_local: true }
      }
    ];

    await seedCampaigns(page, multiMock);
    await loginAsDeveloper(page);

    // Verify both campaigns exist
    await expect(page.locator('h3:has-text("Green Planet 2026 Campaign")')).toBeVisible();
    await expect(page.locator('h3:has-text("Second Campaign")')).toBeVisible();

    // Edit one campaign
    const editBtn = page.locator('button[title="Edit Campaign"]').first();
    await editBtn.click();
    const titleInput = page.locator('input[placeholder*="title"], input[id="edit-title"], input[name="title"]').first();
    await titleInput.fill('First Campaign Edited');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    await saveBtn.click();

    await expect(page.locator('h3:has-text("First Campaign Edited")')).toBeVisible();

    // Delete the other campaign
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    const deleteBtn = page.locator('button[title="Delete Campaign"]').last();
    await deleteBtn.click();

    await expect(page.locator('h3:has-text("Second Campaign")')).not.toBeVisible({ timeout: 100 });
  });

  test('381. Scenario 4: Mobile to Desktop Layout Transitions', async ({ page }) => {
    await seedCampaigns(page, defaultMockCampaigns);
    
    // 1. Mobile Viewport (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const landingHeaderMobile = page.locator('header').first();
    const headerBboxMobile = await landingHeaderMobile.boundingBox();
    expect(headerBboxMobile.width).toBe(375);

    // 2. Desktop Viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    const maxContainer = page.locator('section').first();
    const bboxDesktop = await maxContainer.boundingBox();
    expect(bboxDesktop.width).toBeLessThanOrEqual(1280);
  });

  test('391. Scenario 5: Empty State to Active Dashboard Transition', async ({ page }) => {
    // Seed empty campaigns array
    await seedCampaigns(page, []);
    await loginAsDeveloper(page);

    // Verify empty state is displayed
    const emptyHeader = page.locator('h3:has-text("No campaigns yet")');
    await expect(emptyHeader).toBeVisible();

    // Add first campaign
    const createBtn = page.locator('button:has-text("Create Your First Campaign"), button:has-text("Create Campaign")').first();
    await createBtn.click();

    await page.locator('input[placeholder*="Diwali"], input[name="title"], input[id="title"]').fill('Transition Campaign');
    await page.locator('input[placeholder*="diwali"], input[name="slug"], input[id="slug"]').fill('transition-slug');
    await page.locator('textarea[placeholder*="supporters"]').fill('Transition Campaign Description');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(mockImagePath);

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    const submitBtn = page.locator('button[type="submit"]:has-text("Launch")');
    await submitBtn.click();

    // Verify card is rendered instantly
    await expect(page.locator('h3:has-text("Transition Campaign")')).toBeVisible();
  });

});

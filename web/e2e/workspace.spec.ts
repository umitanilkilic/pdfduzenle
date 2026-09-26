import { expect, test } from "./base";
import { pageIdsOf, samplePdf, startAndDownload } from "./helpers";

test("a result can be passed to the next tool without re-uploading @mobile", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByTestId("file-input").setInputFiles([await samplePdf(2, "a.pdf"), await samplePdf(1, "b.pdf")]);
  await page.getByTestId("start").click();
  await page.getByTestId("result").getByRole("link", { name: "Sayfa Numarası Ekle" }).click();

  await expect(page).toHaveURL(/\/pdf-sayfa-numarasi-ekle$/); // query is removed after loading
  await expect(page.getByText("a-birlestirilmis.pdf")).toBeVisible();
  const download = await startAndDownload(page);
  expect(download.suggestedFilename()).toBe("a-birlestirilmis-numarali.pdf");
  expect(await pageIdsOf(download)).toEqual([0, 1, 0]);
});

test("recent files: list, reuse in another tool, delete and clear", async ({ page }) => {
  await page.goto("/pdf-dondur");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(1, "rapor.pdf"));
  await page.getByTestId("start").click();
  await expect(page.getByText("Hazır!")).toBeVisible();

  await page.getByRole("button", { name: "Son işlemler" }).click();
  const drawer = page.getByRole("dialog", { name: "Son işlemler" });
  await expect(drawer.getByText("rapor-dondurulmus.pdf")).toBeVisible();

  await drawer.getByRole("button", { name: "Başka araçta kullan" }).click();
  await drawer.getByRole("link", { name: "PDF Böl", exact: true }).click();
  await expect(page).toHaveURL(/\/pdf-bol$/);
  await expect(page.getByText("rapor-dondurulmus.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Son işlemler" }).click();
  await drawer.getByRole("button", { name: "Sil" }).click();
  await expect(drawer.getByText("Henüz işlem yok")).toBeVisible();
});

test("handed-over files the tool cannot use are ignored", async ({ page }) => {
  await page.goto("/pdf-jpg-cevir");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(1));
  await page.getByTestId("start").click();
  await expect(page.getByText("Hazır!")).toBeVisible();

  // Open the image in a PDF-only tool through the URL: nothing is preloaded.
  await page.getByRole("button", { name: "Son işlemler" }).click();
  const ids = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("pdfduzenle");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise<string[]>((resolve) => {
      const req = db.transaction("files").objectStore("files").getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
    });
  });
  await page.goto(`/pdf-sikistir?files=${ids.join(",")}`);
  await expect(page.getByTestId("file-input")).toBeAttached();
  await expect(page.getByText(".jpg")).toHaveCount(0);
});

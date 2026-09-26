/** Lowercases with Turkish rules and strips diacritics so "sıkıştır" matches "sikistir". */
export function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

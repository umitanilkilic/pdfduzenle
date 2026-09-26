/** Passing stored files to another tool through the URL: `/pdf-sikistir?files=id1,id2`. */

const PARAM = "files";
const ID = /^[\w-]{1,64}$/;

export function handoffHref(href: string, ids: string[]): string {
  if (ids.length === 0) return href;
  return `${href}?${PARAM}=${ids.map(encodeURIComponent).join(",")}`;
}

export function readHandoffIds(search: string): string[] {
  const value = new URLSearchParams(search).get(PARAM);
  if (!value) return [];
  return value
    .split(",")
    .filter((id) => ID.test(id))
    .slice(0, 20);
}

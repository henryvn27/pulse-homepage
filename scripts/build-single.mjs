import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const output = join(root, "..", "pulse-homepage.html");
const extension = join(root, "extension");
let html = await readFile(join(dist, "index.html"), "utf8");
const iconSvg = await readFile(join(dist, "pulse-icon.svg"));
const inlineIcon = `data:image/svg+xml;base64,${iconSvg.toString("base64")}`;

const [, scriptPath] = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const [, stylePath] = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
const assetPath = (path) => join(dist, path.replace(/^\//, ""));

const js = (await readFile(assetPath(scriptPath), "utf8")).replaceAll("</script", "<\\/script");
let css = await readFile(assetPath(stylePath), "utf8");

for (const match of css.matchAll(/url\((['"]?)(\.?\/assets\/[^)'\"]+)\1\)/g)) {
  const path = match[2];
  const extension = path.split(".").pop();
  const mime = extension === "woff2" ? "font/woff2" : "font/woff";
  const data = (await readFile(assetPath(path))).toString("base64");
  css = css.replaceAll(match[0], `url(data:${mime};base64,${data})`);
}

const extensionHtml = html
  .replace('href="/pulse-icon.svg"', 'href="./icons/icon-32.png"')
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, '<script type="module" src="./app.js"></script>')
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, '<link rel="stylesheet" href="./app.css">');

html = html
  .replace('href="/pulse-icon.svg"', `href="${inlineIcon}"`)
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => `<script type="module">${js}</script>`)
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${css}</style>`);

await writeFile(output, html);
await writeFile(join(extension, "index.html"), extensionHtml);
await writeFile(join(extension, "app.js"), js);
await writeFile(join(extension, "app.css"), css);
if (html.includes('/api/') || html.includes('127.0.0.1:8765')) {
  throw new Error("Standalone build still contains a localhost API dependency.");
}
if (html.includes('href="/pulse-icon.svg"') || !html.includes("data:image/svg+xml;base64")) {
  throw new Error("Standalone build does not contain its favicon inline.");
}
if (!extensionHtml.includes('href="./icons/icon-32.png"')) {
  throw new Error("Extension build does not reference its packaged icon.");
}
console.log(output);
console.log(join(extension, "index.html"));

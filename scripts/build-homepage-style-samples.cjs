const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'docs/design/funding-developed');
const publicRoot = path.join(root, 'public/samples');
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'));
const catalogModule = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/homepage-styles.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const catalog = {};
Function('exports', catalogModule.outputText)(catalog);
const activeAssets = new Set();
for (const [type, item] of Object.entries(manifest)) {
  const destination = path.join(publicRoot, 'funding', type);
  fs.mkdirSync(destination, { recursive: true });
  for (const page of Object.values(item.pages)) {
    const source = path.join(packageRoot, page.file);
    const html = fs.readFileSync(source, 'utf8');
    if (html.includes('__BRIEFING_PREPARATION_PAGE__')) throw Error('Unresolved source marker');
    fs.copyFileSync(source, path.join(destination, path.basename(page.file)));
    for (const match of html.matchAll(/[A-Za-z0-9_-]+(?:\.png|\.woff2)/g)) {
      if (fs.existsSync(path.join(root, 'docs/design/funding-hero-assets', match[0]))) activeAssets.add(match[0]);
    }
  }
}
activeAssets.add('PRETENDARD-LICENSE.txt');
const assetDestination = path.join(publicRoot, 'funding-hero-assets');
fs.mkdirSync(assetDestination, { recursive: true });
for (const filename of activeAssets) {
  const source = path.join(root, 'docs/design/funding-hero-assets', filename);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(assetDestination, filename));
}
const currentPreviews = path.join(publicRoot, 'current-style-previews');
fs.mkdirSync(currentPreviews, { recursive: true });
for (const number of [3, 6, 8, 9]) {
  for (const mode of ['desktop', 'mobile']) {
    const filename = `existing-${number}-${mode}.png`;
    const source = path.join(root, 'docs/design/homepage-style-preview-assets', filename);
    const destination = path.join(currentPreviews, filename);
    if (fs.existsSync(source)) fs.copyFileSync(source, destination);
    else if (!fs.existsSync(destination)) throw Error('Missing preview asset: ' + filename);
  }
}
const record = {
  status: 'approved_implemented_locally',
  approval: '크좋다 이렇게 보게 개선하자',
  deployment: 'not_deployed',
  version: 15,
  excluded: catalog.RETIRED_HOMEPAGE_STYLES,
  options: catalog.HOMEPAGE_STYLE_OPTIONS,
  newPages: manifest,
  assets: [...activeAssets],
  productionDeployed: false,
};
fs.writeFileSync(path.join(root, 'docs/design/homepage-style-replacement-catalog-20261002.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ copiedPages: Object.values(manifest).reduce((n, x) => n + x.pageCount, 0), copiedAssets: activeAssets.size, basicStyles: record.options.filter(x => !x.paid).length, inquiryOnly: record.options.filter(x => x.paid).length, excluded: record.excluded.map(x => x.name) }));

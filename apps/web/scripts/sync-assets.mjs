import { restoreMedia } from '../../../tools/restore-media.mjs';
import { fileURLToPath } from 'node:url';
import { rm, realpath } from 'node:fs/promises';
import ts from 'typescript';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../../../', import.meta.url),
  pub = new URL('../public/', import.meta.url),
  lib = new URL('../src/lib/', import.meta.url);
await mkdir(pub, { recursive: true });
await mkdir(lib, { recursive: true });
const media = await restoreMedia(fileURLToPath(new URL('assets/', root)));
console.log(
  'Verified ' + media.verified + ' original media masters; restored ' + media.restored + '.',
);
// Old builds copied source parts into the generated public folder. Remove only that verified generated copy.
const oldParts = new URL('assets/source-masters/', pub);
try {
  const actual = await realpath(oldParts),
    allowed = await realpath(new URL('assets/', pub)),
    workspace = await realpath(root);
  const normalize = (path) => path.replaceAll('\\', '/').toLowerCase();
  if (
    normalize(allowed) !== normalize(workspace) + '/apps/web/public/assets' ||
    normalize(actual) !== normalize(allowed) + '/source-masters'
  )
    throw new Error('Unsafe generated media cleanup path');
  await rm(actual, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await cp(new URL('assets/', root), new URL('assets/', pub), {
  recursive: true,
  filter: (source) => !source.includes('source-masters'),
});
for (const name of [
  'styles.css',
  'refinement.css',
  'reference-match.css',
  'subbrand.css',
  'tiraze.css',
  'site.webmanifest',
])
  await cp(new URL(name, root), new URL(name, pub));
await cp(new URL('data.js', root), new URL('editorial-data.js', lib));
let source = await readFile(new URL('app.js', root), 'utf8');
source = source.slice(0, source.indexOf('function render(scroll='));
source = source.replace("from './data.js'", "from './editorial-data.js'");
source = source.replace(
  'let slide=0, selectedOption=0, toastTimer, dialogTrigger;',
  'let slide=0;',
);
source = source.replace(/const read=.+\n/, 'const read=(key,fallback)=>fallback;\n');
const start = source.indexOf('function contactForm('),
  end = source.indexOf('function contactSection()', start);
source =
  source.slice(0, start) +
  `function contactForm(){ return link('/quote','اطلب قطعة حسب مقاسك','REQUEST A BESPOKE PIECE','button'); }\n` +
  source.slice(end);
source += `\nexport function renderEditorial(page, language){lang=language; const [kind,slug]=page.split('/'); const pages={home,about,care,provenance,concierge:()=>service(false),gifting:()=>service(true),journal:()=>journal(slug),buyers:()=>intro('خدمة العملاء','Client care')+faqList()};let html=(pages[kind]??notFound)();html=html.replace(/href="\\/(?!assets)([^"#]*)"/g,(_,path)=>'href="/'+language+'/'+(path.startsWith('products/')?'quote?concept='+path.split('/')[1]:path.startsWith('collections/')?'catalog?category='+path.split('/')[1]:path)+'"');return html;}\n`;
// Keep only the approved editorial renderer and its dependencies, excluding legacy storage/event code.
const tree = ts.createSourceFile(
  'editorial.js',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const declarations = new Map();
for (const statement of tree.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name)
    declarations.set(statement.name.text, statement);
  if (ts.isVariableStatement(statement))
    for (const d of statement.declarationList.declarations)
      if (ts.isIdentifier(d.name)) declarations.set(d.name.text, statement);
}
const selected = new Set(),
  pending = ['renderEditorial'];
while (pending.length) {
  const name = pending.pop(),
    statement = declarations.get(name);
  if (!statement || selected.has(statement)) continue;
  selected.add(statement);
  const visit = (node) => {
    if (ts.isIdentifier(node) && declarations.has(node.text)) pending.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(statement);
}
source = tree.statements
  .filter((s) => ts.isImportDeclaration(s) || selected.has(s))
  .map((s) => s.getText(tree))
  .join('\n');
source = source.replace(/^let bag=.*$/gm, '');
await writeFile(new URL('editorial.js', lib), source);

// Partage : extrait propre, page d'aperçu (balises Open Graph, échappement), câblage : node --test tests/partage.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { echapper, extrait, pagePartage } = require('../src/services/partage');

test('echapper : les caractères HTML sont neutralisés', () => {
  assert.strictEqual(echapper('<script>"a" & \'b\'</script>'), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
  assert.strictEqual(echapper(null), '');
});

test('extrait : sans code ni marques, coupé proprement', () => {
  assert.strictEqual(extrait('Bonjour **tout** le `monde`\n\n```js\nconsole.log(1)\n```\nfin'), 'Bonjour tout le monde fin');
  const long = extrait('mot '.repeat(100), 50);
  assert.ok(long.length <= 50 && long.endsWith('…'));
  assert.strictEqual(extrait(undefined), '');
});

test('pagePartage : balises Open Graph, redirection vers la vraie page, rien d\'injectable', () => {
  const h = pagePartage({ titre: 'Comment faire <b>X</b> ?', description: 'Un "test"', urlPage: 'https://site.test/forum/questions/1', urlCanonique: 'https://site.test/api/partage/question/1', image: 'https://site.test/icon-192.png' });
  assert.match(h, /<meta property="og:title" content="Comment faire &lt;b&gt;X&lt;\/b&gt; \?">/);
  assert.match(h, /<meta property="og:description" content="Un &quot;test&quot;">/);
  assert.match(h, /<meta property="og:url" content="https:\/\/site\.test\/api\/partage\/question\/1">/);
  assert.match(h, /<meta property="og:image" content="https:\/\/site\.test\/icon-192\.png">/);
  assert.match(h, /http-equiv="refresh" content="0;url=https:\/\/site\.test\/forum\/questions\/1"/);
  assert.ok(!h.includes('<b>X</b>'));
  assert.ok(!pagePartage({ titre: 'a', description: 'b', urlPage: 'u', urlCanonique: 'c' }).includes('og:image'));
});

test('câblage : route montée dans app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  assert.match(app, /\/api\/partage/);
});

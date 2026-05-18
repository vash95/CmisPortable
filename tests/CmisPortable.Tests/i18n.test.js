const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { translations: CORE_TRANSLATIONS, createTranslator } = require('../../src/CmisPortable.Core/i18n');
const { MAIN_TRANSLATIONS } = require('../../src/CmisPortable.App/mainTranslations');
const { RENDERER_TRANSLATIONS } = require('../../src/CmisPortable.App/rendererTranslations');

function assertLocaleKeyParity(dictionary, name) {
  const englishKeys = Object.keys(dictionary.en).sort();
  const spanishKeys = Object.keys(dictionary.es).sort();
  assert.deepEqual(spanishKeys, englishKeys, `${name} Spanish translations must match English keys`);
}

function collectI18nKeysFromHtml(html) {
  const keys = [];
  const pattern = /data-i18n(?:-(?:placeholder|aria-label))?="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    keys.push(match[1]);
  }
  return keys;
}

test('translation dictionaries keep English and Spanish keys aligned', () => {
  assertLocaleKeyParity(CORE_TRANSLATIONS, 'Core');
  assertLocaleKeyParity(MAIN_TRANSLATIONS, 'Main process');
  assertLocaleKeyParity(RENDERER_TRANSLATIONS, 'Renderer');
});

test('renderer HTML only references existing translation keys', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../src/CmisPortable.App/renderer.html'), 'utf8');
  const missingKeys = collectI18nKeysFromHtml(html).filter((key) => !(key in RENDERER_TRANSLATIONS.en));

  assert.deepEqual(missingKeys, []);
  assert.match(html, /rendererTranslations\.js[\s\S]+renderer\.js/);
});

test('shared translator falls back to English and executes parameterized messages', () => {
  const translateMain = createTranslator(MAIN_TRANSLATIONS);

  assert.equal(translateMain('tray.quit', 'fr-FR'), 'Quit');
  assert.equal(translateMain('log.config.interval', 'es-ES', 30), 'Intervalo de actualización configurado en 30 segundos.');
});

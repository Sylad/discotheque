// L25 — la config d'analyse porte les seuils de cadence (D-31) et cadence.yaml déclare
// les outils de la pile (ESLint, tsc, ruff). Les seuils viennent de la demande du lot,
// pas du code : un seuil relevé en douce fait échouer ce test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';

const SEUILS = {
  'max-lines': 400,
  'max-lines-per-function': 80,
  'max-depth': 4,
  'max-params': 5,
  complexity: 15,
  'sonarjs/cognitive-complexity': 15,
};

/** @typedef {[number, number | { max: number }]} Reglage */

/** @param {Reglage} reglage */
const seuil = (reglage) => {
  const [niveau, option] = reglage;
  assert.equal(niveau, 2, 'la règle doit être en erreur');
  return typeof option === 'number' ? option : option.max;
};

/** Lignes non vides d'un fichier, sans blancs autour. @param {string} chemin */
const lignes = (chemin) =>
  readFileSync(chemin, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// Fichiers fictifs : calculateConfigForFile n'a pas besoin qu'ils existent.
for (const fichier of ['backend/src/main.ts', 'frontend/src/App.tsx', 'eslint.config.mjs']) {
  void test(`seuils de cadence appliqués à ${fichier}`, async () => {
    /** @type {unknown} */
    const brut = await new ESLint().calculateConfigForFile(fichier);
    const { rules } = /** @type {{ rules: Record<string, Reglage | undefined> }} */ (brut);
    for (const [regle, attendu] of Object.entries(SEUILS)) {
      const reglage = rules[regle];
      assert.ok(reglage, `${regle} absente pour ${fichier}`);
      assert.equal(seuil(reglage), attendu, `${regle} pour ${fichier}`);
    }
  });
}

void test('ruff.toml : complexité 15, max-args 5, C901 sélectionné', () => {
  const ruff = lignes('ruff.toml');
  assert.ok(ruff.includes('max-complexity = 15'));
  assert.ok(ruff.includes('max-args = 5'));
  assert.ok(ruff.some((l) => l.startsWith('select =') && l.includes('"C901"')));
});

void test('cadence.yaml déclare eslint, tsc et ruff sous analyse:, avec leurs configs', () => {
  const yaml = readFileSync('cadence.yaml', 'utf8').split('\n');
  const debut = yaml.indexOf('analyse:');
  assert.ok(debut >= 0, 'clé analyse: absente');
  const fin = yaml.findIndex((l, i) => i > debut && l !== '' && !l.startsWith(' '));
  const bloc = (fin < 0 ? yaml.slice(debut + 1) : yaml.slice(debut + 1, fin)).map((l) => l.trim());
  assert.ok(!bloc.some((l) => l.startsWith('tools:')), 'analyse: est directement une liste');
  for (const [nom, format, config] of [
    ['eslint', 'eslint-json', 'eslint.config.mjs'],
    ['tsc', 'tsc', 'tsconfig.json'],
    ['ruff', 'ruff-json', 'ruff.toml'],
  ]) {
    const i = bloc.indexOf(`- name: ${nom}`);
    assert.ok(i >= 0, `outil ${nom} non déclaré`);
    const suite = bloc.slice(i + 1);
    const n = suite.findIndex((l) => l.startsWith('- name:'));
    const entree = n < 0 ? suite : suite.slice(0, n);
    assert.ok(entree.includes(`format: ${format}`), `${nom} : format`);
    assert.ok(entree.includes(`configs: [${config}]`), `${nom} : configs`);
  }
});

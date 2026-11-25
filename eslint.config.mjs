// Analyse statique du dépôt (L25, D-31) : jouée par `cadence analyse` (entrée eslint de
// cadence.yaml) à chaque lot. Seuils de lisibilité de cadence : un seuil se change dans un
// lot `config: true` du plan, jamais en passant.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default defineConfig(
  { ignores: ['**/node_modules/', '**/dist/', '**/coverage/', '.cadence/', 'worker/'] },
  tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
);

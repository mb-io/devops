import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/lib',
      '**/package.json',
      '**/package-lock.json',
    ],
  },
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.ESLintParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        createDefaultProgram: true,
      },
    },
    rules: {
      indent: ['error', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'no-console': 'warn',
      'no-unused-vars': 'off',
      camelcase: 'error',
      curly: 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'warn',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-return-assign': 'warn',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'warn',
      'no-useless-return': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-const': 'error',
      'require-await': 'warn',
      '@typescript-eslint/no-useless-constructor': 'warn',
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        { accessibility: 'no-public' },
      ],
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: [
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'constructor',
            'public-static-method',
            'public-instance-method',
            'protected-static-method',
            'protected-instance-method',
            'private-static-method',
            'private-instance-method',
          ],
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'warn',
        { allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true },
      ],
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-readonly': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'rxjs/operators',
              message:
                "With RxJS v7.2.0, most operators have been moved to 'rxjs' export site. This means that the preferred way to import operators is from 'rxjs', while 'rxjs/operators' export site has been deprecated. https://rxjs.dev/guide/importing",
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);

/**
 * @file ESLint entries that only this repository needs; the common rules live in eslint.config.mjs.
 */

export default [
    {
        // A plain JavaScript extension loaded by the E2E tests, not part of the product.
        ignores: ['tests/sample-extension/'],
    },
];

// eslint-disable-next-line no-unused-vars
Cypress.on('uncaught:exception', (err, runnable) => {
    // Returning false here prevents Cypress from failing the test
    console.error('Browser exception:', err);

    return false;
});

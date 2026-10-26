import { baseUrl } from '../../shared/constants';
import { runCronJob } from '../../shared/pages/utils';

describe('Admin data queries update correctly', () => {
    it('updates all queries when asked to', () => {
        cy.visit(baseUrl);
        runCronJob('refreshAllAdminQueries');
        // Allow up to 20 seconds for all queries to refresh
        cy.get('.MuiButton-root', { timeout: 20000 }).contains('Run Cron Job').should('not.be.disabled');
        cy.get(`.sidebar-options-list`).contains('Export data').click();
        cy.get(`div.tr_row > div:nth-child(2)`).contains(new Date().toLocaleDateString('en-GB')).should('exist');
    });
});

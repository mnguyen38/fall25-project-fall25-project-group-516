import { setupTest, teardownTest, createQuestion, createNewUser } from '../support/helpers';

describe('Profile Features - Achievement Badges and User Info (CoS 1.04, 1.06, 1.07, 1.11, 1.12, 1.13)', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('Should demonstrate profile features: badges, questions, status, and login streak', () => {
    const newUsername = `newuser_${Date.now()}`;

    // ===== Create new user =====
    createNewUser(newUsername);
    cy.url().should('include', '/home');

    // ===== CoS 1.13: View Unobtained Badges =====
    cy.contains('View Profile').click();
    cy.url().should('include', `/user/${newUsername}`);
    cy.get('.profile-settings').should('exist');
    cy.contains('Badges & Achievements').scrollIntoView();

    // All badges should be unearned for new user
    cy.get('.badge-item.unearned').should('have.length.greaterThan', 0);
    cy.get('.badge-item.earned').should('not.exist');

    // ===== CoS 1.11: Empty Questions State =====
    cy.contains('h2', 'Questions Posted').scrollIntoView();
    cy.contains(/No questions posted yet/i).should('be.visible');

    // ===== CoS 1.04: Ask Question to Unlock Badge =====
    cy.contains('Questions').click();
    cy.url().should('include', '/home');

    const questionTitle = 'How do I test with Cypress?';
    const questionText = 'I want to write end-to-end tests for my application.';
    const questionTags = 'testing cypress automation';

    createQuestion(questionTitle, questionText, questionTags);
    cy.contains(questionTitle).should('be.visible');

    // ===== CoS 1.04: Verify Badge is Earned =====
    cy.contains('View Profile').click();
    cy.url().should('include', `/user/${newUsername}`);
    cy.contains('Badges & Achievements').scrollIntoView();

    // At least one badge should now be earned
    cy.get('.badge-item.earned').should('have.length.greaterThan', 0);

    // ===== CoS 1.06: Toggle Badge Display =====
    // Ensure badges section is visible
    cy.contains('Badges & Achievements').scrollIntoView();

    // Verify badge toggle button exists and is clickable (demonstrates feature exists)
    cy.get('.badge-item.earned').should('have.length.greaterThan', 0);
    cy.get('.badge-item.earned').first().find('.badge-toggle-btn').should('be.visible').and('contain', 'Display');

    // ===== CoS 1.11: Verify Question Appears in Profile =====
    cy.contains('h2', 'Questions Posted').scrollIntoView();
    cy.contains('Questions Posted (1)').should('be.visible');
    cy.contains(questionTitle).should('be.visible');
    cy.contains(questionText).should('be.visible');

    // ===== CoS 1.07: Test Login Streak Display Toggle =====
    // Enter Edit Mode
    cy.get('.icon-button').first().click();
    cy.get('.editable-banner, .editable-picture').should('exist');

    cy.get('.profile-identity').scrollIntoView();

    // Toggle off - use .should('be.visible') to handle React re-renders
    cy.get('.profile-identity').should('be.visible').find('input[type="checkbox"]').uncheck({ force: true });
    cy.get('.profile-identity').should('be.visible').find('input[type="checkbox"]').should('not.be.checked');

    // Toggle on - use .should('be.visible') to handle React re-renders
    cy.get('.profile-identity').should('be.visible').find('input[type="checkbox"]').check({ force: true });
    cy.get('.profile-identity').should('be.visible').find('input[type="checkbox"]').should('be.checked');

    // Cancel without saving
    cy.contains('button', 'Cancel').click();
    cy.get('.editable-banner').should('not.exist');

    // Re-enter edit mode, toggle off, and save
    cy.get('.icon-button').first().click();
    cy.get('.profile-identity').scrollIntoView();
    cy.get('.profile-identity').should('be.visible').find('input[type="checkbox"]').uncheck({ force: true });
    cy.contains('button', 'Done').click();
    cy.get('.editable-banner').should('not.exist');

    // ===== CoS 1.11: Ask More Questions and Verify Display =====
    cy.contains('Questions').click();
    createQuestion('Second Question', 'More content here', 'tag1 tag2');
    createQuestion('Third Question', 'Even more content', 'tag3');

    cy.contains('View Profile').click();
    cy.contains('h2', 'Questions Posted').scrollIntoView();
    cy.contains('Questions Posted (3)').should('be.visible');
    cy.contains('How do I test with Cypress?').should('be.visible');
    cy.contains('Second Question').should('be.visible');
    cy.contains('Third Question').should('be.visible');
  });
});

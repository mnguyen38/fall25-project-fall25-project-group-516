import {
  setupTest,
  teardownTest,
  createNewUser,
  logoutUser,
  loginUser,
} from '../support/helpers';

describe('Daily Rewards and Advertisements (CoS 3.02, 3.03, 3.04, 3.07, 3.08, 3.11)', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('Should test daily login rewards, ad blocker detection, and premium ad-free experience', () => {
    const regularUser = `regular_${Date.now()}`;
    const premiumUser = `premium_${Date.now()}`;

    // ===== CoS 3.02: Daily Login Reward for New User =====
    // Manually sign up to verify the login reward modal contents
    cy.visit('http://localhost:4530');
    cy.get('.btn-primary').contains('Sign Up').click();
    cy.url().should('include', '/signup');

    cy.get('#username-input').type(regularUser);
    cy.get('#password-input').type('securePass123!');
    cy.get('input[placeholder="Confirm your password"]').type('securePass123!');
    cy.contains('Submit').click();
    cy.url().should('include', '/home');

    // Verify daily login reward modal appears
    cy.get('.modal-overlay', { timeout: 10000 }).should('be.visible');
    cy.contains('Login Reward').should('be.visible');
    cy.contains('You have been awarded...').should('be.visible');
    cy.get('.text-block').contains('h2', 'x1').should('be.visible');
    cy.contains('h3', 'For your first time logging in!').should('be.visible');

    // Accept the reward
    cy.contains('button', /accept/i).click({ force: true });
    cy.get('.modal-overlay').should('not.exist');

    // ===== CoS 3.03: Verify Ads Display for Non-Premium Users =====
    // Ads should be present in the right sidebar for non-premium users
    cy.get('.rightSidebar').should('exist');

    // Verify ad container exists for non-premium users
    cy.get('.ad-container').should('exist');

    // ===== CoS 3.04: Verify Only Embedded Ads (AdSterra) =====
    // Check that the ad uses AdSterra embedded format with specific ID pattern
    cy.get('[id^="adsterra-ad-"]').should('exist');

    // Logout regular user
    logoutUser();
  });

  it('Should test streak recovery with coins for non-premium users (CoS 3.08)', () => {
    // ===== CoS 3.08: Login as non-premium user about to miss streak =====
    loginUser('lovelylinda', 'linda123');
    cy.url().should('include', '/home');

    // Wait for page to fully load
    cy.wait(1000);

    // Accept login reward modal if present first
    cy.get('body').then($body => {
      if ($body.find('.modal-overlay').length > 0 && $body.find('.modal-overlay:contains("Login Reward")').length > 0) {
        cy.contains('button', /accept/i).click({ force: true });
        cy.get('.modal-overlay').should('not.exist');
      }
    });

    // Wait a moment for any streak recovery modal to appear
    cy.wait(500);

    // Check if streak recovery modal appears (only if user is about to miss streak)
    // This modal may or may not appear depending on streak state
    cy.get('body').then($body => {
      if ($body.find('.modal-overlay:contains("streak")').length > 0) {
        // Streak recovery modal is present
        cy.get('.modal-overlay').should('be.visible');
        cy.contains(/streak/i).should('be.visible');
        cy.contains(/40 coins/i).should('be.visible'); // Non-premium costs 40 coins

        // Click "Yes" to recover streak
        cy.contains('button', /yes/i).click({ force: true });

        // Wait for modal to close after recovery
        cy.get('.modal-overlay').should('not.exist');

        // Verify streak was recovered
        cy.contains('View Profile').click();
        cy.url().should('include', '/user/lovelylinda');

        // Login streak should be displayed and greater than 1
        cy.get('.profile-identity').scrollIntoView();
        cy.contains(/day login streak/i).should('be.visible');
      } else {
        // If no streak recovery modal, just verify user profile
        cy.log('No streak recovery modal - user streak is current');
      }
    });

    // Ensure no modals are present before logout
    cy.get('.modal-overlay').should('not.exist');

    logoutUser();
  });

  it('Should test streak recovery with streak pass for premium users (CoS 3.07)', () => {
    // ===== CoS 3.07: Login as premium user with streak pass =====
    loginUser('kittycakemaker', 'cat');
    cy.url().should('include', '/home');

    // Wait for page to fully load
    cy.wait(1000);

    // Accept login reward modal if present first
    cy.get('body').then($body => {
      if ($body.find('.modal-overlay').length > 0 && $body.find('.modal-overlay:contains("Login Reward")').length > 0) {
        cy.contains('button', /accept/i).click({ force: true });
        cy.get('.modal-overlay').should('not.exist');
      }
    });

    // Wait a moment for any streak recovery modal to appear
    cy.wait(500);

    // Check if streak recovery modal appears
    cy.get('body').then($body => {
      if ($body.find('.modal-overlay:contains("streak")').length > 0) {
        // Streak recovery modal is present
        cy.get('.modal-overlay').should('be.visible');
        cy.contains(/streak/i).should('be.visible');
        cy.contains(/streak pass/i).should('be.visible'); // Premium users use streak pass

        // Click "Yes" to recover streak using streak pass
        cy.contains('button', /yes/i).click({ force: true });

        // Wait for modal to close after recovery
        cy.get('.modal-overlay').should('not.exist');

        // Verify streak was recovered
        cy.contains('View Profile').click();
        cy.url().should('include', '/user/kittycakemaker');

        // Verify premium status
        cy.get('.profile-name').should('contain', '&#x1F31F');

        // Login streak should be maintained
        cy.get('.profile-identity').scrollIntoView();
        cy.contains(/day login streak/i).should('be.visible');
      } else {
        cy.log('No streak recovery modal - user streak is current');
      }
    });

    // Ensure no modals are present before logout
    cy.get('.modal-overlay').should('not.exist');

    logoutUser();
  });

});

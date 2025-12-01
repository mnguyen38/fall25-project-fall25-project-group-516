import {
  setupTest,
  teardownTest,
  createNewUser,
  loginUser,
  logoutUser,
  createQuestion,
} from '../support/helpers';

describe('Profile Privacy and Blocking (CoS 1.08, 1.09, 1.14, 1.15)', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('Should test viewing public profiles, privacy settings, and blocking/unblocking', () => {
    const user1 = `user1_${Date.now()}`;
    const user2 = `user2_${Date.now()}`;

    // ===== Setup User 1 with content =====
    createNewUser(user1);
    cy.url().should('include', '/home');

    // User 1 asks a question to earn a badge
    createQuestion('User 1 Question', 'This is user 1 content', 'test');
    cy.url().should('include', '/home');

    // Go to profile and display a badge
    cy.contains('View Profile').click();
    cy.url().should('include', `/user/${user1}`);
    cy.contains('Badges & Achievements').scrollIntoView();

    // Find an earned badge and display it
    cy.get('.badge-item.earned').should('have.length.greaterThan', 0);
    cy.get('.badge-item.earned').first().find('.badge-toggle-btn').should('be.visible').and('contain', 'Display').click();

    // Verify button changed to "Hide" after clicking (re-query to handle React re-render)
    cy.get('.badge-item.earned').first().find('.badge-toggle-btn').should('contain', 'Hide');

    // Logout User 1
    logoutUser();

    // ===== Setup User 2 =====
    createNewUser(user2);
    cy.url().should('include', '/home');

    // ===== CoS 1.08: User 2 Views User 1's Public Profile =====
    cy.contains('Users').click();
    cy.url().should('include', '/users');

    // Find and click on User 1's profile
    cy.get('.userUsername').contains(user1).click();
    cy.url().should('include', `/user/${user1}`);

    // Verify User 2 can see User 1's displayed badges (only displayed ones show for other users)
    cy.contains('Badges & Achievements').scrollIntoView();
    cy.get('.badge-item.earned').should('have.length.greaterThan', 0);

    // Verify User 2 can see User 1's questions
    cy.contains('h2', 'Questions Posted').scrollIntoView();
    cy.contains('User 1 Question').should('be.visible');

    // Logout User 2
    logoutUser();

    // ===== CoS 1.14 & 1.09: User 1 Makes Profile Private =====
    loginUser(user1);
    cy.url().should('include', '/home');

    // Navigate to profile and open settings
    cy.contains('View Profile').click();
    cy.url().should('include', `/user/${user1}`);

    // Click settings button
    cy.get('.icon-button').eq(1).click();
    cy.get('.settings-dropdown').should('be.visible');

    // Make profile private
    cy.contains('Make Profile Private').click();

    // Wait for the action to complete
    cy.wait(1000);

    // Verify profile is now private
    cy.get('.icon-button').eq(1).click();
    cy.get('.settings-dropdown').should('be.visible');
    cy.contains('Make Profile Public').should('be.visible');

    // Close dropdown
    cy.get('body').click(0, 0);

    // Logout User 1
    logoutUser();

    // ===== CoS 1.09: User 2 Cannot See User 1's Private Profile =====
    loginUser(user2);
    cy.url().should('include', '/home');

    // Navigate to User 1's profile
    cy.contains('Users').click();
    cy.get('.userUsername').contains(user1).click();
    cy.url().should('include', `/user/${user1}`);

    // Should see private profile message
    cy.contains(/This user account is private/i).should('be.visible');

    // Questions section should show private message
    cy.contains('h2', 'Questions Posted').scrollIntoView();
    cy.contains('.profile-section', /This user account is private/i).should('be.visible');

    // Badges section should show private message
    cy.contains('h2', 'Badges & Achievements').scrollIntoView();
    cy.contains('.profile-section', /This user account is private/i).should('be.visible');

    // User 1's status should be "Away"
    cy.get('.profile-header').scrollIntoView();
    cy.contains(/Away/i).should('be.visible');

    // Logout User 2
    logoutUser();

    // ===== CoS 1.15: User 1 Blocks User 2 =====
    loginUser(user1);
    cy.url().should('include', '/home');

    // Navigate to User 2's profile via Users list
    cy.contains('Users').click();
    cy.url().should('include', '/users');
    cy.get('.userUsername').contains(user2).click();
    cy.url().should('include', `/user/${user2}`);

    // Block User 2
    cy.contains('button', /Block User/i).click();

    // Wait for block to take effect
    cy.wait(1000);

    // Navigate to Users list - User 2 should not appear
    cy.contains('Users').click();
    cy.url().should('include', '/users');
    cy.get('.userUsername').contains(user2).should('not.exist');

    // Try to visit User 2's profile directly using URL
    cy.visit(`http://localhost:4530/user/${user2}`);

    // Should see blocked message
    cy.contains(/You have blocked this user/i).should('be.visible');

    // ===== Verify two-way block: User 2 can't see User 1 =====
    logoutUser();
    loginUser(user2);

    // User 2 tries to find User 1 in Users list
    cy.contains('Users').click();
    cy.url().should('include', '/users');
    cy.get('.userUsername').contains(user1).should('not.exist');

    // Try to visit User 1's profile directly using URL
    cy.visit(`http://localhost:4530/user/${user1}`);

    // Profile still shows as private (User 1 hasn't changed it back)
    // Even though blocked, the existing private state persists
    cy.contains(/This user account is private/i).should('be.visible');

    // Logout User 2
    logoutUser();

    // ===== CoS 1.15: User 1 Unblocks User 2 =====
    loginUser(user1);

    // Visit User 2's profile URL directly
    cy.visit(`http://localhost:4530/user/${user2}`);

    // Unblock User 2
    cy.contains('button', /Unblock User/i).click();

    // Wait for unblock to take effect
    cy.wait(1000);

    // Navigate to Users list - User 2 should now appear
    cy.contains('Users').click();
    cy.url().should('include', '/users');
    cy.get('.userUsername').contains(user2).should('be.visible');

    // Can view User 2's profile again
    cy.get('.userUsername').contains(user2).click();
    cy.url().should('include', `/user/${user2}`);
    cy.get('.profile-settings').should('exist');

    // Logout User 1
    logoutUser();

    // ===== Verify User 2 can see User 1 again =====
    loginUser(user2);

    cy.contains('Users').click();
    cy.get('.userUsername').contains(user1).should('be.visible');

    // Can view User 1's profile (still private though)
    cy.get('.userUsername').contains(user1).click();
    cy.url().should('include', `/user/${user1}`);
    cy.contains(/This user account is private/i).should('be.visible');

    // Logout User 2
    logoutUser();

    // ===== Cleanup: User 1 Makes Profile Public Again =====
    loginUser(user1);

    cy.contains('View Profile').click();
    cy.get('.icon-button').eq(1).click();
    cy.get('.settings-dropdown').should('be.visible');
    cy.contains('Make Profile Public').click();

    // Verify profile is now public
    cy.wait(500);
    cy.get('.icon-button').eq(1).click();
    cy.get('.settings-dropdown').should('be.visible');
    cy.contains('Make Profile Private').should('be.visible');
  });
});

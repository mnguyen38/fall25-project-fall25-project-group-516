import protect from '../middleware/token.middleware';

export const DEFAULT_MOCK_USER = {
  id: 'mock-user-id-123',
  username: 'mockTestUser',
};

/**
 * Configures the 'protect' middleware mock.
 * * Call this inside a `beforeEach` in your test suite.
 * It ensures that `req.user` is set to the mock user
 * and `next()` is called.
 * * @param mockUser - The user object you want to inject into req.user.
 * Defaults to DEFAULT_MOCK_USER.
 */
export const setupMockAuth = (mockUser = DEFAULT_MOCK_USER) => {
  const mockedProtect = protect as jest.Mock;

  mockedProtect.mockClear();

  mockedProtect.mockImplementation((req, res, next) => {
    req.user = mockUser;

    next();
  });
};

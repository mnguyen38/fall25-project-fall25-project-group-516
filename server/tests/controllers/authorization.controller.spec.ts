import { app } from '../../app';
import supertest from 'supertest';
import axios from 'axios';
import { generateToken } from '../../utils/jwt';
import { findOrCreateOAuthUser } from '../../services/user.service';

jest.mock('axios');
jest.mock('../../utils/jwt');
jest.mock('../../services/user.service');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGenerateToken = generateToken as jest.Mock;
const mockedFindOrCreate = findOrCreateOAuthUser as jest.Mock;

describe('openAuthorization Controller', () => {
  let originalClientId: string | undefined;
  let originalClientSecret: string | undefined;
  let originalServerUrl: string | undefined;
  let originalGoogleClientId: string | undefined;
  let originalGoogleClientSecret: string | undefined;

  afterAll(done => {
    // Check if the imported app is a server (or has a .close() method)
    // This is crucial for closing the connection and preventing open handles
    if (app && typeof (app as any).close === 'function') {
      (app as any).close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    originalClientId = process.env.GITHUB_CLIENT_ID;
    originalClientSecret = process.env.GITHUB_CLIENT_SECRET;
    originalServerUrl = process.env.SERVER_URL;

    originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
    originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    process.env.GITHUB_CLIENT_ID = 'default-id';
    process.env.GITHUB_CLIENT_SECRET = 'default-secret';
    process.env.SERVER_URL = 'http://default-server.com';
    process.env.CLIENT_URL = 'http://localhost:4530';

    process.env.GOOGLE_CLIENT_ID = 'default-google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'default-google-secret';
  });

  afterEach(() => {
    process.env.GITHUB_CLIENT_ID = originalClientId;
    process.env.GITHUB_CLIENT_SECRET = originalClientSecret;
    process.env.SERVER_URL = originalServerUrl;

    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;

    jest.resetAllMocks();
  });

  describe('GET /github', () => {
    test('redirect the user to github auth page', async () => {
      const response = await supertest(app).get('/api/auth/github').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toMatch(/^https:\/\/github\.com\/login\/oauth/);
    });

    test('missing github client id', async () => {
      process.env.GITHUB_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/github').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    test('missing server url', async () => {
      process.env.SERVER_URL = '';
      const response = await supertest(app).get('/api/auth/github').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    test('missing all env variables', async () => {
      process.env.SERVER_URL = '';
      process.env.GITHUB_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/github').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });
  });

  describe('GET /github/callback', () => {
    test('successful callback should redirect with token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'fake_github_token' },
      });
      mockedAxios.get.mockImplementation((url: string) => {
        if (url === 'https://api.github.com/user') {
          return Promise.resolve({
            data: {
              id: 123,
              login: 'testuser',
              name: 'Test User',
              avatar_url: 'http://avatar.com',
              bio: 'bio',
            },
          });
        }
        if (url === 'https://api.github.com/user/emails') {
          return Promise.resolve({
            data: [{ email: 'test@user.com', primary: true, verified: true }],
          });
        }
        return Promise.reject(new Error('Unknown axios URL'));
      });
      const fakeUser = { id: 'uuid-123', username: 'testuser' };
      mockedFindOrCreate.mockResolvedValue(fakeUser);
      mockedGenerateToken.mockReturnValue('fake_jwt_token');

      const response = await supertest(app)
        .get('/api/auth/github/callback?code=good-code')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe(
        'http://localhost:4530/auth/callback?token=fake_jwt_token',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.anything(),
        expect.anything(),
      );
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: { Authorization: 'Bearer fake_github_token' },
      });
      expect(mockedFindOrCreate).toHaveBeenCalled();
      expect(mockedGenerateToken).toHaveBeenCalledWith(fakeUser);
    });

    test('should redirect with error if axios call fails', async () => {
      // 1. Setup Mock to fail
      // Use mockImplementationOnce for a more explicit promise rejection
      mockedAxios.post.mockImplementationOnce(() => Promise.reject(new Error('Axios failed')));

      // 2. Run Test
      const response = await supertest(app)
        .get('/api/auth/github/callback?code=good-code')
        .redirects(0);

      // 3. Assert
      expect(response.status).toBe(302);
      expect(response.header.location).toBe(
        'http://localhost:4530/auth/callback?error=github_oauth_failed',
      );
    });

    test('missing code for callback', async () => {
      const response = await supertest(app).get('/api/auth/github/callback?code=').redirects(0);
      expect(response.status).toBe(400);
      expect(response.text).toBe('Authorization code missing.');
    });

    test('missing github client secret for callback', async () => {
      process.env.GITHUB_CLIENT_SECRET = '';
      const response = await supertest(app).get('/api/auth/github/callback?code=1').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });
  });

  describe('GET /google', () => {
    test('redirect the user to google auth page', async () => {
      const response = await supertest(app).get('/api/auth/google').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toMatch(
        /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/,
      );
    });

    test('missing google client id', async () => {
      process.env.GOOGLE_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/google').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    test('missing server url', async () => {
      process.env.SERVER_URL = '';
      const response = await supertest(app).get('/api/auth/google').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    test('missing all env variables', async () => {
      process.env.SERVER_URL = '';
      process.env.GOOGLE_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/google').redirects(0);
      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });
  });
});

import { app } from '../../app';
import supertest from 'supertest';
import axios from 'axios';
import { generateToken } from '../../utils/jwt.util';
import { findOrCreateOAuthUser } from '../../services/user.service';

jest.mock('axios');
jest.mock('../../utils/jwt.util');
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

  describe('GET /api/auth/github', () => {
    it('should redirect to GitHub auth page', async () => {
      const response = await supertest(app).get('/api/auth/github').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toMatch(/^https:\/\/github\.com\/login\/oauth/);
    });

    it('should return 500 if GitHub client ID is missing', async () => {
      process.env.GITHUB_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/github').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    it('should return 500 if server URL is missing', async () => {
      process.env.SERVER_URL = '';
      const response = await supertest(app).get('/api/auth/github').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });
  });

  describe('GET /api/auth/github/callback', () => {
    it('should successfully process callback and redirect with token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'fake_github_token' },
      });
      mockedAxios.get.mockImplementation((url: string) => {
        if (url === 'https://api.github.com/user') {
          return Promise.resolve({
            data: { id: 123, login: 'testuser', name: 'Test User', avatar_url: 'http://avatar.com', bio: 'bio' },
          });
        }
        if (url === 'https://api.github.com/user/emails') {
          return Promise.resolve({
            data: [{ email: 'test@user.com', primary: true, verified: true }],
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      mockedFindOrCreate.mockResolvedValue({ _id: 'uuid-123', username: 'testuser' });
      mockedGenerateToken.mockReturnValue('fake_jwt_token');

      const response = await supertest(app).get('/api/auth/github/callback?code=good-code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/fake_jwt_token');
    });

    it('should return 400 if code is missing', async () => {
      const response = await supertest(app).get('/api/auth/github/callback').redirects(0);

      expect(response.status).toBe(400);
      expect(response.text).toBe('Authorization code missing.');
    });

    it('should return 500 if client secret is missing', async () => {
      process.env.GITHUB_CLIENT_SECRET = '';
      const response = await supertest(app).get('/api/auth/github/callback?code=123').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    it('should redirect without token if token exchange fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Token exchange failed'));

      const response = await supertest(app).get('/api/auth/github/callback?code=bad-code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if access token is missing', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const response = await supertest(app).get('/api/auth/github/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if email fetch fails', async () => {
      mockedAxios.post.mockResolvedValue({ data: { access_token: 'token' } });
      mockedAxios.get.mockImplementation((url: string) => {
        if (url === 'https://api.github.com/user') {
          return Promise.resolve({ data: { id: 123, login: 'user' } });
        }
        return Promise.reject(new Error('Email fetch failed'));
      });

      const response = await supertest(app).get('/api/auth/github/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if user service returns error', async () => {
      mockedAxios.post.mockResolvedValue({ data: { access_token: 'token' } });
      mockedAxios.get.mockImplementation((url: string) => {
        if (url === 'https://api.github.com/user') {
          return Promise.resolve({ data: { id: 123, login: 'user' } });
        }
        return Promise.resolve({ data: [{ email: 'test@test.com', primary: true, verified: true }] });
      });
      mockedFindOrCreate.mockResolvedValue({ error: 'User creation failed' });

      const response = await supertest(app).get('/api/auth/github/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google auth page', async () => {
      const response = await supertest(app).get('/api/auth/google').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    });

    it('should return 500 if Google client ID is missing', async () => {
      process.env.GOOGLE_CLIENT_ID = '';
      const response = await supertest(app).get('/api/auth/google').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    it('should return 500 if server URL is missing', async () => {
      process.env.SERVER_URL = '';
      const response = await supertest(app).get('/api/auth/google').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should successfully process callback and redirect with token', async () => {
      mockedAxios.post.mockResolvedValue({ data: { access_token: 'fake_google_token' } });
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: 'google123',
          name: 'Test User',
          email: 'test@gmail.com',
          email_verified: true,
          picture: 'http://pic.com',
        },
      });
      mockedFindOrCreate.mockResolvedValue({ _id: 'uuid-456', username: 'googleuser' });
      mockedGenerateToken.mockReturnValue('fake_google_jwt');

      const response = await supertest(app).get('/api/auth/google/callback?code=google-code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/fake_google_jwt');
    });

    it('should return 400 if code is missing', async () => {
      const response = await supertest(app).get('/api/auth/google/callback').redirects(0);

      expect(response.status).toBe(400);
      expect(response.text).toBe('Authorization code missing.');
    });

    it('should return 500 if client secret is missing', async () => {
      process.env.GOOGLE_CLIENT_SECRET = '';
      const response = await supertest(app).get('/api/auth/google/callback?code=123').redirects(0);

      expect(response.status).toBe(500);
      expect(response.text).toBe('OAuth configuration error.');
    });

    it('should redirect without token if token exchange fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Token failed'));

      const response = await supertest(app).get('/api/auth/google/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if access token is missing', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const response = await supertest(app).get('/api/auth/google/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if email is not verified', async () => {
      mockedAxios.post.mockResolvedValue({ data: { access_token: 'token' } });
      mockedAxios.get.mockResolvedValue({
        data: { sub: '123', email: 'test@test.com', email_verified: false },
      });

      const response = await supertest(app).get('/api/auth/google/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });

    it('should redirect without token if user service returns error', async () => {
      mockedAxios.post.mockResolvedValue({ data: { access_token: 'token' } });
      mockedAxios.get.mockResolvedValue({
        data: { sub: '123', email: 'test@test.com', email_verified: true },
      });
      mockedFindOrCreate.mockResolvedValue({ error: 'Failed to create user' });

      const response = await supertest(app).get('/api/auth/google/callback?code=code').redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('http://localhost:4530/auth/callback/');
    });
  });
});

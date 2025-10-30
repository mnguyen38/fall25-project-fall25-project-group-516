import express, { Router, Request, Response } from 'express';
import axios from 'axios';
import { findOrCreateOAuthUser } from '../services/user.service'; //
import { generateToken } from '../utils/jwt'; //
import { UserResponse, OAuthUserProfile, GitHubEmail } from '../types/types'; //

/**
 * Controller for handling OAuth 2.0 authorization flows.
 * @returns {Router} An Express router instance with OAuth routes configured.
 */
const openAuthorizationController = () => {
  const router: Router = express.Router();

  const getGoogleAuthorization = async (_: Request, res: Response): Promise<void> => {
    const redirectUri = `${process.env.SERVER_URL}/api/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!redirectUri || !clientId) {
      console.error('Google OAuth environment variables are missing.');
      res.status(500).send('OAuth configuration error.');
      return;
    }

    const scope = 'openid%20email%20profile';

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    res.redirect(url);
  };

  /**
   * @route GET /api/auth/google/callback
   * @description Handles the callback from Google after user authorization.
   * Exchanges code for tokens, fetches user profile, finds/creates a user,
   * generates a JWT, and redirects to the frontend.
   */
  const getGoogleAuthorizationCallback = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4530';

    const redirectUri = `${process.env.SERVER_URL}/api/auth/google/callback`;

    if (!code) {
      res.status(400).send('Authorization code missing.');
      return;
    }
    if (!clientId || !clientSecret || !process.env.SERVER_URL) {
      console.error(
        'Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, SERVER_URL) are missing.',
      );
      res.status(500).send('OAuth configuration error.');
      return;
    }

    try {
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token } = tokenRes.data;
      if (!access_token) {
        throw new Error('Failed to retrieve Google access token.');
      }

      const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = userRes.data;

      if (!googleUser.email_verified) {
        throw new Error('Google account email is not verified.');
      }

      const userProfile: OAuthUserProfile = {
        id: googleUser.sub,
        username: googleUser.name,
        displayName: googleUser.name,
        email: googleUser.email,
        avatar_url: googleUser.picture,
        bio: '',
      };

      const userResult: UserResponse = await findOrCreateOAuthUser(
        'google',
        userProfile.id,
        userProfile,
      );

      if ('error' in userResult) {
        throw new Error(`User service error: ${userResult.error}`);
      }

      const token = generateToken(userResult);

      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OAuth error';
      console.error('Google OAuth Callback Error:', message);
      res.redirect(`${clientUrl}/auth/callback?error=google_oauth_failed`);
    }
  };

  /**
   * @route GET /api/auth/github
   * @description Redirects the user to GitHub's authorization page to start the OAuth flow.
   * Reads Client ID and Redirect URI from environment variables.
   * @param {Request} _ - Express request object (unused).
   * @param {Response} res - Express response object.
   * @returns {void} Sends a redirect response or a 500 error if configuration is missing.
   */
  const getGitHubAuthorization = async (_: Request, res: Response): Promise<void> => {
    const redirectUri = `${process.env.SERVER_URL}/api/auth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!redirectUri || !clientId) {
      console.error('GitHub OAuth environment variables are missing.');
      res.status(500).send('OAuth configuration error.');
      return;
    }

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    res.redirect(url);
  };

  /**
   * @route GET /api/auth/github/callback
   * @description Handles the callback from GitHub after user authorization.
   * Exchanges the received code for an access token, fetches user profile,
   * finds or creates a user in the local database, generates a JWT,
   * and redirects the user back to the frontend application.
   * @param {Request} req - Express request object, containing the 'code' in query parameters.
   * @param {Response} res - Express response object.
   * @returns {void} Sends a redirect response to the frontend with a token or an error.
   */
  const getGitHubAuthorizationCallback = async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4530';

    if (!code) {
      res.status(400).send('Authorization code missing.');
      return;
    }
    if (!clientId || !clientSecret) {
      console.error(
        'GitHub OAuth environment variables GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET are missing.',
      );
      res.status(500).send('OAuth configuration error.');
      return;
    }

    try {
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: { Accept: 'application/json' },
        },
      );

      const accessToken = tokenRes.data.access_token;
      if (!accessToken) {
        throw new Error(
          'Failed to retrieve GitHub access token. Response: ' + JSON.stringify(tokenRes.data),
        );
      }

      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const githubUser = userRes.data;

      let primaryEmail: string | undefined;
      try {
        const emailRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails: GitHubEmail[] = emailRes.data;
        primaryEmail = emails.find((e: GitHubEmail) => e.primary && e.verified)?.email;
      } catch (emailError) {
        console.warn('Could not fetch GitHub user emails:', emailError);
      }

      const userProfile: OAuthUserProfile = {
        id: githubUser.id.toString(),
        username: githubUser.login,
        displayName: githubUser.name,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
        bio: githubUser.bio,
      };

      const userResult: UserResponse = await findOrCreateOAuthUser(
        'github',
        userProfile.id,
        userProfile,
      );

      if ('error' in userResult) {
        throw new Error(`User service error: ${userResult.error}`);
      }

      const token = generateToken(userResult);

      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown OAuth error';
      console.error('GitHub OAuth Callback Error:', errorMessage);
      res.redirect(`${clientUrl}/auth/callback?error=github_oauth_failed`);
    }
  };

  router.get('/github', getGitHubAuthorization);
  router.get('/google', getGoogleAuthorization);
  router.get('/github/callback', getGitHubAuthorizationCallback);
  router.get('/google/callback', getGoogleAuthorizationCallback);

  return router;
};

export default openAuthorizationController;

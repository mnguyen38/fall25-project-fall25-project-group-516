import supertest from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import * as util from '../../services/user.service';
import * as badgeUtil from '../../services/badge.service';
import { PopulatedSafeDatabaseUser, User } from '../../types/types';
import { setupMockAuth } from '../../utils/mocks.util';
import UserModel from '../../models/users.model';

jest.mock('../../middleware/token.middleware');

const mockUser: User = {
  username: 'user1',
  password: 'password',
  dateJoined: new Date('2024-12-03'),
};

const mockSafeUser: PopulatedSafeDatabaseUser = {
  _id: new mongoose.Types.ObjectId(),
  username: 'user1',
  dateJoined: new Date('2024-12-03'),
};

const mockUserJSONResponse = {
  _id: mockSafeUser._id.toString(),
  username: 'user1',
  dateJoined: new Date('2024-12-03').toISOString(),
};

const saveUserSpy = jest.spyOn(util, 'saveUser');
const loginUserSpy = jest.spyOn(util, 'loginUser');
const updatedUserSpy = jest.spyOn(util, 'updateUser');
const getUserByUsernameSpy = jest.spyOn(util, 'getUserByUsername');
const getUsersListSpy = jest.spyOn(util, 'getUsersList');
const deleteUserByUsernameSpy = jest.spyOn(util, 'deleteUserByUsername');
const makeTransactionSpy = jest.spyOn(util, 'makeTransaction');
const blockUserSpy = jest.spyOn(util, 'blockUser');
const unblockUserSpy = jest.spyOn(util, 'unblockUser');

describe('Test userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockAuth();
  });

  describe('POST /signup', () => {
    it('should create a new user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
        biography: 'This is a test biography',
      };

      saveUserSpy.mockResolvedValueOnce({ ...mockSafeUser, biography: mockReqBody.biography });
      jest.spyOn(badgeUtil, 'checkAndAwardBadges').mockResolvedValueOnce([]);

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        ...mockUserJSONResponse,
        biography: mockReqBody.biography,
      });
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(saveUserSpy).toHaveBeenCalledWith({
        ...mockReqBody,
        biography: mockReqBody.biography,
        dateJoined: expect.any(Date),
      });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 500 for a database error while saving', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      saveUserSpy.mockResolvedValueOnce({ error: 'Error saving user' });

      const response = await supertest(app).post('/api/user/signup').send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /login', () => {
    it('should succesfully login for a user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      loginUserSpy.mockResolvedValueOnce(mockSafeUser);
      jest.spyOn(badgeUtil, 'checkAndAwardBadges').mockResolvedValueOnce([]);

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual(mockUserJSONResponse);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(loginUserSpy).toHaveBeenCalledWith(mockReqBody);
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 500 for a database error while saving', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      loginUserSpy.mockResolvedValueOnce({ error: 'Error authenticating user' });

      const response = await supertest(app).post('/api/user/login').send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /resetPassword', () => {
    it('should succesfully return updated user object given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      updatedUserSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockUserJSONResponse });
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, { password: 'newPassword' });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: 'newPassword',
      };

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: 'newPassword',
      };

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/password');
    });

    it('should return 500 for a database error while updating', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const response = await supertest(app).patch('/api/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /getUser', () => {
    it('should return the user given correct arguments', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).get(`/api/user/getUser/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    });

    it('should return 500 if database error while searching username', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce({ error: 'Error finding user' });

      const response = await supertest(app).get(`/api/user/getUser/${mockUser.username}`);

      expect(response.status).toBe(500);
    });

    it('should return 404 if username not provided', async () => {
      // Express automatically returns 404 for missing parameters when
      // defined as required in the route
      const response = await supertest(app).get('/api/user/getUser/');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /getUsers', () => {
    it('should return the users from the database', async () => {
      getUsersListSpy.mockResolvedValueOnce([mockSafeUser]);

      const response = await supertest(app).get(`/api/user/getUsers`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockUserJSONResponse]);
      expect(getUsersListSpy).toHaveBeenCalled();
    });

    it('should return 500 if database error while finding users', async () => {
      getUsersListSpy.mockResolvedValueOnce({ error: 'Error finding users' });

      const response = await supertest(app).get(`/api/user/getUsers`);

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /deleteUser', () => {
    it('should return the deleted user given correct arguments', async () => {
      deleteUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).delete(`/api/user/deleteUser/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(deleteUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    });

    it('should return 500 if database error while searching username', async () => {
      deleteUserByUsernameSpy.mockResolvedValueOnce({ error: 'Error deleting user' });

      const response = await supertest(app).delete(`/api/user/deleteUser/${mockUser.username}`);

      expect(response.status).toBe(500);
    });

    it('should return 404 if username not provided', async () => {
      // Express automatically returns 404 for missing parameters when
      // defined as required in the route
      const response = await supertest(app).delete('/api/user/deleteUser/');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /updateBiography', () => {
    it('should successfully update biography given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        biography: 'This is my new bio',
      };

      // Mock a successful updateUser call
      updatedUserSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).patch('/api/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      // Ensure updateUser is called with the correct args
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, {
        biography: 'This is my new bio',
      });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        biography: 'some new biography',
      };

      const response = await supertest(app).patch('/api/user/updateBiography').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        biography: 'a new bio',
      };

      const response = await supertest(app).patch('/api/user/updateBiography').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/username');
    });

    it('should return 400 for request missing biography field', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app).patch('/api/user/updateBiography').send(mockReqBody);

      const openApiError = JSON.parse(response.text);

      expect(response.status).toBe(400);
      expect(openApiError.errors[0].path).toBe('/body/biography');
    });

    it('should return 500 if updateUser returns an error', async () => {
      const mockReqBody = {
        username: mockUser.username,
        biography: 'Attempting update biography',
      };

      // Simulate a DB error
      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const response = await supertest(app).patch('/api/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.text).toContain(
        'Error when updating user biography: Error: Error updating user',
      );
    });
  });

  describe('PATCH /updateShowLoginStreak', () => {
    it('should successfully update showLoginStreak given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        showLoginStreak: false,
      };

      // Mock a successful updateUser call
      updatedUserSpy.mockResolvedValueOnce({ ...mockSafeUser, showLoginStreak: false });

      const response = await supertest(app)
        .patch('/api/user/updateShowLoginStreak')
        .send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockUserJSONResponse, showLoginStreak: false });
      // Ensure updateUser is called with the correct args
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, {
        showLoginStreak: false,
      });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        showLoginStreak: false,
      };

      const response = await supertest(app)
        .patch('/api/user/updateShowLoginStreak')
        .send(mockReqBody);

      expect(response.status).toBe(400);
    });

    it('should return 400 for request missing showLoginStreak field', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app)
        .patch('/api/user/updateShowLoginStreak')
        .send(mockReqBody);

      expect(response.status).toBe(400);
    });

    it('should return 500 if updateUser returns an error', async () => {
      const mockReqBody = {
        username: mockUser.username,
        showLoginStreak: false,
      };

      // Simulate a DB error
      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const response = await supertest(app)
        .patch('/api/user/updateShowLoginStreak')
        .send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  const mockSafeUserCoins: PopulatedSafeDatabaseUser = {
    _id: new mongoose.Types.ObjectId(),
    username: 'user1',
    dateJoined: new Date('2024-12-03'),
    coins: 5,
  };

  const mockSafeUserCoinsJSONResponse = {
    _id: mockSafeUserCoins._id.toString(),
    username: 'user1',
    dateJoined: new Date('2024-12-03').toISOString(),
    coins: 5,
  };

  describe('PATCH /addCoins', () => {
    it("should successfully update user's coins when given correct params", async () => {
      const mockReqBody = {
        username: mockSafeUserCoins.username,
        cost: 5,
      };

      makeTransactionSpy.mockResolvedValueOnce(mockSafeUserCoins);

      const res = await supertest(app).patch('/api/user/addCoins').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSafeUserCoinsJSONResponse);
      expect(makeTransactionSpy).toHaveBeenCalledWith(mockSafeUserCoins.username, 5, 'add');
    });

    it('should return 400 for request with missing username', async () => {
      const mockReqBody = {
        cost: 5,
      };

      const res = await supertest(app).patch('/api/user/addCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 400 for request with missing cost', async () => {
      const mockReqBody = {
        cost: 5,
      };

      const res = await supertest(app).patch('/api/user/addCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 400 if no params given', async () => {
      const res = await supertest(app).patch('/api/user/addCoins').send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for request with negative cost', async () => {
      const mockReqBody = {
        cost: -5,
      };

      const res = await supertest(app).patch('/api/user/addCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 500 if database error while making transaction', async () => {
      const mockReqBody = {
        username: mockSafeUserCoins.username,
        cost: 5,
      };

      makeTransactionSpy.mockResolvedValueOnce({ error: 'Error making transaction' });

      const res = await supertest(app).patch('/api/user/addCoins').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /reduceCoins', () => {
    it("should successfully update user's coins when given correct params", async () => {
      const mockReqBody = {
        username: mockSafeUserCoins.username,
        cost: 5,
      };

      makeTransactionSpy.mockResolvedValueOnce(mockSafeUserCoins);

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSafeUserCoinsJSONResponse);
      expect(makeTransactionSpy).toHaveBeenCalledWith(mockSafeUserCoins.username, 5, 'reduce');
    });

    it('should return 400 for request with missing username', async () => {
      const mockReqBody = {
        cost: 5,
      };

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 400 for request with missing cost', async () => {
      const mockReqBody = {
        username: 'user1',
      };

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 400 for request with negative cost', async () => {
      const mockReqBody = {
        username: 'user1',
        cost: -5,
      };

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 402 when user does not have enough coins', async () => {
      const mockReqBody = {
        username: 'user1',
        cost: 40,
      };

      makeTransactionSpy.mockResolvedValueOnce({ error: 'Not enough coins to make transaction.' });

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(402);
    });

    it('should return 500 if database error while making transaction', async () => {
      const mockReqBody = {
        username: mockSafeUserCoins.username,
        cost: 5,
      };

      makeTransactionSpy.mockResolvedValueOnce({ error: 'Error making transaction' });

      const res = await supertest(app).patch('/api/user/reduceCoins').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /toggleStreakHold', () => {
    it('should successfully return updated user', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
      };

      getUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      updatedUserSpy.mockResolvedValueOnce({
        ...mockSafeUser,
        streakHold: !mockSafeUser.streakHold,
      });

      const res = await supertest(app).patch('/api/user/toggleStreakHold').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(updatedUserSpy).toHaveBeenCalledWith(mockSafeUser.username, {
        streakHold: !mockSafeUser.streakHold,
      });
    });

    it('should return 400 for request missing username', async () => {
      const res = await supertest(app).patch('/api/user/toggleStreakHold').send({});

      expect(res.status).toBe(400);
    });

    it('should return 500 if error getting user', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
      };

      getUserByUsernameSpy.mockResolvedValueOnce({ error: 'Error getting user' });

      const res = await supertest(app).patch('/api/user/toggleStreakHold').send(mockReqBody);

      expect(res.status).toBe(500);
    });

    it('should return 500 if error updated user', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
      };

      getUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const res = await supertest(app).patch('/api/user/toggleStreakHold').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /activatePremium', () => {
    const mockReqBody = {
      username: mockSafeUser.username,
    };

    const nonPremiumSafeUser = {
      ...mockSafeUser,
      premiumProfile: false,
    };

    const premiumSafeUser = {
      ...mockSafeUser,
      premiumProfile: true,
    };

    it('should return updated user if username of non-premium user is given', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(nonPremiumSafeUser);

      updatedUserSpy.mockResolvedValueOnce({ ...nonPremiumSafeUser, premiumProfile: true });

      const res = await supertest(app).patch('/api/user/activatePremium').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(updatedUserSpy).toHaveBeenCalledWith(mockSafeUser.username, {
        premiumProfile: true,
        streakPass: 3,
      });
    });

    it('should return 400 if request missing username', async () => {
      const res = await supertest(app).patch('/api/user/activatePremium').send({});

      expect(res.status).toBe(400);
    });

    it('should return 402 if username of premium user is given', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(premiumSafeUser);

      const res = await supertest(app).patch('/api/user/activatePremium').send(mockReqBody);

      expect(res.status).toBe(402);
    });

    it('should return 500 if error occurs when getting user', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce({ error: 'Error getting user' });

      const res = await supertest(app).patch('/api/user/activatePremium').send(mockReqBody);

      expect(res.status).toBe(500);
    });

    it('should return 500 if error occurs when updating user', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(nonPremiumSafeUser);

      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const res = await supertest(app).patch('/api/user/activatePremium').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /decrementStreakPasses', () => {
    const mockReqBody = {
      username: mockSafeUser.username,
    };

    const userWithPass = {
      ...mockSafeUser,
      streakPass: 3,
    };

    const userWithNoPass = {
      ...mockSafeUser,
      streakPass: 0,
    };

    it('should return updated user when username of user with streak passes is given', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(userWithPass);
      updatedUserSpy.mockResolvedValueOnce({ ...userWithPass, streakPass: 2 });

      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(updatedUserSpy).toHaveBeenCalledWith(mockSafeUser.username, { streakPass: 2 });
    });

    it('should return 400 if request missing username', async () => {
      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send({});

      expect(res.status).toBe(400);
    });

    it('should return 402 when username of user with 0 streakPasses is given', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(userWithNoPass);
      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send(mockReqBody);

      expect(res.status).toBe(402);
    });

    it('should return 402 when username of user with undefined streakPasses is given', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send(mockReqBody);

      expect(res.status).toBe(402);
    });

    it('should return 500 when there is an error getting user', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce({ error: 'Error getting user' });

      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send(mockReqBody);

      expect(res.status).toBe(500);
    });

    it('should return 500 when there is an error updating user', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(userWithPass);
      updatedUserSpy.mockResolvedValueOnce({ error: 'Error getting user' });

      const res = await supertest(app).patch('/api/user/decrementStreakPasses').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /resetLoginStreak', () => {
    const mockReqBody = {
      username: mockSafeUser.username,
    };

    it('should return updated user when username given', async () => {
      updatedUserSpy.mockResolvedValueOnce({ ...mockSafeUser, loginStreak: 1 });

      const res = await supertest(app).patch('/api/user/resetLoginStreak').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(updatedUserSpy).toHaveBeenCalledWith(mockSafeUser.username, { loginStreak: 1 });
    });

    it('should return 400 when request missing username', async () => {
      const res = await supertest(app).patch('/api/user/resetLoginStreak').send({});

      expect(res.status).toBe(400);
    });

    it('should return 500 if there is an error updating user', async () => {
      updatedUserSpy.mockResolvedValueOnce({ error: 'Error updating user' });

      const res = await supertest(app).patch('/api/user/resetLoginStreak').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /blockUser', () => {
    const blockingUser = {
      ...mockSafeUser,
      blockedUsers: [],
    };

    const targetUser = {
      ...mockSafeUser,
      _id: new mongoose.Types.ObjectId(),
      username: 'targetUser',
    };

    it('should return updated user when username & target username are given and valid', async () => {
      const mockReqBody = { username: mockSafeUser.username, targetUsername: targetUser.username };
      blockUserSpy.mockResolvedValueOnce(blockingUser);

      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(blockUserSpy).toHaveBeenCalledWith(mockSafeUser.username, targetUser.username);
    });

    it('should return 400 when request is missing username', async () => {
      const res = await supertest(app)
        .patch('/api/user/blockUser')
        .send({ targetUsername: targetUser.username });

      expect(res.status).toBe(400);
    });

    it('should return 400 when request is missing targetUsername', async () => {
      const res = await supertest(app).patch('/api/user/blockUser').send({ username: 'user123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when username is the same as targetUsername', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
        targetUsername: mockSafeUser.username,
      };

      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 404 when target user not found', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
        targetUsername: targetUser.username,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);
      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(404);
    });

    it('should return 404 when user not found', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
        targetUsername: targetUser.username,
      };
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);
      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(404);
    });

    it('should return 409 when user is already blocked', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
        targetUsername: targetUser.username,
      };
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValueOnce({ ...blockingUser, blockedUsers: [targetUser.username] });
      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(409);
    });

    it('should return 500 when any other error is thrown', async () => {
      const mockReqBody = {
        username: mockSafeUser.username,
        targetUsername: targetUser.username,
      };
      blockUserSpy.mockRejectedValueOnce({ error: 'some other error' });
      const res = await supertest(app).patch('/api/user/blockUser').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /unblockUser', () => {
    const targetUser = {
      ...mockSafeUser,
      _id: new mongoose.Types.ObjectId(),
      username: 'targetUser',
    };

    const blockingUser = {
      ...mockSafeUser,
      blockedUsers: [targetUser.username],
    };

    it('should return updated user when username and target username are given and valid', async () => {
      const mockReqBody = { username: blockingUser.username, targetUsername: targetUser.username };
      unblockUserSpy.mockResolvedValueOnce(blockingUser);
      const res = await supertest(app).patch('/api/user/unblockUser').send(mockReqBody);

      expect(res.status).toBe(200);
      expect(unblockUserSpy).toHaveBeenCalledWith(blockingUser.username, targetUser.username);
    });

    it('should return 400 when request is missing username', async () => {
      const mockReqBody = { targetUsername: targetUser.username };

      const res = await supertest(app).patch('/api/user/unblockUser').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 400 when request is missing target username', async () => {
      const mockReqBody = { username: targetUser.username };

      const res = await supertest(app).patch('/api/user/unblockUser').send(mockReqBody);

      expect(res.status).toBe(400);
    });

    it('should return 500 when unblockError throws error', async () => {
      const mockReqBody = { username: blockingUser.username, targetUsername: targetUser.username };
      unblockUserSpy.mockResolvedValueOnce({ error: 'Error unblocking user' });
      const res = await supertest(app).patch('/api/user/unblockUser').send(mockReqBody);

      expect(res.status).toBe(500);
    });
  });
});

import mongoose, { Aggregate, Query } from 'mongoose';
import UserModel from '../../models/users.model';
import {
  deleteUserByUsername,
  findOrCreateOAuthUser,
  getUserByUsername,
  // getUserRolesById, // Commented out - roles system removed
  getUsersList,
  loginUser,
  makeTransaction,
  readNotifications,
  saveUser,
  updateUser,
  updateUserStatus,
  getUserIfTopContributor,
  blockUser,
  unblockUser,
} from '../../services/user.service';
import * as util from '../../utils/database.util';
import { DatabaseUser, PopulatedSafeDatabaseUser, User, UserCredentials } from '../../types/types';
import { user, safeUser } from '../mockData.models';
import { ObjectId } from 'mongodb';
import NotificationModel from '../../models/notifications.model';

describe('User model', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('saveUser', () => {
    it('should return the saved user', async () => {
      jest.spyOn(UserModel, 'create').mockResolvedValueOnce({
        ...safeUser,
        _id: new mongoose.Types.ObjectId(),
      } as unknown as ReturnType<typeof UserModel.create<User>>);

      const savedUser = (await saveUser(user)) as PopulatedSafeDatabaseUser;

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toEqual(user.username);
      expect(savedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if error when saving to database', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockRejectedValueOnce(() => new Error('Error saving document'));

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });

    it('should return error when create returns null', async () => {
      jest.spyOn(UserModel, 'create').mockResolvedValueOnce(null as any);

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });
  });
  describe('getUserByUsername', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return the matching user', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: safeUser._id }),
      } as any);

      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(safeUser) }),
      } as any);

      const retrievedUser = (await getUserByUsername(user.username)) as PopulatedSafeDatabaseUser;

      expect(retrievedUser.username).toEqual(user.username);
      expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if the populated user is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: safeUser._id }),
      } as any);

      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const getUserError = await getUserByUsername(user.username);

      expect('error' in getUserError).toBe(true);
    });

    it('should throw an error if the user is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const getUserError = await getUserByUsername(user.username);

      expect('error' in getUserError).toBe(true);
    });

    it('should return error when findOne returns null with select', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const getUserError = await getUserByUsername(user.username);

      expect('error' in getUserError).toBe(true);
    });

    it('should throw an error if there is an error while searching the database', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Error finding document')),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const getUserError = await getUserByUsername(user.username);

      expect('error' in getUserError).toBe(true);
    });
  });

  describe('getUsersList', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return the users', async () => {
      jest.spyOn(UserModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([safeUser]),
      } as unknown as Query<PopulatedSafeDatabaseUser[], typeof UserModel>);

      const retrievedUsers = (await getUsersList()) as PopulatedSafeDatabaseUser[];

      expect(retrievedUsers[0].username).toEqual(safeUser.username);
      expect(retrievedUsers[0].dateJoined).toEqual(safeUser.dateJoined);
    });

    it('should throw an error if the users cannot be found', async () => {
      jest.spyOn(UserModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<PopulatedSafeDatabaseUser[], typeof UserModel>);

      const getUsersError = await getUsersList();

      expect('error' in getUsersError).toBe(true);
    });

    it('should throw an error if there is an error while searching the database', async () => {
      jest.spyOn(UserModel, 'find').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Error finding documents')),
      } as unknown as Query<PopulatedSafeDatabaseUser[], typeof UserModel>);

      const getUsersError = await getUsersList();

      expect('error' in getUsersError).toBe(true);
    });
  });

  describe('readNotifications', () => {
    it('should mark notifications as read and return user', async () => {
      const mockSafeUser = { ...safeUser };
      jest.spyOn(UserModel, 'updateOne').mockResolvedValue({ matchedCount: 1 } as any);
      jest.spyOn(UserModel, 'findOne').mockResolvedValue({ _id: 'some_id' });
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(safeUser) }),
      } as any);

      const result = await readNotifications('testuser', ['69234f2ef67e4a8b712d71d0']);
      expect(result).toEqual(mockSafeUser);
    });

    it('should throw error if user not found during update', async () => {
      jest.spyOn(UserModel, 'updateOne').mockResolvedValue({ matchedCount: 0 } as any);
      const result = await readNotifications('testuser', ['69234f2ef67e4a8b712d71d0']);
      expect('error' in result).toBe(true);
    });
    it('should throw error if user not found during fetch', async () => {
      jest.spyOn(UserModel, 'updateOne').mockResolvedValue({ matchedCount: 1 } as any);
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
      const result = await readNotifications('testuser', ['69234f2ef67e4a8b712d71d0']);

      expect('error' in result).toBe(true);
    });
  });

  describe('updateUserStatus', () => {
    it('should update status successfully', async () => {
      const statusUser = { ...safeUser, status: 'busy' };
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(statusUser),
      } as any);

      const result = await updateUserStatus('testuser', 'busy');
      expect(result).toEqual(statusUser);
    });

    it('should return error if update failed', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await updateUserStatus('testuser', 'busy');
      expect('error' in result).toBe(true);
    });
  });

  describe('loginUser - Streak Logic', () => {
    const mockNow = new Date('2025-01-10T12:00:00Z');

    beforeEach(() => {
      jest.resetAllMocks();
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should maintain the same streak if logging in on same day & not activate streak hold', async () => {
      const threeHoursAgo = new Date(mockNow);
      threeHoursAgo.setHours(mockNow.getHours() - 3);
      const returningUser = {
        ...user,
        _id: 'user-id',
        lastLogin: threeHoursAgo,
        loginStreak: 10,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(returningUser);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            streakHold: false,
            missedDays: 0,
            loginStreak: 10,
          }),
        }),
      );
    });

    it('should increase streak by one if logging in one day later', async () => {
      const oneDayAgo = new Date(mockNow);
      oneDayAgo.setDate(mockNow.getDate() - 1);
      const returningUser = {
        ...user,
        _id: 'user-id',
        lastLogin: oneDayAgo,
        loginStreak: 10,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(returningUser);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            streakHold: false,
            missedDays: 0,
            loginStreak: 11,
          }),
        }),
      );
    });

    it('should use streak pass if missed days <= 7 and user has a pass', async () => {
      const threeDaysAgo = new Date(mockNow);
      threeDaysAgo.setDate(mockNow.getDate() - 3);

      const userWithPass = {
        ...user,
        _id: 'user-id',
        lastLogin: threeDaysAgo,
        loginStreak: 10,
        streakPass: 1,
        coins: 0,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(userWithPass);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            streakHold: true,
            missedDays: 3,
            loginStreak: 10,
          }),
        }),
      );
    });

    it('should use coins if missed days <= 7, no pass, but enough coins', async () => {
      const threeDaysAgo = new Date(mockNow);
      threeDaysAgo.setDate(mockNow.getDate() - 3);

      const userWithCoins = {
        ...user,
        _id: 'user-id',
        lastLogin: threeDaysAgo,
        loginStreak: 10,
        streakPass: 0,
        coins: 100,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(userWithCoins);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            streakHold: true,
            missedDays: 3,
            loginStreak: 10,
          }),
        }),
      );
    });

    it('should reset streak if missed days <= 7 but no pass and not enough coins', async () => {
      const threeDaysAgo = new Date(mockNow);
      threeDaysAgo.setDate(mockNow.getDate() - 3);

      const poorUser = {
        ...user,
        _id: 'user-id',
        lastLogin: threeDaysAgo,
        loginStreak: 10,
        streakPass: 0,
        coins: 5,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(poorUser);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            loginStreak: 1,
          }),
        }),
      );
    });

    it('should reset streak if missed days > 7', async () => {
      const longAgo = new Date(mockNow);
      longAgo.setDate(mockNow.getDate() - 10);

      const userLongGone = {
        ...user,
        _id: 'user-id',
        lastLogin: longAgo,
        loginStreak: 10,
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(userLongGone);
      const updateSpy = jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValue({ acknowledged: true } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          lean: jest.fn().mockResolvedValue(safeUser),
        }),
      } as any);

      await loginUser({ username: user.username, password: user.password });

      expect(updateSpy).toHaveBeenCalledWith(
        { username: user.username },
        expect.objectContaining({
          $set: expect.objectContaining({
            loginStreak: 1,
          }),
        }),
      );
    });
  });

  describe('findOrCreateOAuthUser', () => {
    const oauthProfile = {
      id: '123',
      email: 'test@example.com',
      username: 'gh_user',
      bio: 'Test Bio',
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return existing OAuth user', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
        if (query.oauthProvider && query.oauthId) {
          return {
            select: jest.fn().mockResolvedValue(safeUser),
          } as any;
        }
        return Promise.resolve(null);
      });

      const result = await findOrCreateOAuthUser('github', '123', oauthProfile as any);

      expect(result).toEqual(safeUser);
      expect(UserModel.findOne).toHaveBeenCalledWith({
        oauthProvider: 'github',
        oauthId: '123',
      });
    });

    it('should link to existing email user if found', async () => {
      const existingEmailUser = { ...safeUser, username: 'existing_user' };

      jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
        if (query.oauthProvider) {
          return { select: jest.fn().mockResolvedValue(null) } as any;
        }

        if (query.email) {
          return { select: jest.fn().mockResolvedValue(existingEmailUser) } as any;
        }
        return Promise.resolve(null);
      });

      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(existingEmailUser),
      } as any);

      const result = await findOrCreateOAuthUser('github', '123', oauthProfile as any);

      expect(result).toEqual(existingEmailUser);
      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { username: existingEmailUser.username },
        expect.objectContaining({ $set: { oauthProvider: 'github', oauthId: '123' } }),
        expect.anything(),
      );
    });

    it('should create new user if no match found', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
        if (query.oauthProvider || query.email) {
          return { select: jest.fn().mockResolvedValue(null) } as any;
        }

        if (query.username) {
          return Promise.resolve(null);
        }

        return Promise.resolve(null);
      });

      jest.spyOn(UserModel, 'create').mockResolvedValue({
        ...safeUser,
        _id: 'new-id',
        username: 'gh_user',
      } as any);

      const result = await findOrCreateOAuthUser('github', '123', oauthProfile as any);

      expect(result).toHaveProperty('_id', 'new-id');
      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'gh_user',
          oauthProvider: 'github',
        }),
      );
    });
  });

  // describe('getUserRolesById', () => {
  //   it('should return roles if user found', async () => {
  //     const rolesData = { roles: ['admin'] };
  //     jest.spyOn(UserModel, 'findById').mockReturnValue({
  //       select: jest.fn().mockResolvedValue(rolesData),
  //     } as any);

  //     const result = await getUserRolesById('user-id');
  //     expect(result).toEqual(rolesData);
  //   });

  //   it('should return error if user not found', async () => {
  //     jest.spyOn(UserModel, 'findById').mockReturnValue({
  //       select: jest.fn().mockResolvedValue(null),
  //     } as any);

  //     const result = await getUserRolesById('user-id');
  //     expect('error' in result).toBe(true);
  //   });
  // });
  describe('loginUser', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return the user if authentication succeeds', async () => {
      const rawUser = {
        _id: 'user-123',
        username: 'testuser',
        password: 'hashedpassword',
        lastLogin: new Date('2025-10-31'),
        loginStreak: 5,
        maxLoginStreak: 10,
        notifications: [],
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(rawUser);

      jest.spyOn(UserModel, 'updateOne').mockResolvedValueOnce({
        acknowledged: true,
        modifiedCount: 1,
      } as any);
      jest.spyOn(UserModel, 'findById').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({ lean: jest.fn().mockResolvedValueOnce(rawUser) }),
      } as any);

      jest.spyOn(NotificationModel, 'findOne').mockResolvedValueOnce(null);

      const credentials: UserCredentials = {
        username: user.username,
        password: user.password,
      };

      const loggedInUser = await loginUser(credentials);

      expect(loggedInUser).toStrictEqual({ ...rawUser });
    });

    it('should return the user if the password fails', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const credentials: UserCredentials = {
        username: user.username,
        password: 'wrongPassword',
      };

      const loginError = await loginUser(credentials);

      expect('error' in loginError).toBe(true);
    });

    it('should return the user is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const credentials: UserCredentials = {
        username: 'wrongUsername',
        password: user.password,
      };

      const loginError = await loginUser(credentials);

      expect('error' in loginError).toBe(true);
    });

    it('should return error when findOne returns null with select in loginUser', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username && filter.password) {
          return Promise.resolve(null);
        }
        const query: any = {};
        query.select = jest.fn().mockResolvedValueOnce(null);
        return query;
      });

      const credentials: UserCredentials = {
        username: user.username,
        password: user.password,
      };

      const loginError = await loginUser(credentials);

      expect('error' in loginError).toBe(true);
    });
  });

  describe('deleteUserByUsername', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return the deleted user when deleted succesfully', async () => {
      jest.spyOn(UserModel, 'findOneAndDelete').mockImplementation((filter?: any) => {
        expect(filter.username).toBeDefined();
        const query: any = {};
        query.select = jest.fn().mockReturnValue(Promise.resolve(safeUser));
        return query;
      });

      const deletedUser = (await deleteUserByUsername(user.username)) as PopulatedSafeDatabaseUser;

      expect(deletedUser.username).toEqual(user.username);
      expect(deletedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if the username is not found', async () => {
      jest.spyOn(UserModel, 'findOneAndDelete').mockResolvedValue(null);

      const deletedError = await deleteUserByUsername(user.username);

      expect('error' in deletedError).toBe(true);
    });

    it('should return error when findOneAndDelete returns null with select', async () => {
      jest.spyOn(UserModel, 'findOneAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const deletedError = await deleteUserByUsername(user.username);

      expect('error' in deletedError).toBe(true);
    });

    it('should throw an error if a database error while deleting', async () => {
      jest.spyOn(UserModel, 'findOneAndDelete').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Error deleting document')),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const deletedError = await deleteUserByUsername(user.username);

      expect('error' in deletedError).toBe(true);
    });
  });

  describe('updateUser', () => {
    const updatedUser: User = {
      ...user,
      password: 'newPassword',
    };

    const safeUpdatedUser: PopulatedSafeDatabaseUser = {
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      dateJoined: user.dateJoined,
    };

    const updates: Partial<User> = {
      password: 'newPassword',
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return the updated user when updated succesfully', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockImplementation((filter?: any) => {
        expect(filter.username).toBeDefined();
        const query: any = {};
        query.select = jest.fn().mockReturnValue(Promise.resolve(safeUpdatedUser));
        return query;
      });

      const result = (await updateUser(user.username, updates)) as PopulatedSafeDatabaseUser;

      expect(result.username).toEqual(user.username);
      expect(result.username).toEqual(updatedUser.username);
      expect(result.dateJoined).toEqual(user.dateJoined);
      expect(result.dateJoined).toEqual(updatedUser.dateJoined);
    });

    it('should throw an error if the username is not found', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const updatedError = await updateUser(user.username, updates);

      expect('error' in updatedError).toBe(true);
    });

    it('should return error when findOneAndUpdate returns null with select', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const updatedError = await updateUser(user.username, updates);

      expect('error' in updatedError).toBe(true);
    });

    it('should throw an error if a database error while deleting', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Error updating document')),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const updatedError = await updateUser(user.username, updates);

      expect('error' in updatedError).toBe(true);
    });

    it('should update the biography if the user is found', async () => {
      const newBio = 'This is a new biography';
      const biographyUpdates: Partial<User> = { biography: newBio };
      jest.spyOn(UserModel, 'findOneAndUpdate').mockImplementation((filter?: any) => {
        expect(filter.username).toBeDefined();
        const query: any = {};
        query.select = jest
          .fn()
          .mockReturnValue(Promise.resolve({ ...safeUpdatedUser, biography: newBio }));
        return query;
      });

      const result = await updateUser(user.username, biographyUpdates);

      if ('username' in result) {
        expect(result.biography).toEqual(newBio);
      } else {
        throw new Error('Expected a safe user, got an error object.');
      }
    });

    it('should return an error if biography update fails because user not found', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const newBio = 'No user found test';
      const biographyUpdates: Partial<User> = { biography: newBio };
      const updatedError = await updateUser(user.username, biographyUpdates);

      expect('error' in updatedError).toBe(true);
    });
  });

  describe('makeTransaction', () => {
    const userWithCoins: DatabaseUser = {
      ...user,
      _id: new mongoose.Types.ObjectId(),
      coins: 10,
      notifications: [],
    };

    const safeUpdatedUser: PopulatedSafeDatabaseUser = {
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      dateJoined: user.dateJoined,
      coins: 20,
    };

    const safeUpdatedUser2: PopulatedSafeDatabaseUser = {
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      dateJoined: user.dateJoined,
      coins: 0,
    };

    const findOneUpdateSpy = jest.spyOn(UserModel, 'findOneAndUpdate');

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should add coins when user has coins', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username) {
          return Promise.resolve({ ...user, _id: new mongoose.Types.ObjectId(), coins: 10 }) as any;
        } else {
          return Promise.resolve(null);
        }
      });

      findOneUpdateSpy.mockImplementation((filter?: any) => {
        if (filter.username) {
          const query: any = {};
          query.select = jest.fn().mockResolvedValue(safeUpdatedUser);
          return query;
        } else {
          return Promise.resolve(null);
        }
      });

      const result = await makeTransaction(user.username, 5, 'add');

      expect(result).toBeDefined();
      expect(findOneUpdateSpy).toHaveBeenCalledWith(
        { username: user.username },
        { $set: { coins: 15 } },
        { new: true },
      );
    });

    it('should add coins when user has no coins', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username) {
          return Promise.resolve({ ...user, _id: new mongoose.Types.ObjectId() }) as any;
        } else {
          return Promise.resolve(null);
        }
      });

      findOneUpdateSpy.mockImplementation((filter?: any) => {
        if (filter.username) {
          const query: any = {};
          query.select = jest.fn().mockResolvedValue(safeUpdatedUser);
          return query;
        } else {
          return Promise.resolve(null);
        }
      });

      const result = await makeTransaction(user.username, 5, 'add');

      expect(result).toBeDefined();
      expect(findOneUpdateSpy).toHaveBeenCalledWith(
        { username: user.username },
        { $set: { coins: 5 } },
        { new: true },
      );
    });

    it('should reduce coins when user has enough', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username) {
          return Promise.resolve({ ...user, _id: new mongoose.Types.ObjectId(), coins: 10 }) as any;
        } else {
          return Promise.resolve(null);
        }
      });

      findOneUpdateSpy.mockImplementation((filter?: any) => {
        if (filter.username) {
          const query: any = {};
          query.select = jest.fn().mockResolvedValue(safeUpdatedUser2);
          return query;
        } else {
          return Promise.resolve(null);
        }
      });

      const result = await makeTransaction(user.username, 5, 'reduce');

      expect(result).toBeDefined();
      expect('error' in result).toBe(false);
      expect(findOneUpdateSpy).toHaveBeenCalledWith(
        { username: user.username },
        { $set: { coins: 5 } },
        { new: true },
      );
    });

    it('should return not enough coins error if user does not have enough', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username) {
          return Promise.resolve({ ...user, _id: new mongoose.Types.ObjectId(), coins: 10 }) as any;
        } else {
          return Promise.resolve(null);
        }
      });

      const err = await makeTransaction(user.username, 20, 'reduce');

      expect('error' in err).toBe(true);
      expect(err).toEqual({ error: 'Not enough coins to make transaction' });
    });

    it('should return not enough coins error if user has no coins', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
        if (filter.username) {
          return Promise.resolve({ ...user, _id: new mongoose.Types.ObjectId() }) as any;
        } else {
          return Promise.resolve(null);
        }
      });

      const err = await makeTransaction(user.username, 5, 'reduce');

      expect('error' in err).toBe(true);
      expect(err).toEqual({ error: 'Not enough coins to make transaction' });
    });

    it('should return error if findOne returns null', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const transactionError = await makeTransaction(user.username, 10, 'add');

      expect('error' in transactionError).toBe(true);
    });

    it('should return error if findOneAndUpdate returns null', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementationOnce((filter?: any) => {
        if (filter.username) {
          const query: any = {};
          query.select = jest.fn().mockResolvedValue(userWithCoins);
          return query;
        } else {
          return Promise.resolve(null);
        }
      });

      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const transactionError = await makeTransaction(user.username, 10, 'add');

      expect('error' in transactionError).toBe(true);
    });

    test('should return an error if a database error occurs when finding the user', async () => {
      jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('Error finding user'));

      const transactionError = await makeTransaction(user.username, 10, 'add');

      expect(transactionError).toEqual({ error: 'Error finding user' });
    });

    it('should throw an error if a database error occurs when updating the user', async () => {
      jest.spyOn(UserModel, 'findOne').mockImplementationOnce((filter?: any) => {
        if (filter.username) {
          const query: any = {};
          query.select = jest.fn().mockResolvedValue(userWithCoins);
          return query;
        } else {
          return Promise.resolve(null);
        }
      });

      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Error finding user')),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const transactionError = await makeTransaction(user.username, 10, 'add');

      expect('error' in transactionError).toBe(true);
    });
  });

  describe('getUserIfTopContribution', () => {
    const safeUser: DatabaseUser = {
      ...user,
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      dateJoined: user.dateJoined,
      notifications: [],
    };

    it("should return user if user's lifeUpvotes exceed average", async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }
      const mockAverage = [{ averageValue: 4 }];
      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAverage),
      } as unknown as Aggregate<AverageResult[]>);

      jest.spyOn(UserModel, 'findOne').mockResolvedValue({ ...safeUser, lifeUpvotes: 5 });

      const result = await getUserIfTopContributor(safeUser.username);

      expect(result).toStrictEqual({ ...safeUser, lifeUpvotes: 5 });
    });

    it('should return null if not top contributor', async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }
      const mockAverage = [{ averageValue: 4 }];
      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAverage),
      } as unknown as Aggregate<AverageResult[]>);

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });

    it('should throw error if aggregate returns an empty list', async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }
      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as unknown as Aggregate<AverageResult[]>);

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });

    it("should throw error if aggregate doesn't return average", async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }
      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([{}]),
      } as unknown as Aggregate<AverageResult[]>);

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });

    it('should throw error if aggregate returns null', async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }

      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockRejectedValue(null),
      } as unknown as Aggregate<AverageResult[]>);

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });

    it('should throw error if aggregate throws error', async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }

      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Could not find average')),
      } as unknown as Aggregate<AverageResult[]>);

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });

    it('should throw error if findOne throws error', async () => {
      interface AverageResult {
        _id: null;
        averageValue: number;
      }
      const mockAverage = [{ averageValue: 4 }];
      jest.spyOn(UserModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAverage),
      } as unknown as Aggregate<AverageResult[]>);

      jest.spyOn(UserModel, 'findOne').mockRejectedValue(new Error('User search failed'));

      const result = await getUserIfTopContributor(safeUser.username);

      expect('error' in result).toBe(true);
    });
  });

  describe('blockUser', () => {
    const mockUser: DatabaseUser = {
      ...user,
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      notifications: [],
    };

    const targetUser: DatabaseUser = {
      ...user,
      _id: new mongoose.Types.ObjectId(),
      username: 'targetUser',
      notifications: [],
    };

    it('should return updated user if target user is not the user and is not already blocked', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(mockUser);
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValueOnce({ ...mockUser, blockedUsers: [targetUser.username] }),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const result = await blockUser(mockUser.username, targetUser.username);

      expect(result).toBeDefined();
      expect(result).toStrictEqual({ ...mockUser, blockedUsers: [targetUser.username] });
    });

    it('should return error if targetUsername equals username', async () => {
      const result = await blockUser(mockUser.username, mockUser.username);

      expect('error' in result).toBe(true);
    });

    it('should return error if target user cannot be found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);
      const result = await blockUser(mockUser.username, targetUser.username);

      expect('error' in result).toBe(true);
    });

    it('should return error if target user is already blocked', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValueOnce({ ...mockUser, blockedUsers: [targetUser.username] });
      const result = await blockUser(mockUser.username, targetUser.username);

      expect('error' in result).toBe(true);
    });

    it('should return error if user cannot be found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);
      const result = await blockUser(mockUser.username, targetUser.username);

      expect('error' in result).toBe(true);
    });

    it('should throw error if blockedUser fails to update', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(targetUser);
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(mockUser);
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValueOnce(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const result = await blockUser(mockUser.username, targetUser.username);

      expect('error' in result).toBe(true);
    });
  });

  describe('unblockUser', () => {
    const mockUser: DatabaseUser = {
      ...user,
      _id: new mongoose.Types.ObjectId(),
      username: user.username,
      notifications: [],
      blockedUsers: ['targetUser'],
    };

    it('should return updated user if target user is not the user and is currently blocked', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ ...mockUser, blockedUsers: [] }),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const result = await unblockUser(mockUser.username, 'targetUser');

      expect(result).toBeDefined();
      expect(result).toStrictEqual({ ...mockUser, blockedUsers: [] });
    });

    it('should return error if findOneAndUpdate returns null', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValueOnce(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const result = await unblockUser(mockUser.username, 'targetUser');

      expect('error' in result).toBe(true);
    });

    it('should return error if findOneAndUpdate throws error', async () => {
      jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValueOnce(null),
      } as unknown as Query<PopulatedSafeDatabaseUser, typeof UserModel>);

      const result = await unblockUser(mockUser.username, 'targetUser');

      expect('error' in result).toBe(true);
    });
  });
});

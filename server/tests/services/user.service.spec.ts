import mongoose, { Query } from 'mongoose';
import UserModel from '../../models/users.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  getUsersList,
  loginUser,
  makeTransaction,
  saveUser,
  updateUser,
} from '../../services/user.service';
import { DatabaseUser, SafeDatabaseUser, User, UserCredentials } from '../../types/types';
import { user, safeUser } from '../mockData.models';

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

      const savedUser = (await saveUser(user)) as SafeDatabaseUser;

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
});

describe('getUserByUsername', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the matching user', async () => {
    jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
      expect(filter.username).toBeDefined();
      const query: any = {};
      query.select = jest.fn().mockReturnValue(Promise.resolve(user));
      return query;
    });

    const retrievedUser = (await getUserByUsername(user.username)) as SafeDatabaseUser;

    expect(retrievedUser.username).toEqual(user.username);
    expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the user is not found', async () => {
    jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should return error when findOne returns null with select', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Error finding document')),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

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
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const retrievedUsers = (await getUsersList()) as SafeDatabaseUser[];

    expect(retrievedUsers[0].username).toEqual(safeUser.username);
    expect(retrievedUsers[0].dateJoined).toEqual(safeUser.dateJoined);
  });

  it('should throw an error if the users cannot be found', async () => {
    jest.spyOn(UserModel, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const getUsersError = await getUsersList();

    expect('error' in getUsersError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    jest.spyOn(UserModel, 'find').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Error finding documents')),
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const getUsersError = await getUsersList();

    expect('error' in getUsersError).toBe(true);
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the user if authentication succeeds', async () => {
    jest.spyOn(UserModel, 'findOne').mockImplementation((filter?: any) => {
      if (filter.username && filter.password) {
        return Promise.resolve({
          username: user.username,
          password: user.password,
          dateJoined: user.dateJoined,
          loginStreak: 5,
          maxLoginStreak: 10,
          lastLogin: new Date('2025-10-31'),
        } as any);
      } else if (filter.username && !filter.password) {
        const query: any = {};
        query.select = jest.fn().mockResolvedValue(safeUser);
        return query;
      }
      return Promise.resolve(null);
    });

    jest.spyOn(UserModel, 'updateOne').mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    } as any);

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loggedInUser = (await loginUser(credentials)) as SafeDatabaseUser;

    expect(loggedInUser.username).toEqual(user.username);
    expect(loggedInUser.dateJoined).toEqual(user.dateJoined);
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
      query.select = jest.fn().mockResolvedValue(null);
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

    const deletedUser = (await deleteUserByUsername(user.username)) as SafeDatabaseUser;

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
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    jest.spyOn(UserModel, 'findOneAndDelete').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Error deleting document')),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });
});

describe('updateUser', () => {
  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeDatabaseUser = {
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

    const result = (await updateUser(user.username, updates)) as SafeDatabaseUser;

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
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Error updating document')),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

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

    // Check that the result is a SafeUser and the biography got updated
    if ('username' in result) {
      expect(result.biography).toEqual(newBio);
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should return an error if biography update fails because user not found', async () => {
    // Simulate user not found
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
  };

  const safeUpdatedUser: SafeDatabaseUser = {
    _id: new mongoose.Types.ObjectId(),
    username: user.username,
    dateJoined: user.dateJoined,
    coins: 20,
  };

  const safeUpdatedUser2: SafeDatabaseUser = {
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
    // user with 10 coins
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
    // user with 10 coins
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
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

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
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const transactionError = await makeTransaction(user.username, 10, 'add');

    expect('error' in transactionError).toBe(true);
  });
});

import { Request, Response, NextFunction } from 'express';
import protect from '../../middleware/token.middleware';
import { verifyToken } from '../../utils/jwt.util';

jest.mock('../../utils/jwt.util');

describe('token.middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if no authorization header is provided', async () => {
    await protect(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', async () => {
    mockReq.headers = { authorization: 'InvalidFormat token123' };

    await protect(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    (verifyToken as jest.Mock).mockReturnValue(null);

    await protect(mockReq as Request, mockRes as Response, mockNext);

    expect(verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set req.user and call next() with valid token', async () => {
    const mockDecoded = { _id: 'user123', username: 'testuser' };
    mockReq.headers = { authorization: 'Bearer valid-token' };
    (verifyToken as jest.Mock).mockReturnValue(mockDecoded);

    await protect(mockReq as Request, mockRes as Response, mockNext);

    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 500 if an error is thrown', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    await protect(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

/**
 * Error Handler Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, errorHandler, asyncHandler } from '../../../src/middleware/errorHandler';

describe('ApiError', () => {
  it('should create an error with status code and message', () => {
    const error = new ApiError(400, 'Bad Request');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad Request');
  });

  it('should capture stack trace', () => {
    const error = new ApiError(500, 'Server Error');
    
    expect(error.stack).toBeDefined();
  });
});

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn();
  });

  it('should handle ApiError with correct status code', () => {
    const error = new ApiError(404, 'Not Found');
    
    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        message: 'Not Found',
        statusCode: 404
      }
    });
  });

  it('should handle ApiError with 400 status', () => {
    const error = new ApiError(400, 'Invalid input');
    
    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        message: 'Invalid input',
        statusCode: 400
      }
    });
  });

  it('should handle generic Error with 500 status', () => {
    const error = new Error('Something went wrong');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        message: 'Internal server error',
        statusCode: 500
      }
    });
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

describe('asyncHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should call the wrapped function', async () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(mockFn);
    
    await wrapped(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
  });

  it('should pass errors to next()', async () => {
    const error = new Error('Test error');
    const mockFn = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(mockFn);
    
    await wrapped(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle successful async operations', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(mockFn);
    
    await wrapped(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockFn).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});

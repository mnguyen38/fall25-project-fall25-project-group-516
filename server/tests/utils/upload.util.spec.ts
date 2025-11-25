import { processProfilePicture, processBannerImage, upload } from '../../utils/upload';
import sharp from 'sharp';

// Mock sharp
jest.mock('sharp');

describe('Upload Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fileFilter', () => {
    it('should accept image files', done => {
      const mockReq = {} as any;
      const mockFile = {
        fieldname: 'profilePicture',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from(''),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      // Access the fileFilter function from the upload configuration
      const fileFilter = (upload as any).fileFilter;

      fileFilter(mockReq, mockFile, (error: Error | null, accepted: boolean) => {
        expect(error).toBeNull();
        expect(accepted).toBe(true);
        done();
      });
    });

    it('should accept PNG image files', done => {
      const mockReq = {} as any;
      const mockFile = {
        fieldname: 'profilePicture',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from(''),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const fileFilter = (upload as any).fileFilter;

      fileFilter(mockReq, mockFile, (error: Error | null, accepted: boolean) => {
        expect(error).toBeNull();
        expect(accepted).toBe(true);
        done();
      });
    });

    it('should reject non-image files', done => {
      const mockReq = {} as any;
      const mockFile = {
        fieldname: 'profilePicture',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from(''),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const fileFilter = (upload as any).fileFilter;

      fileFilter(mockReq, mockFile, (error: Error | null, accepted: boolean) => {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe('Only image files are allowed');
        done();
      });
    });
  });

  describe('processProfilePicture', () => {
    it('should process profile picture without crop data', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'profilePicture',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test-image-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const mockProcessedBuffer = Buffer.from('processed-image-data');
      const mockBase64 = mockProcessedBuffer.toString('base64');

      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      const result = await processProfilePicture(mockFile);

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockResize).toHaveBeenCalledWith(400, 400, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockToBuffer).toHaveBeenCalled();
      expect(result).toBe(`data:image/jpeg;base64,${mockBase64}`);
    });

    it('should process profile picture with crop data', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'profilePicture',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test-image-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const cropData = { x: 10, y: 20, width: 300, height: 300 };
      const mockProcessedBuffer = Buffer.from('processed-cropped-image-data');
      const mockBase64 = mockProcessedBuffer.toString('base64');

      const mockExtract = jest.fn().mockReturnThis();
      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        extract: mockExtract,
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      const result = await processProfilePicture(mockFile, cropData);

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockExtract).toHaveBeenCalledWith({
        left: Math.round(cropData.x),
        top: Math.round(cropData.y),
        width: Math.round(cropData.width),
        height: Math.round(cropData.height),
      });
      expect(mockResize).toHaveBeenCalledWith(400, 400, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockToBuffer).toHaveBeenCalled();
      expect(result).toBe(`data:image/jpeg;base64,${mockBase64}`);
    });

    it('should handle floating point crop coordinates', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'profilePicture',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test-image-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const cropData = { x: 10.7, y: 20.3, width: 300.9, height: 300.2 };
      const mockProcessedBuffer = Buffer.from('processed-image-data');

      const mockExtract = jest.fn().mockReturnThis();
      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        extract: mockExtract,
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      await processProfilePicture(mockFile, cropData);

      expect(mockExtract).toHaveBeenCalledWith({
        left: 11,
        top: 20,
        width: 301,
        height: 300,
      });
    });
  });

  describe('processBannerImage', () => {
    it('should process banner image without crop data', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'bannerImage',
        originalname: 'banner.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test-banner-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const mockProcessedBuffer = Buffer.from('processed-banner-data');
      const mockBase64 = mockProcessedBuffer.toString('base64');

      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      const result = await processBannerImage(mockFile);

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockResize).toHaveBeenCalledWith(1200, 300, {
        fit: 'fill',
      });
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockToBuffer).toHaveBeenCalled();
      expect(result).toBe(`data:image/jpeg;base64,${mockBase64}`);
    });

    it('should process banner image with crop data', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'bannerImage',
        originalname: 'banner.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test-banner-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const cropData = { x: 50, y: 100, width: 800, height: 200 };
      const mockProcessedBuffer = Buffer.from('processed-cropped-banner-data');
      const mockBase64 = mockProcessedBuffer.toString('base64');

      const mockExtract = jest.fn().mockReturnThis();
      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        extract: mockExtract,
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      const result = await processBannerImage(mockFile, cropData);

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockExtract).toHaveBeenCalledWith({
        left: Math.round(cropData.x),
        top: Math.round(cropData.y),
        width: Math.round(cropData.width),
        height: Math.round(cropData.height),
      });
      expect(mockResize).toHaveBeenCalledWith(1200, 300, {
        fit: 'fill',
      });
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockToBuffer).toHaveBeenCalled();
      expect(result).toBe(`data:image/jpeg;base64,${mockBase64}`);
    });

    it('should handle floating point crop coordinates for banner', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'bannerImage',
        originalname: 'banner.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test-banner-data'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const cropData = { x: 50.6, y: 100.4, width: 800.8, height: 200.1 };
      const mockProcessedBuffer = Buffer.from('processed-banner-data');

      const mockExtract = jest.fn().mockReturnThis();
      const mockResize = jest.fn().mockReturnThis();
      const mockJpeg = jest.fn().mockReturnThis();
      const mockToBuffer = jest.fn().mockResolvedValue(mockProcessedBuffer);

      (sharp as unknown as jest.Mock).mockReturnValue({
        extract: mockExtract,
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer,
      });

      await processBannerImage(mockFile, cropData);

      expect(mockExtract).toHaveBeenCalledWith({
        left: 51,
        top: 100,
        width: 801,
        height: 200,
      });
    });
  });
});

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_SECRET_KEY'),
    });
  }

  async uploadImage(base64: string, folder: string = 'varta_profile'): Promise<string> {
    const res = await cloudinary.uploader.upload(base64, {
      folder,
    });
    return res.secure_url;
  }

  async uploadFile(file: any, folder: string = 'varta_profile'): Promise<string> {
    if (!file || !file.buffer) {
      console.error('Cloudinary Upload: No file buffer found', file);
      throw new Error('File buffer is missing');
    }

    try {
      const { secure_url } = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder },
          (err, res) => {
            if (err) {
              console.error('Cloudinary Stream Error:', err);
              return reject(err);
            }
            resolve(res);
          }
        );
        uploadStream.end(file.buffer);
      });
      return secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Catch:', error);
      throw error;
    }
  }
}
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: Number(this.config.get('MAIL_PORT')),
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: `" Varta App" <${this.config.get('MAIL_USER')}>`,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h3>Your OTP is:</h3>
        <h2>${otp}</h2>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    });
  }
}
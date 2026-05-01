import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService, 
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    const existingUser = await this.userModel.findOne({ email, isDeleted:false });

    if (existingUser && existingUser.emailVerify) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    if (existingUser) {
      existingUser.set({
        ...createUserDto,
        password: hashedPassword,
        emailVerify: false,
      });

      user = await existingUser.save();
    }
    else {
      user = await this.userModel.create({
        ...createUserDto,
        password: hashedPassword,
        emailVerify: false,
      });
    }

    const payload = { userId: user._id };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'User registered successfully',
      userId: user._id ,
      access_token: accessToken,
    };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email, isDeleted:false });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ++++++++ this is for deactive user login then is Activate
    if (!user?.isActive) {
      await this.userModel.findByIdAndUpdate(
        user._id,
        { isActive: true },
        { new: true }
      );
    }

    const payload = { userId: user._id };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      verfied: user.emailVerify,
      access_token: accessToken,
    };
  }
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { UserListDto } from './dto/user-list.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/common/utils/cloudinary.utils';
import { MailService } from 'src/common/services/mail.services';
import { Follow } from '../follow/schemas/follow.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Follow.name) private followModel: Model<Follow>,
        private cloudinaryService: CloudinaryService,
        private mailService: MailService,
    ) { }

    async list(dto: UserListDto, userId: any) {

        const { search, gender } = dto;
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 50;
        const skip = (page - 1) * limit;

        const objectId = new Types.ObjectId(userId);

        const filter: any = {
            isActive: true,
            emailVerify: true,
            isDeleted: false,
            _id: { $ne: objectId }
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } }
            ];
        }

        if (gender && gender !== 'all') {
            filter.gender = gender;
        }

        const result = await this.userModel.aggregate([

            { $match: filter },

            {
                $facet: {

                    data: [

                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },

                        {
                            $lookup: {
                                from: 'follows',
                                let: { userId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$followerId', objectId] },
                                                    { $eq: ['$followingId', '$$userId'] }
                                                ]
                                            }
                                        }
                                    },
                                    { $limit: 1 }
                                ],
                                as: 'isFollowing'
                            }
                        },

                        {
                            $lookup: {
                                from: 'follows',
                                let: { userId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$followerId', '$$userId'] },
                                                    { $eq: ['$followingId', objectId] }
                                                ]
                                            }
                                        }
                                    },
                                    { $limit: 1 }
                                ],
                                as: 'isFollower'
                            }
                        },

                        {
                            $addFields: {
                                isFollowing: { $gt: [{ $size: '$isFollowing' }, 0] },
                                isFollower: { $gt: [{ $size: '$isFollower' }, 0] },
                                isMutual: {
                                    $and: [
                                        { $gt: [{ $size: '$isFollowing' }, 0] },
                                        { $gt: [{ $size: '$isFollower' }, 0] }
                                    ]
                                }
                            }
                        },

                        {
                            $match: {
                                isFollowing: false
                            }
                        },

                        {
                            $project: {
                                __v: 0,
                                password: 0,
                                platform: 0,
                                emailVerify:0,
                                isActive: 0,
                                isDeleted: 0,
                                updatedAt: 0,
                            }
                        }
                    ],

                    totalCount: [
                        { $count: 'total' }
                    ]
                }
            }

        ]);

        const data = result[0].data;
        const total = result[0].totalCount[0]?.total || 0;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async userProfile(userId: string) {

        const objectId = new Types.ObjectId(userId);

        const user = await this.userModel
            .findById(objectId)
            .select('-password -__v -platform -isActive -updatedAt');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [followersCount, followingCount] = await Promise.all([

            // who follow me
            this.followModel.countDocuments({
                followingId: objectId
            }),

            // whom I follow
            this.followModel.countDocuments({
                followerId: objectId
            })

        ]);

        return {
            ...user.toObject(),
            followersCount,
            followingCount
        };
    }

    async updateUser(userId: string, dto: UpdateUserDto) {
        if (dto.userName) {
            dto.userName = dto.userName.toLowerCase();
            const existingUser = await this.userModel.findOne({
                userName: dto.userName,
                isDeleted: false,
                _id: { $ne: userId }
            });

            if (existingUser) {
                throw new BadRequestException('Username already taken');
            }
        }
        
        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                new Types.ObjectId(userId),
                { $set: dto }, 
                {
                    new: true,         
                    runValidators: true 
                }
            )
            .select('-password -__v -platform -isActive -updatedAt -createdAt'); 

        if (!updatedUser) {
            throw new BadRequestException('User not found');
        }

        return {
            message: 'User updated successfully',
            user: updatedUser,
        };
    }

    async deactivateUser(userId: string) {
        const user = await this.userModel.findByIdAndUpdate(
            new Types.ObjectId(userId),
            { $set: { isActive: false } },
            { new: true }
        );

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            message: 'User deactivated successfully',
        };
    }

    async changePassword(userId: string, dto: any) {

        const { currentPassword, newPassword } = dto;

        const user = await this.userModel
            .findById(userId)
            .select('+password');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            throw new BadRequestException('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        return {
            message: 'Password updated successfully',
        };
    }

    async updateAvatar(userId: string, file: any) {

        if (!file) {
            throw new BadRequestException('Image required');
        }

        const imageUrl = await this.cloudinaryService.uploadFile(file);

        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { avatar: imageUrl },
            { new: true }
        ).select('-password -__v');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            avatar: user.avatar,
            message: 'Avatar updated'
        };
    }

    async removeAvatar(userId: string) {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { avatar: '' } },
            { new: true }
        ).select('-password -__v');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            message: 'Avatar Remove successfully',
        };
    }

    async requestEmailChange(userId: string, email: string) {

        const existing = await this.userModel.findOne({ email: email, isDeleted:false });
        if (existing && existing?.emailVerify != false) {
            throw new BadRequestException('Email already in use');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.userModel.findByIdAndUpdate(userId, {
            otp: otp,
            newEmail: email,
            otpExpiry: Date.now() + 5 * 60 * 1000
        });

        await this.mailService.sendOtp(email, otp);

        return {
            message: 'OTP sent to new email',
        };
    }

    async verifyEmailChange(userId: string, otp: string) {
        const user = await this.userModel.findById(userId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.newEmail === undefined) {
            throw new BadRequestException('Enter new email again');
        }

        if (!user.otp || user.otp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }

        if (!user.otpExpiry || user.otpExpiry < Date.now()) {
            throw new BadRequestException('OTP expired');
        }

        await this.userModel.deleteMany({
            email: user.newEmail,
            emailVerify: false,
            _id: { $ne: userId } 
        });

        await this.userModel.findByIdAndUpdate(userId, {
            $set: {
                email: user.newEmail,
                emailVerify: true
            },
            $unset: {
                newEmail: 1,
                otp: 1,
                otpExpiry: 1
            }
        },
        { new: true });

        return {
            message: 'Email updated successfully',
        };
    }
}
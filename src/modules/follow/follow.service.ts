import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Follow } from './schemas/follow.schema';
import { Model, Types } from 'mongoose';
import { UserListDto } from '../user/dto/user-list.dto';

@Injectable()
export class FollowService {

    constructor(
        @InjectModel(Follow.name)
        private followModel: Model<Follow>
    ) { }

    async followUser(userId: string, targetId: string) {

        if (userId === targetId) {
            throw new BadRequestException('You cannot follow yourself');
        }

        const exists = await this.followModel.findOne({
            followerId: userId,
            followingId: targetId
        });

        if (exists) {
            throw new BadRequestException('Already following');
        }

        await this.followModel.create({
            followerId: new Types.ObjectId(userId),
            followingId: new Types.ObjectId(targetId),
        });

        return { message: 'Followed successfully' };
    }

    async unfollowUser(userId: string, targetId: string) {

        await this.followModel.deleteOne({
            followerId: userId,
            followingId: targetId
        });

        return { message: 'Unfollowed successfully' };
    }

    async removeFollower(userId: string, followerId: string) {

        const me = new Types.ObjectId(userId);
        const follower = new Types.ObjectId(followerId);
        const exists = await this.followModel.findOne({
            followerId: follower,
            followingId: me
        });

        if (!exists) {
            throw new BadRequestException('User is not your follower');
        }

        await this.followModel.deleteOne({
            followerId: follower,
            followingId: me
        });

        return {
            message: 'Follower removed successfully'
        };
    }

    async toggleFollow(userId: string, targetId: string) {

        const follower = new Types.ObjectId(userId);
        const following = new Types.ObjectId(targetId);

        const exists = await this.followModel.findOne({
            followerId: follower,
            followingId: following
        });

        if (exists) {
            await this.followModel.deleteOne({
                followerId: follower,
                followingId: following
            });

            return {
                message: 'Unfollowed',
                isFollowing: false
            };
        }

        try {
            await this.followModel.create({
                followerId: follower,
                followingId: following
            });

            return {
                message: 'Followed',
                isFollowing: true
            };

        } catch (error:any) {
            if (error.code === 11000) {
                return {
                    message: 'Already following',
                    isFollowing: true
                };
            }

            throw error;
        }
    }

    async getFollowing(userId: string, dto: UserListDto) {

        const { search, gender } = dto;
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 50;
        const skip = (page - 1) * limit;

        const objectId = new Types.ObjectId(userId);

        const result = await this.followModel.aggregate([

            { $match: { followerId: objectId } },

            {
                $lookup: {
                    from: 'users',
                    localField: 'followingId',
                    foreignField: '_id',
                    as: 'user'
                }
            },

            { $unwind: '$user' },

            {
                $match: {
                    'user.isDeleted': false,
                    'user.isActive': true,
                    'user.emailVerify': true
                }
            },

            ...(search ? [{
                $match: {
                    $or: [
                        { 'user.name': { $regex: search, $options: 'i' } },
                        { 'user.email': { $regex: search, $options: 'i' } },
                        { 'user.userName': { $regex: search, $options: 'i' } }
                    ]
                }
            }] : []),

            ...(gender && gender !== 'all' ? [{
                $match: { 'user.gender': gender }
            }] : []),

            {
                $facet: {

                    data: [
                        { $sort: { 'user.createdAt': -1 } },
                        { $skip: skip },
                        { $limit: limit },

                        { $replaceRoot: { newRoot: '$user' } },

                        {
                            $project: {
                                password: 0,
                                __v: 0,
                                platform: 0,
                                emailVerify: 0,
                                isActive: 0,
                                isDeleted: 0,
                                updatedAt: 0
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

    async getFollowers(userId: string, dto: UserListDto) {

        const { search, gender } = dto;
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 50;
        const skip = (page - 1) * limit;

        const objectId = new Types.ObjectId(userId);

        const result = await this.followModel.aggregate([

            { $match: { followingId: objectId } },

            {
                $lookup: {
                    from: 'users',
                    localField: 'followerId',
                    foreignField: '_id',
                    as: 'user'
                }
            },

            { $unwind: '$user' },
            {
                $match: {
                    'user.isDeleted': false,
                    'user.isActive': true,
                    'user.emailVerify': true
                }
            },

            {
                $lookup: {
                    from: 'follows',
                    let: { followerUserId: '$user._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$followerId', objectId] },          
                                        { $eq: ['$followingId', '$$followerUserId'] } 
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'isFollowingCheck'
                }
            },

            {
                $addFields: {
                    'user.isFollowing': {
                        $gt: [{ $size: '$isFollowingCheck' }, 0]
                    }
                }
            },

            ...(search ? [{
                $match: {
                    $or: [
                        { 'user.name': { $regex: search, $options: 'i' } },
                        { 'user.email': { $regex: search, $options: 'i' } },
                        { 'user.userName': { $regex: search, $options: 'i' } }
                    ]
                }
            }] : []),

            ...(gender && gender !== 'all' ? [{
                $match: { 'user.gender': gender }
            }] : []),

            {
                $facet: {

                    data: [
                        { $sort: { 'user.createdAt': -1 } },
                        { $skip: skip },
                        { $limit: limit },

                        { $replaceRoot: { newRoot: '$user' } },

                        {
                            $project: {
                                password: 0,
                                __v: 0,
                                platform: 0,
                                emailVerify: 0,
                                isActive: 0,
                                isDeleted: 0,
                                updatedAt: 0
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

    async getMutual(userId: string, dto: UserListDto) {

        const { search, gender } = dto;
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 50;
        const skip = (page - 1) * limit;

        const objectId = new Types.ObjectId(userId);

        const result = await this.followModel.aggregate([
            {
                $match: { followerId: objectId }
            },
            {
                $lookup: {
                    from: 'follows',
                    let: { followingId: '$followingId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$followerId', '$$followingId'] },
                                        { $eq: ['$followingId', objectId] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'mutualCheck'
                }
            },

            {
                $match: {
                    mutualCheck: { $ne: [] }
                }
            },

            {
                $lookup: {
                    from: 'users',
                    localField: 'followingId',
                    foreignField: '_id',
                    as: 'user'
                }
            },

            { $unwind: '$user' },

            {
                $match: {
                    'user.isDeleted': false,
                    'user.isActive': true,
                    'user.emailVerify': true
                }
            },

            ...(search ? [{
                $match: {
                    $or: [
                        { 'user.name': { $regex: search, $options: 'i' } },
                        { 'user.email': { $regex: search, $options: 'i' } },
                        { 'user.userName': { $regex: search, $options: 'i' } }
                    ]
                }
            }] : []),

            ...(gender && gender !== 'all' ? [{
                $match: { 'user.gender': gender }
            }] : []),

            {
                $facet: {

                    data: [

                        { $sort: { 'user.createdAt': -1 } },
                        { $skip: skip },
                        { $limit: limit },

                        {
                            $replaceRoot: { newRoot: '$user' }
                        },
                        {
                            $project: {
                                password: 0,
                                __v: 0,
                                platform: 0,
                                emailVerify: 0,
                                isActive: 0,
                                isDeleted: 0,
                                updatedAt: 0
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
}
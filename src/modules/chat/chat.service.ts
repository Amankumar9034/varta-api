import { BadRequestException, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';
import { CloudinaryService } from 'src/common/utils/cloudinary.utils';
import { OnlineStatusService } from './online-status.service';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        private cloudinaryService: CloudinaryService,
        private statusService: OnlineStatusService,
    ){}

    async sendMessage(userId: string, dto: any) {

        const { receiverId, type, content, meta } = dto;

        const sender = new Types.ObjectId(userId);
        const receiver = new Types.ObjectId(receiverId);

        if (userId === receiverId) {
            throw new BadRequestException('Cannot message yourself');
        }

        const participants = [sender, receiver].sort((a, b) =>
            a.toString().localeCompare(b.toString())
        );

        let conversation = await this.conversationModel.findOne({
            participants
        });

        if (!conversation) {
            conversation = await this.conversationModel.create({
                participants
            });
        }

        const message = await this.messageModel.create({
            conversationId: conversation._id,
            senderId: sender,
            type,
            content,
            meta
        });

        await this.conversationModel.findByIdAndUpdate(
            conversation._id,
            {
                lastMessage: message._id,
                lastMessageAt: new Date()
            }
        );

        return {
            message: 'Message sent',
            data: message,
            conversationId: conversation._id
        };
    }

    async getMessages(userId: string, dto: any) {

        const { conversationId } = dto;
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 20;
        const skip = (page - 1) * limit;

        const convId = new Types.ObjectId(conversationId);
        const objectId = new Types.ObjectId(userId);

        const conversation = await this.conversationModel.findOne({
            _id: convId,
            participants: objectId
        });

        if (!conversation) {
            throw new BadRequestException('Invalid conversation');
        }

        const messages = await this.messageModel
            .find({ conversationId: convId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        await this.messageModel.updateMany(
            {
                conversationId: convId,
                senderId: { $ne: objectId },
                isRead: false
            },
            { $set: { isRead: true } }
        );

        return {
            data: messages.reverse(),
            meta: {
                page,
                limit
            }
        };
    }

    async getChatList(userId: string, dto: any) {

        const { search, gender } = dto;

        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 20;
        const skip = (page - 1) * limit;

        const objectId = new Types.ObjectId(userId);

        const result = await this.conversationModel.aggregate([

            { $match: { participants: objectId } },

            {
                $addFields: {
                    otherUser: {
                        $first: {
                            $filter: {
                                input: '$participants',
                                cond: { $ne: ['$$this', objectId] }
                            }
                        }
                    }
                }
            },

            {
                $lookup: {
                    from: 'users',
                    localField: 'otherUser',
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
                $lookup: {
                    from: 'follows',
                    let: { otherUserId: '$user._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$followerId', objectId] },
                                        { $eq: ['$followingId', '$$otherUserId'] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'iFollow'
                }
            },

            {
                $lookup: {
                    from: 'follows',
                    let: { otherUserId: '$user._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$followerId', '$$otherUserId'] },
                                        { $eq: ['$followingId', objectId] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'theyFollow'
                }
            },

            {
                $addFields: {
                    isMutual: {
                        $and: [
                            { $gt: [{ $size: '$iFollow' }, 0] },
                            { $gt: [{ $size: '$theyFollow' }, 0] }
                        ]
                    }
                }
            },

            {
                $match: { isMutual: true }
            },

            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage',
                    foreignField: '_id',
                    as: 'lastMsg'
                }
            },
            { $unwind: { path: '$lastMsg', preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: 'messages',
                    let: { convId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$conversationId', '$$convId'] },
                                        { $eq: ['$isRead', false] },
                                        { $ne: ['$senderId', objectId] }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'unread'
                }
            },

            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ['$unread.count', 0] }, 0]
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    conversationId: '$_id',
                    'user._id': 1,
                    'user.name': 1,
                    'user.avatar': 1,
                    'user.gender': 1,
                    lastMessage: '$lastMsg.content',
                    lastMessageType: '$lastMsg.type',
                    lastMessageAt: '$lastMsg.createdAt',
                    unreadCount: 1
                }
            },

            { $sort: { lastMessageAt: -1 } },

            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: 'total' }
                    ]
                }
            }

        ]);

        let data = result[0].data;
        const total = result[0].totalCount[0]?.total || 0;

        // Add online status
        data = data.map(chat => ({
            ...chat,
            isOnline: this.statusService.isOnline(chat.user._id.toString())
        }));

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

    async markAsRead(userId: string, conversationId: string) {

        const objectId = new Types.ObjectId(userId);
        const convId = new Types.ObjectId(conversationId);

        await this.messageModel.updateMany(
            {
                conversationId: convId,
                senderId: { $ne: objectId },
                isRead: false
            },
            {
                $set: { isRead: true }
            }
        );

        return { message: 'Messages marked as read' };
    }

    async sendImageMessage(
        userId: string,
        receiverId: string,
        file: any
    ) {

        if (!file) {
            throw new BadRequestException('Image file is required');
        }

        const imageUrl = await this.cloudinaryService.uploadFile(file, 'messages');

        return this.sendMessage(userId, {
            receiverId,
            type: 'image',
            content: imageUrl,
            meta: {
            }
        });
    }
}

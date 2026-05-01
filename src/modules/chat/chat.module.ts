import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatGateway } from './chat.gateway';
import { CloudinaryService } from 'src/common/utils/cloudinary.utils';
import { OnlineStatusService } from './online-status.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema }
    ])
  ],
  providers: [ChatService, ChatGateway, CloudinaryService, OnlineStatusService],
  controllers: [ChatController]
})
export class ChatModule {}

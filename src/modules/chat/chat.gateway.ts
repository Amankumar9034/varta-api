import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { OnlineStatusService } from './online-status.service';

@WebSocketGateway({
  cors: { origin: '*' }
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server!: Server;

  constructor(
    private chatService: ChatService,
    private statusService: OnlineStatusService,
  ) {}
  
  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const userId = this.statusService.setUserOffline(client.id);

    if (userId) {
      // console.log('User offline:', userId);
      this.server.emit('userOffline', { userId });
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = data;
    this.statusService.setUserOnline(userId, client.id);
    client.join(userId);

    // console.log('User online:', userId);
    this.server.emit('userOnline', { userId });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket
  ) {
    const saved = await this.chatService.sendMessage(
      data.senderId,
      data
    );

    this.server.to(data.receiverId).emit('receiveMessage', saved.data);
    client.emit('receiveMessage', saved.data);
  }

  emitMessage(receiverId: string, message: any) {
    this.server.to(receiverId).emit('receiveMessage', message);
    this.server.to(message.senderId.toString()).emit('receiveMessage', message);
  }

  @SubscribeMessage('markRead')
  async handleRead(
    @MessageBody() data: { conversationId: string, userId: string }
  ) {
    await this.chatService.markAsRead(
      data.userId,
      data.conversationId
    );

    this.server.emit('messagesRead', {
      conversationId: data.conversationId,
      userId: data.userId
    });
  }

  @SubscribeMessage('checkStatus')
  handleCheckStatus(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const isOnline = this.statusService.isOnline(data.userId);
    client.emit('statusResponse', { userId: data.userId, isOnline });
  }

  isUserOnline(userId: string): boolean {
    return this.statusService.isOnline(userId);
  }
}
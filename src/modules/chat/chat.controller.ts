import {Body, Controller, Get, Param, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
    ) { }

    @Post('send')
    async sendMessage( @Req() req: any, @Body() dto: any) {
        const res = await this.chatService.sendMessage(req.user.userId, dto);
        this.chatGateway.emitMessage(dto.receiverId, res.data);
        return res;
    }

    @Get('messages')
    getMessages( @Req() req: any, @Query() dto: any) {
    return this.chatService.getMessages(req.user.userId, dto);
    }

    @Get('list')
    getChatList( @Req() req: any, @Query() dto: any) {
        return this.chatService.getChatList(req.user.userId, dto);
    }

    @Post('read/:conversationId')
    markRead( @Req() req: any, @Param('conversationId') id: string) {
        return this.chatService.markAsRead(req.user.userId, id);
    }

    @Post('send-image')
    @UseInterceptors(FileInterceptor('image'))
    async sendImage(
        @Req() req: any,
        @UploadedFile() file: any,
        @Body('receiverId') receiverId: string
    ) {
        const res = await this.chatService.sendImageMessage(
            req.user.userId,
            receiverId,
            file
        );
        this.chatGateway.emitMessage(receiverId, res.data);
        return res;
    }
}
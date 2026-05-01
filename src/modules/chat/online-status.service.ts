import { Injectable } from '@nestjs/common';

@Injectable()
export class OnlineStatusService {
  private onlineUsers = new Map<string, string>();

  setUserOnline(userId: string, socketId: string) {
    this.onlineUsers.set(userId, socketId);
  }

  setUserOffline(socketId: string): string | null {
    let userId: string | null = null;
    for (const [key, value] of this.onlineUsers.entries()) {
      if (value === socketId) {
        userId = key;
        this.onlineUsers.delete(key);
        break;
      }
    }
    return userId;
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}

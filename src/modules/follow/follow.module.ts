import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Follow, FollowSchema } from './schemas/follow.schema';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Follow.name, schema: FollowSchema }
    ])
  ],
  controllers: [FollowController],
  providers: [FollowService],
})
export class FollowModule {}
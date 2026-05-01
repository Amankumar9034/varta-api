import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CloudinaryService } from 'src/common/utils/cloudinary.utils';
import { MailService } from 'src/common/services/mail.services';
import { Follow, FollowSchema } from '../follow/schemas/follow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema}
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, CloudinaryService, MailService]
})
export class UserModule { }

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/user-update.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('user')
export class UserController {
    constructor(private readonly svc: UserService) {}

    @Get('list')
    async list(
        @Req() req: any,
        @Query('search') search?: string,
        @Query('gender') gender?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50
    ) {
        const data = await this.svc.list({ search, gender, page, limit }, req.user.userId);
        return {
            success: true,
            data
        };
    }

    @Get('')
    getProfile(@Req() req: any) {
        return this.svc.userProfile(req.user.userId);
    }

    @Patch('')
    updateUser(@Req() req: any, @Body() dto: UpdateUserDto) {
        return this.svc.updateUser(req.user.userId, dto);
    }

    @Get(':id')
    getProfileById(@Param('id') id: string) {
        return this.svc.userProfile(id);
    }

    @Patch('deactivate')
    deactivateUser(@Req() req: any) {
        return this.svc.deactivateUser(req.user.userId);
    }

    @Patch('changepassword')
    changePassword( @Req() req: any, @Body() dto: any ) {
        return this.svc.changePassword(req.user.userId, dto);
    }

    @Patch('avatar')
    @UseInterceptors(FileInterceptor('image'))
    updateAvatar(
        @Req() req: any,
        @UploadedFile() file: any
    ) {
        return this.svc.updateAvatar(req.user.userId, file);
    }

    @Patch('avatar/remove')
    removeAvatar(
        @Req() req: any,
    ) {
        return this.svc.removeAvatar(req.user.userId);
    }

    @Public()
    @Post('change-email/request')
    requestEmailChange(
        @Body('userId') userId: string,
        @Body('email') email: string
    ) {
        return this.svc.requestEmailChange(userId, email);
    }

    @Public()
    @Post('change-email/verify')
    verifyEmailChange(
        @Body('userId') userId: string,
        @Body('otp') otp: string
    ) {
        return this.svc.verifyEmailChange(userId, otp);
    }    
}

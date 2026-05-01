import { Controller, Post, Delete, Get, Param, Req, UseGuards, Query } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {

  constructor(private svc: FollowService) {}

  @Post(':id')
  follow(@Req() req: any, @Param('id') id: string) {
    return this.svc.followUser(req.user.userId, id);
  }

  @Delete(':id')
  unfollow(@Req() req: any, @Param('id') id: string) {
    return this.svc.unfollowUser(req.user.userId, id);
  }

  @Delete('remove/:id')
  removeFollower( @Req() req: any, @Param('id') id: string) {
    return this.svc.removeFollower(req.user.userId, id);
  }

  @Post('toggle/:id')
  toggle(@Req() req: any, @Param('id') id: string) {
    return this.svc.toggleFollow(req.user.userId, id);
  }

  @Get('following')
  async getFollowing(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    const data = await this.svc.getFollowing(req.user.userId, { search, gender, page, limit });
    return {
      success: true,
      data
    };
  }

  @Get('followers')
  async getFollowers(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    const data = await this.svc.getFollowers(req.user.userId, { search, gender, page, limit });
    return {
      success: true,
      data
    };
  }

  @Get('mutual')
  async getMutual(@Req() req: any,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50) {
    const data = await this.svc.getMutual(req.user.userId, { search, gender, page, limit });
    return {
      success: true,
      data
    };
  }
}
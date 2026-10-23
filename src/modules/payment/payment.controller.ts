import { Controller, Post, Get, Body, Param, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create payment order for logged-in user
   */
  @Post('create-order')
  async createOrder(@Req() req: any, @Body() dto: CreatePaymentOrderDto) {
    const userId = req.user?.userId;
    return this.paymentService.createOrder(userId, dto);
  }

  /**
   * Public endpoint for testing order creation (e.g. Postman / direct test without login)
   */
  @Public()
  @Post('test-create-order')
  async testCreateOrder(@Body() dto: CreatePaymentOrderDto) {
    return this.paymentService.createOrder(undefined, dto);
  }

  /**
   * Verify payment status using Cashfree orderId
   */
  @Public()
  @Get('verify/:orderId')
  async verifyPayment(@Param('orderId') orderId: string) {
    return this.paymentService.verifyPayment(orderId);
  }

  /**
   * Get order status from MongoDB
   */
  @Public()
  @Get('order/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return this.paymentService.getOrder(orderId);
  }
}

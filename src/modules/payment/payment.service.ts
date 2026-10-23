import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private cf!: Cashfree;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    this.initCashfree();
  }

  private initCashfree() {
    const appId = this.configService.get<string>('CASHFREE_APP_ID') || '';
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY') || '';
    const env = (this.configService.get<string>('CASHFREE_ENV') || 'SANDBOX').toUpperCase();

    const cfEnv = env === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

    if (!appId || !secretKey || appId === 'your_cashfree_sandbox_app_id') {
      this.logger.warn(
        '⚠️ Cashfree credentials are not configured in .env. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.',
      );
    }

    this.cf = new Cashfree(cfEnv, appId, secretKey);
  }

  async createOrder(userId: string | undefined, dto: CreatePaymentOrderDto) {
    try {
      let user: UserDocument | null = null;
      if (userId) {
        user = await this.userModel.findById(userId);
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const customerId = userId ? userId.toString() : `cust_${Date.now()}`;
      const customerPhone = dto.customerPhone || user?.mobileNo || '9999999999';
      const customerName = dto.customerName || user?.name || 'Varta Customer';
      const customerEmail = dto.customerEmail || user?.email || 'test@example.com';

      const orderRequest = {
        order_amount: dto.amount,
        order_currency: 'INR',
        order_id: orderId,
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
          customer_name: customerName,
          customer_email: customerEmail,
        },
        order_meta: {
          return_url: 'http://localhost:8100/tabs/home?order_id={order_id}',
        },
      };

      this.logger.log(`Creating Cashfree order: ${orderId} for amount: ${dto.amount}`);
      const response = await this.cf.PGCreateOrder(orderRequest);
      const data = response.data;

      const payment = new this.paymentModel({
        orderId: data.order_id,
        userId: userId || undefined,
        amount: dto.amount,
        currency: 'INR',
        paymentSessionId: data.payment_session_id,
        status: 'PENDING',
        customerDetails: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        rawResponse: data,
      });

      await payment.save();

      return {
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        amount: dto.amount,
        currency: 'INR',
      };
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      this.logger.error('Failed to create Cashfree order', errorData);
      throw new BadRequestException(errorData?.message || 'Failed to create payment order');
    }
  }

  async verifyPayment(orderId: string) {
    try {
      this.logger.log(`Verifying payment for orderId: ${orderId}`);
      const response = await this.cf.PGOrderFetchPayments(orderId);
      const payments = response.data;

      if (!payments || payments.length === 0) {
        return {
          orderId,
          status: 'PENDING',
          message: 'No payment transaction recorded yet.',
        };
      }

      const successfulPayment = payments.find((p: any) => p.payment_status === 'SUCCESS');
      const latestPayment = payments[0];
      const finalStatus = successfulPayment ? 'SUCCESS' : (latestPayment?.payment_status || 'FAILED');

      await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          status: finalStatus,
          cfPaymentId: successfulPayment?.cf_payment_id || latestPayment?.cf_payment_id,
          paymentMethod: successfulPayment?.payment_group || latestPayment?.payment_group,
          rawResponse: successfulPayment || latestPayment,
        },
        { new: true },
      );

      return {
        orderId,
        status: finalStatus,
        paymentDetails: successfulPayment || latestPayment,
      };
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      this.logger.error(`Failed to verify payment for ${orderId}`, errorData);
      throw new InternalServerErrorException(errorData?.message || 'Failed to verify payment');
    }
  }

  async getOrder(orderId: string) {
    const payment = await this.paymentModel.findOne({ orderId });
    if (!payment) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return payment;
  }
}

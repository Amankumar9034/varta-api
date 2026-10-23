import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, unique: true, index: true })
  orderId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: Types.ObjectId | string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: false })
  paymentSessionId?: string;

  @Prop({
    required: true,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'USER_DROPPED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  })
  status!: string;

  @Prop({ required: false })
  cfPaymentId?: string;

  @Prop({ required: false })
  paymentMethod?: string;

  @Prop({
    type: {
      name: { type: String, required: false },
      phone: { type: String, required: false },
      email: { type: String, required: false },
    },
    _id: false,
    required: false,
  })
  customerDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  @Prop({ type: Object, required: false })
  rawResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

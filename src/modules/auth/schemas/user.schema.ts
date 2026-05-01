import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false }) 
class Address {

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  city?: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ timestamps: true })
export class User {

  @Prop({ required: false,})
  avatar?: string;
  
  @Prop({ required: true, trim: true, minlength: 3, maxlength: 30 })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, })
  email!: string;

  @Prop({ required: true, minlength: 4})
  password!: string;

  @Prop({ required: false, trim: true, sparse: true, lowercase: true})
  userName?: string;
  
  @Prop({ required: false, trim: true, sparse: true, match: /^[0-9]{10}$/, })
  mobileNo?: string;
  
  @Prop({ required: false, enum: ['male', 'female', 'other'] })
  gender?: string;
  
  @Prop({ required: false, minlength: 3, maxlength: 150})
  bio?: string;
  
  @Prop({ type: AddressSchema })
  address?: Address;

  @Prop({ required: false, default: true})
  isActive?: boolean;

  @Prop({ required: false, default: false})
  isDeleted?: boolean;

  @Prop({ required: false,})
  platform?: string;

  @Prop({ required: false,}) newEmail?: string;
  @Prop({ default: false}) emailVerify?: boolean;
  @Prop({ required: false,}) otp?: string;
  @Prop({ required: false,}) otpExpiry?: number;
}
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

UserSchema.index(
  { userName: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false }
  }
);

UserSchema.index(
  { mobileNo: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false }
  }
);
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Message {

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({
    enum: ['text', 'image', 'file', 'video'],
    default: 'text'
  })
  type!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: Object, default: {} })
  meta?: any;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ default: false })
  isEdited!: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
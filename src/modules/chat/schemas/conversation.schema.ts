import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Conversation {

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participants!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ default: false })
  isGroup!: boolean;

  @Prop()
  groupName?: string;

  @Prop()
  groupAvatar?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// 🔥 prevent duplicate conversation
ConversationSchema.index({ participants: 1 });
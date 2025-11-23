import { Schema } from 'mongoose';

const notificationSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    msg: {
      type: String,
      required: true,
    },
    dateTime: {
      type: Date,
    },
    sender: {
      type: String,
      required: true,
    },
    contextId: {
      type: Schema.Types.ObjectId,
    },
    type: {
      type: String,
      required: true,
    },
  },
  { collection: 'Notification' },
);

export default notificationSchema;

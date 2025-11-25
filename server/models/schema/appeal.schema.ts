import { Schema } from 'mongoose';
/**
 * Mongoose schema for the Appeal collection.
 *
 * Fields:
 * - `community`: Reference to the community the appeal belongs to.
 * - `username`: Name of the user submitting the appeal.
 * - `description`: Details explaining the reason for the appeal.
 * - `appealDateTime`: Timestamp capturing when the appeal was filed.
 * - `reviewed`: Flag indicating whether the appeal has been reviewed.
 */

const appealSchema: Schema = new Schema({
  community: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
  },
  username: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  appealDateTime: {
    type: Date,
    required: true,
  },
});

export default appealSchema;

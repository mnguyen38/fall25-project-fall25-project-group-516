import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Report collection.
 *
 * This schema defines the structure for storing user reports in the database.
 * Reports are community-specific - users can only report others within their community.
 * Each Report includes the following fields:
 * - `communityId`: ID of the community where the report occurred
 * - `reportedUser`: Username of the user being reported
 * - `reporterUser`: Username of the user making the report
 * - `reason`: Detailed description of why the user is being reported
 * - `category`: Type of violation (spam, harassment, etc.)
 * - `status`: Current status of the report (pending, reviewed, dismissed)
 * - `createdAt`: Timestamp when the report was created
 * - `reviewedBy`: Moderator username who reviewed the report
 * - `reviewedAt`: Timestamp when the report was reviewed
 */
const reportSchema: Schema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true, // For community-specific queries
    },
    reportedUser: {
      type: String,
      required: true,
      index: true, // For fast lookups of reports against a user
    },
    reporterUser: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'misleading', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true, // For sliding window queries
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { collection: 'Report' },
);

// Compound index: prevent duplicate reports from same user about same target in same community
reportSchema.index({ communityId: 1, reportedUser: 1, reporterUser: 1 }, { unique: true });

// Compound index for sliding window: get recent reports for a specific user in a community
reportSchema.index({ communityId: 1, reportedUser: 1, createdAt: -1 });

export default reportSchema;

import { ObjectId } from 'mongodb';
import { Request } from 'express';

export interface BadgeRequirement {
  type:
    | 'question_count'
    | 'answer_count'
    | 'upvote_count'
    | 'login_streak'
    | 'comment_count'
    | 'first_question'
    | 'first_answer';
  threshold: number;
}

export interface Badge {
  name: string;
  description: string;
  icon: string;
  category: 'participation' | 'achievement' | 'streak' | 'special';
  requirement: BadgeRequirement;
  hint: string;
  progress: boolean;
  coinValue: number;
}

export interface DatabaseBadge extends Badge {
  _id: ObjectId;
}

export interface BadgeWithProgress extends DatabaseBadge {
  userProgress: number;
  earned: boolean;
}

export interface CreateBadgeRequest extends Request {
  body: Badge;
}

export interface GetUserBadgesRequest extends Request {
  params: {
    username: string;
  };
}

import { Appeal, AppealResponse, DatabaseAppeal } from '@fake-stack-overflow/shared';
import AppealModel from '../models/appeal.model';
import { ClientSession } from 'mongoose';

const saveAppeal = async (appeal: Appeal, session: ClientSession): Promise<AppealResponse> => {
  try {
    const [result] = await AppealModel.create([appeal], { session });

    if (!result) {
      throw new Error('Failed to create appeal');
    }

    return result.toObject() as DatabaseAppeal;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

export default saveAppeal;

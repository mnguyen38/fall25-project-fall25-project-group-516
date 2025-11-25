import mongoose, { Model } from 'mongoose';
import appealSchema from './schema/appeal.schema';
import { DatabaseAppeal } from '../types/types';

const AppealModel: Model<DatabaseAppeal> = mongoose.model<DatabaseAppeal>('Appeal', appealSchema);

export default AppealModel;

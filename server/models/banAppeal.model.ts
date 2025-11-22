import mongoose from 'mongoose';
import banAppealSchema from './schema/banAppeal.schema';

const BanAppealModel = mongoose.model('BanAppeal', banAppealSchema);

export default BanAppealModel;

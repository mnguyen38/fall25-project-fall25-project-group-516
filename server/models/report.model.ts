import mongoose from 'mongoose';
import reportSchema from './schema/report.schema';

const ReportModel = mongoose.model('Report', reportSchema);

export default ReportModel;

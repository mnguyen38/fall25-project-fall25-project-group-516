/* eslint no-console: "off" */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGODB_URI;
if (!MONGO_URL) {
  throw new Error('MONGODB_URI not set in environment variables');
}

mongoose.connect(`${MONGO_URL}/fake_so`);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

/**
 * Clears all collections from the connected MongoDB database.
 *
 * @returns A Promise that resolves when the database has been cleared.
 */
const clearDatabase = async (): Promise<void> => {
  try {
    // Wait for the connection to be established
    await mongoose.connection.once('open', async () => {
      // Clear each collection
      await db.dropDatabase();

      console.log('Database cleared');
      if (db) db.close();
    });
  } catch (err) {
    console.log(`ERROR: ${err}`);
    if (db) db.close();
  }
};

clearDatabase()
  .then(() => {
    console.log('Processing complete');
  })
  .catch(err => {
    console.log(`ERROR: ${err}`);
  });

console.log('Processing ...');

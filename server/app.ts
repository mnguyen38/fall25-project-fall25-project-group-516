/* eslint no-console: "off" */

// The server should run on localhost port 8000.
// This is where you should start writing server-side code for this application.
// startServer() is a function that starts the server
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import * as http from 'http';
import * as OpenApiValidator from 'express-openapi-validator';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

import answerController from './controllers/answer.controller';
import questionController from './controllers/question.controller';
import tagController from './controllers/tag.controller';
import commentController from './controllers/comment.controller';
import { FakeSOSocket } from './types/types';
import userController from './controllers/user.controller';
import messageController from './controllers/message.controller';
import chatController from './controllers/chat.controller';
import gameController from './controllers/game.controller';
import collectionController from './controllers/collection.controller';
import communityController from './controllers/community.controller';
import badgeController from './controllers/badge.controller';
import openAuthorizationController from './controllers/authorization.controller';
import protect from './middleware/token.middleware';

const MONGO_URL = `${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'}/fake_so`;
const PORT = parseInt(process.env.PORT || '8000');

const app = express();
const server = http.createServer(app);
// allow requests from the local dev client or the production client only
const socket: FakeSOSocket = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: `${process.env.CLIENT_URL}` || 'http://localhost:4530',
    credentials: true,
  },
});

function connectDatabase() {
  return mongoose.connect(MONGO_URL).catch(err => console.log('MongoDB connection error: ', err));
}

function startServer() {
  connectDatabase();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

socket.on('connection', socket => {
  console.log('A user connected ->', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  socket.close();

  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

app.use(express.json());

try {
  app.use(
    OpenApiValidator.middleware({
      apiSpec: './openapi.yaml',
      validateRequests: true,
      validateResponses: true,
      ignoreUndocumented: true, // Only validate paths defined in the spec
      formats: {
        'object-id': (v: string) => /^[0-9a-fA-F]{24}$/.test(v),
      },
    }),
  );

  // Custom Error Handler for express-openapi-validator errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Format error response for validation errors
    if (err.status && err.errors) {
      res.status(err.status).json({
        message: 'Request Validation Failed',
        errors: err.errors,
      });
    } else {
      next(err); // Pass through other errors
    }
  });
} catch (e) {
  console.error('Failed to load or initialize OpenAPI Validator:', e);
}

app.use('/api/question', protect, questionController(socket));
app.use('/api/tags', protect, tagController());
app.use('/api/answer', protect, answerController(socket));
app.use('/api/comment', protect, commentController(socket));
app.use('/api/message', protect, messageController(socket));
app.use('/api/user', userController(socket));
app.use('/api/chat', protect, chatController(socket));
app.use('/api/games', protect, gameController(socket));
app.use('/api/collection', protect, collectionController(socket));
app.use('/api/community', protect, communityController(socket));
app.use('/api/badge', protect, badgeController(socket));
app.use('/api/auth', openAuthorizationController());

const openApiDocument = yaml.parse(fs.readFileSync('./openapi.yaml', 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
console.log('Swagger UI is available at /api/docs');

// Serve static files from the clients dist folder in production
if (process.env.MODE === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // Serve index.html for all non-API routes (THIS IS THE LAST BLOCK)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Export the app instance
export { app, server, startServer };

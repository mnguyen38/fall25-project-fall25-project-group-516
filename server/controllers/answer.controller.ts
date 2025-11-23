import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import { Answer, AddAnswerRequest, FakeSOSocket, PopulatedDatabaseAnswer } from '../types/types';
import { addAnswerToQuestion, saveAnswer } from '../services/answer.service';
import { populateDocument } from '../utils/database.util';
import { checkAndAwardBadges } from '../services/badge.service';
import userSocketMap from '../utils/socketMap.util';
import { sendNotification } from '../services/notification.service';
import { Notification } from '@fake-stack-overflow/shared/types/notification';

const answerController = (socket: FakeSOSocket) => {
  const router = express.Router();
  /**
   * Adds a new answer to a question in the database. The answer request and answer are
   * validated and then saved. If successful, the answer is associated with the corresponding
   * question. If there is an error, the HTTP response's status is updated.
   *
   * @param req The AnswerRequest object containing the question ID and answer data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const addAnswer = async (req: AddAnswerRequest, res: Response): Promise<void> => {
    const { qid } = req.body;
    const ansInfo: Answer = req.body.ans;

    try {
      const ansFromDb = await saveAnswer(ansInfo);

      if ('error' in ansFromDb) {
        throw new Error(ansFromDb.error as string);
      }

      const status = await addAnswerToQuestion(qid, ansFromDb);

      if (status && 'error' in status) {
        throw new Error(status.error as string);
      }

      // Check and award badges to the user
      await checkAndAwardBadges(ansInfo.ansBy);

      const populatedAns = await populateDocument(ansFromDb._id.toString(), 'answer');

      if (populatedAns && 'error' in populatedAns) {
        throw new Error(populatedAns.error);
      }

      const notificationData: Notification = {
        title: `New Answer from ${ansFromDb.ansBy}`,
        msg: ansFromDb.text,
        dateTime: ansFromDb.ansDateTime,
        sender: ansFromDb.ansBy,
        contextId: status._id,
        type: 'answer',
      };

      const sentNotification = await sendNotification([status.askedBy], notificationData);

      if ('error' in sentNotification) {
        throw new Error(sentNotification.error);
      }

      const socketId = userSocketMap.get(status.askedBy);

      if (socketId) {
        socket.to(socketId).emit('notificationUpdate', {
          notificationStatus: { notification: notificationData, read: false },
        });
      }
      // Populates the fields of the answer that was added and emits the new object
      socket.emit('answerUpdate', {
        qid: new ObjectId(qid),
        answer: populatedAns as PopulatedDatabaseAnswer,
      });
      res.json(ansFromDb);
    } catch (err) {
      res.status(500).send(`Error when adding answer: ${(err as Error).message}`);
    }
  };

  // add appropriate HTTP verbs and their endpoints to the router.
  router.post('/addAnswer', addAnswer);

  return router;
};

export default answerController;

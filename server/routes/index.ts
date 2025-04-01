import { Router } from 'express';
import conversationsRouter from './conversations';
import messagesRouter from './messages';

const router = Router();

// Register routes
router.use('/conversations', conversationsRouter);
router.use('/messages', messagesRouter);

export default router;
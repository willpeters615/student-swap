import { z } from 'zod';
import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { insertMessageSchema } from '@shared/schema';

const router = Router();

// Get messages for a conversation
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    const conversationId = parseInt(req.params.conversationId);
    
    // Get conversation to verify user is a participant
    const conversation = await storage.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify user is a participant
    const participants = await storage.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p => p.userId === userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view these messages' });
    }
    
    // Parse query parameters for pagination
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;
    
    // Get messages
    const messages = await storage.getMessagesByConversationId(conversationId, limit, before);
    
    // Mark all messages as read
    const updatePromises = messages
      .filter(m => m.senderId !== userId && !m.readAt)
      .map(m => storage.markMessageAsRead(m.id));
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      
      // Update participant's last read timestamp
      await storage.updateParticipantLastRead(conversationId, userId);
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    
    // Validate request body
    const schema = z.object({
      conversationId: z.number(),
      content: z.string().min(1)
    });
    
    const { conversationId, content } = schema.parse(req.body);
    
    // Verify conversation exists
    const conversation = await storage.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify user is a participant
    const participants = await storage.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p => p.userId === userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to send messages to this conversation' });
    }
    
    // Create the message
    const message = await storage.createMessage({
      conversationId,
      senderId: userId,
      content,
      hasAttachment: false,
      attachmentUrl: null
    });
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    const messageId = parseInt(req.params.id);
    
    // Get the message
    const message = await storage.getMessage(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Get the conversation
    const conversation = await storage.getConversation(message.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify user is a participant in the conversation
    const participants = await storage.getConversationParticipants(conversation.id);
    const isParticipant = participants.some(p => p.userId === userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }
    
    // Mark the message as read
    const updatedMessage = await storage.markMessageAsRead(messageId);
    
    // Update participant's last read timestamp
    await storage.updateParticipantLastRead(conversation.id, userId);
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Upload attachment (stub for future implementation)
router.post('/attachment', async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
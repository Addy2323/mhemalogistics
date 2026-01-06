import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's chat rooms
router.get('/', authenticateToken, async (req, res) => {
    try {
        const chats = await prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: {
                        userId: req.user.id
                    }
                }
            },
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        status: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                role: true,
                                avatarUrl: true

                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        res.json({ success: true, data: chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch chats' } });
    }
});

// Get chat room for a specific order
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Verify order exists and user has access
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { agent: true }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Check permissions
        const isCustomer = order.customerId === req.user.id;
        const isAgent = order.agent?.userId === req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isCustomer && !isAgent && !isAdmin) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        // Find or create chat room
        let chat = await prisma.chatRoom.findFirst({
            where: { orderId }
        });

        if (!chat) {
            chat = await prisma.chatRoom.create({
                data: {
                    type: 'ORDER',
                    orderId,
                    participants: {
                        create: [
                            { userId: order.customerId },
                            ...(order.agent ? [{ userId: order.agent.userId }] : [])
                        ]
                    }
                }
            });

            // Add admins to new chat
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });

            if (admins.length > 0) {
                await prisma.chatParticipant.createMany({
                    data: admins.map(admin => ({
                        chatId: chat.id,
                        userId: admin.id
                    })),
                    skipDuplicates: true
                });
            }
        } else {
            // Ensure current user is a participant
            await prisma.chatParticipant.upsert({
                where: {
                    chatId_userId: {
                        chatId: chat.id,
                        userId: req.user.id
                    }
                },
                create: {
                    chatId: chat.id,
                    userId: req.user.id
                },
                update: {}
            });
        }

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Get order chat error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch order chat' } });
    }
});


// Get messages for a specific chat
router.get('/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;

        // Verify participation
        const participant = await prisma.chatParticipant.findUnique({
            where: {
                chatId_userId: {
                    chatId,
                    userId: req.user.id
                }
            }
        });

        if (!participant) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const messages = await prisma.chatMessage.findMany({
            where: { chatId },
            include: {
                sender: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true,
                        avatarUrl: true

                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch messages' } });
    }
});

export default router;

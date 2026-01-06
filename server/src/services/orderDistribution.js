import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Order Distribution Service
 * Implements round-robin algorithm for distributing orders among online agents
 */
class OrderDistributionService {
    constructor() {
        this.lastAssignedIndex = 0;
    }

    /**
     * Assign an order to an agent using round-robin algorithm
     * @param {string} orderId - The order ID to assign
     * @returns {Promise<{agentId?: string, queued: boolean}>}
     */
    async assignOrder(orderId) {
        try {
            // Get all online agents with capacity
            const onlineAgents = await this.getAvailableAgents();

            if (onlineAgents.length === 0) {
                // No agents available - add to queue
                await this.addToQueue(orderId);

                // Update order status to QUEUED
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'QUEUED' }
                });

                console.log(`Order ${orderId} queued - no agents available`);
                return { queued: true };
            }

            // Select next agent in round-robin fashion
            const agent = this.selectNextAgent(onlineAgents);

            // Assign order to agent
            await this.assignToAgent(orderId, agent.id);

            // Create notification for agent
            await this.createAssignmentNotification(agent.userId, orderId);

            console.log(`Order ${orderId} assigned to agent ${agent.id}`);
            return { agentId: agent.id, agentUserId: agent.userId, queued: false };

        } catch (error) {
            console.error('Order assignment error:', error);
            throw error;
        }
    }

    /**
     * Get all available agents (online and under capacity)
     * @returns {Promise<Array>}
     */
    async getAvailableAgents() {
        const agents = await prisma.agent.findMany({
            where: {
                availabilityStatus: 'ONLINE',
                user: {
                    status: 'ACTIVE'
                }
            },
            include: {
                user: true
            },
            orderBy: {
                currentOrderCount: 'asc' // Prioritize agents with fewer orders
            }
        });

        // Filter agents under capacity
        return agents.filter(agent => agent.currentOrderCount < agent.maxOrderCapacity);
    }

    /**
     * Select next agent using round-robin algorithm
     * @param {Array} agents - Available agents
     * @returns {Object} Selected agent
     */
    selectNextAgent(agents) {
        this.lastAssignedIndex = (this.lastAssignedIndex + 1) % agents.length;
        return agents[this.lastAssignedIndex];
    }

    /**
     * Assign order to specific agent
     * @param {string} orderId
     * @param {string} agentId
     */
    async assignToAgent(orderId, agentId) {
        const now = new Date();

        // Update order
        await prisma.order.update({
            where: { id: orderId },
            data: {
                agentId,
                status: 'ASSIGNED',
                assignedAt: now
            }
        });

        // Increment agent's current order count
        await prisma.agent.update({
            where: { id: agentId },
            data: {
                currentOrderCount: {
                    increment: 1
                }
            }
        });
    }

    /**
     * Add order to queue
     * @param {string} orderId
     * @param {number} priority
     */
    async addToQueue(orderId, priority = 0) {
        await prisma.orderQueue.create({
            data: {
                orderId,
                priority
            }
        });
    }

    /**
     * Process queued orders when an agent becomes available
     * @param {string} agentId - Optional: process for specific agent
     * @returns {Promise<number>} Number of orders processed
     */
    async processQueue(agentId = null) {
        try {
            // Get queued orders (oldest first, highest priority first)
            const queuedOrders = await prisma.orderQueue.findMany({
                where: {
                    processedAt: null
                },
                include: {
                    order: true
                },
                orderBy: [
                    { priority: 'desc' },
                    { queuedAt: 'asc' }
                ]
            });

            if (queuedOrders.length === 0) {
                return 0;
            }

            let processedCount = 0;

            for (const queueItem of queuedOrders) {
                const result = await this.assignOrder(queueItem.order.id);

                if (!result.queued) {
                    // Mark queue item as processed
                    await prisma.orderQueue.update({
                        where: { id: queueItem.id },
                        data: { processedAt: new Date() }
                    });

                    processedCount++;
                } else {
                    // If still queued, stop processing
                    break;
                }
            }

            console.log(`Processed ${processedCount} queued orders`);
            return processedCount;

        } catch (error) {
            console.error('Queue processing error:', error);
            throw error;
        }
    }

    /**
     * Create notification for agent about new order assignment
     * @param {string} userId
     * @param {string} orderId
     */
    async createAssignmentNotification(userId, orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        await prisma.notification.create({
            data: {
                userId,
                type: 'ORDER_ASSIGNED',
                title: `New Order Assigned`,
                message: `You have been assigned order #${order.orderNumber}`,
                relatedOrderId: orderId
            }
        });
    }
}

// Export singleton instance
export default new OrderDistributionService();

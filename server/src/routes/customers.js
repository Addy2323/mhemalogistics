import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all customers (Admin only)
router.get('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { search, status } = req.query;

        const where = {
            role: 'CUSTOMER'
        };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }

        const customers = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { ordersAsCustomer: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to match frontend expectations
        const formattedCustomers = customers.map(c => ({
            id: c.id,
            name: c.fullName,
            email: c.email,
            phone: c.phone || 'N/A',
            avatarUrl: c.avatarUrl,
            location: 'Tanzania', // Placeholder as location isn't on User model yet
            status: c.status.toLowerCase(),
            joinedAt: c.createdAt,
            ordersCount: c._count.ordersAsCustomer
        }));


        res.json({ success: true, data: formattedCustomers });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch customers' } });
    }
});

// Delete customer (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if customer exists
        const customer = await prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { ordersAsCustomer: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ error: { message: 'Customer not found' } });
        }

        if (customer.role !== 'CUSTOMER') {
            return res.status(400).json({ error: { message: 'User is not a customer' } });
        }

        // Check for associated orders
        if (customer._count.ordersAsCustomer > 0) {
            return res.status(400).json({
                error: { message: 'Cannot delete customer with existing orders. Deactivate them instead.' }
            });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: { message: 'Failed to delete customer' } });
    }
});

export default router;

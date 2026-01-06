import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, phone, role = 'CUSTOMER' } = req.body;

        // Validation
        if (!email || !password || !fullName) {
            return res.status(400).json({
                error: { message: 'Email, password, and name are required' }
            });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                error: { message: 'Email already registered' }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phone,
                role: role === 'CUSTOMER' ? 'CUSTOMER' : 'CUSTOMER' // Only customers can self-register
            }
        });

        // Generate token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl
            }

        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: { message: 'Registration failed' } });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required' }
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { agent: true }
        });

        if (!user) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        // Check user status
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                error: { message: 'Account is inactive or suspended' }
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                agent: user.agent ? {

                    id: user.agent.id,
                    availabilityStatus: user.agent.availabilityStatus,
                    currentOrderCount: user.agent.currentOrderCount,
                    rating: user.agent.rating
                } : null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: { message: 'Login failed' } });
    }
});

export default router;

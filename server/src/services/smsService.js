import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SMS Service - Beem Africa Integration
 * Provides SMS notification capabilities for MHEMA Express Logistics
 */

// Configuration from environment
const SMS_CONFIG = {
    apiKey: process.env.SMS_API_KEY || '',
    secretKey: process.env.SMS_SECRET || '',
    senderId: process.env.SMS_SENDER_ID || 'Rodway Shop',
    enabled: process.env.SMS_ENABLED !== 'false',
    apiUrl: 'https://apisms.beem.africa/v1/send'
};

/**
 * Format phone number to international format (Tanzania)
 * @param {string} phone - Phone number in various formats
 * @returns {string} Phone number in format 255XXXXXXXXX
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
        // Local format: 0712345678 -> 255712345678
        cleaned = '255' + cleaned.substring(1);
    } else if (cleaned.startsWith('255')) {
        // Already in international format
    } else if (cleaned.length === 9) {
        // Just the number without prefix: 712345678
        cleaned = '255' + cleaned;
    }

    return cleaned;
}

/**
 * Log SMS activity to database
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS content
 * @param {string} status - SENT, FAILED, PENDING
 * @param {string} error - Error message if failed
 */
async function logSmsActivity(phone, message, status, error = null) {
    try {
        // Check if SmsLog model exists (in case migration hasn't been run)
        if (prisma.smsLog) {
            await prisma.smsLog.create({
                data: {
                    phone,
                    message,
                    status,
                    provider: 'beem',
                    error
                }
            });
        }
    } catch (logError) {
        console.error('Failed to log SMS activity:', logError.message);
        // Don't throw - logging failure shouldn't break SMS sending
    }
}

/**
 * Send SMS to a single recipient
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS content
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendSms(phoneNumber, message) {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!formattedPhone) {
        console.error('SMS: Invalid phone number provided');
        return { success: false, error: 'Invalid phone number' };
    }

    if (!SMS_CONFIG.enabled) {
        console.log(`SMS [DISABLED]: Would send to ${formattedPhone}: ${message.substring(0, 50)}...`);
        await logSmsActivity(formattedPhone, message, 'DISABLED');
        return { success: true, disabled: true };
    }

    if (!SMS_CONFIG.apiKey || !SMS_CONFIG.secretKey) {
        console.error('SMS: API credentials not configured');
        await logSmsActivity(formattedPhone, message, 'FAILED', 'API credentials not configured');
        return { success: false, error: 'SMS service not configured' };
    }

    try {
        // Prepare Beem Africa API request
        const payload = {
            source_addr: SMS_CONFIG.senderId,
            encoding: 0,
            schedule_time: '',
            message: message,
            recipients: [
                {
                    recipient_id: 1,
                    dest_addr: formattedPhone
                }
            ]
        };

        // Create Basic Auth header
        const authString = Buffer.from(`${SMS_CONFIG.apiKey}:${SMS_CONFIG.secretKey}`).toString('base64');

        const response = await fetch(SMS_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.code === 100) {
            console.log(`SMS sent successfully to ${formattedPhone}`);
            await logSmsActivity(formattedPhone, message, 'SENT');
            return { success: true, messageId: result.request_id };
        } else {
            const errorMsg = result.message || `HTTP ${response.status}`;
            console.error(`SMS failed to ${formattedPhone}: ${errorMsg}`);
            await logSmsActivity(formattedPhone, message, 'FAILED', errorMsg);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error(`SMS error to ${formattedPhone}:`, error.message);
        await logSmsActivity(formattedPhone, message, 'FAILED', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send bulk SMS to multiple recipients
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {string} message - SMS content
 * @returns {Promise<{success: boolean, sent: number, failed: number, results: Array}>}
 */
async function sendBulkSms(phoneNumbers, message) {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const phone of phoneNumbers) {
        const result = await sendSms(phone, message);
        results.push({ phone, ...result });

        if (result.success) {
            sent++;
        } else {
            failed++;
        }

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Bulk SMS completed: ${sent} sent, ${failed} failed`);
    return { success: failed === 0, sent, failed, results };
}

/**
 * Send order assignment SMS to agent
 * @param {object} agent - Agent object with user info
 * @param {object} order - Order object
 */
async function sendAgentAssignmentSms(agent, order) {
    if (!agent?.user?.phone) {
        console.log('SMS: Agent has no phone number, skipping SMS');
        return { success: false, error: 'No phone number' };
    }

    const message = `New Order Assigned
Order ID: ${order.orderNumber}
Pickup: ${order.pickupAddress}
Delivery: ${order.deliveryAddress}
Please login to MHEMA Express.`;

    return await sendSms(agent.user.phone, message);
}

/**
 * Send order completion SMS to customer
 * @param {object} customer - Customer object
 * @param {object} order - Order object
 */
async function sendOrderCompletionSms(customer, order) {
    if (!customer?.phone) {
        console.log('SMS: Customer has no phone number, skipping SMS');
        return { success: false, error: 'No phone number' };
    }

    const message = `Order Completed
Your order ${order.orderNumber} has been successfully delivered.
Thank you for using MHEMA Express.`;

    return await sendSms(customer.phone, message);
}

/**
 * Get SMS logs (for admin)
 * @param {object} options - Query options (limit, offset, status)
 */
async function getSmsLogs(options = {}) {
    const { limit = 50, offset = 0, status } = options;

    try {
        if (!prisma.smsLog) {
            return { logs: [], total: 0 };
        }

        const where = status ? { status } : {};

        const [logs, total] = await Promise.all([
            prisma.smsLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.smsLog.count({ where })
        ]);

        return { logs, total };
    } catch (error) {
        console.error('Failed to get SMS logs:', error.message);
        return { logs: [], total: 0, error: error.message };
    }
}

// Service status check
function isConfigured() {
    return !!(SMS_CONFIG.apiKey && SMS_CONFIG.secretKey);
}

function isEnabled() {
    return SMS_CONFIG.enabled && isConfigured();
}

// Export service functions
const smsService = {
    sendSms,
    sendBulkSms,
    sendAgentAssignmentSms,
    sendOrderCompletionSms,
    getSmsLogs,
    formatPhoneNumber,
    isConfigured,
    isEnabled
};

export default smsService;

// Log configuration status on import
console.log(`📱 SMS Service initialized - Enabled: ${isEnabled()}, Configured: ${isConfigured()}, Sender ID: ${SMS_CONFIG.senderId}`);

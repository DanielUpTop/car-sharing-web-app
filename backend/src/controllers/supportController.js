const db = require('../config/database');
const logger = require('../utils/logger');

class SupportController {
  /**
   * Initialize tables required for the support system
   */
  static async initializeTables(req, res) {
    try {
      // Create tickets table
      await db.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subject VARCHAR(255) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          priority VARCHAR(20) NOT NULL DEFAULT 'medium',
          category VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_reply_at TIMESTAMP,
          last_reply_by VARCHAR(10)
        )
      `);

      // Create ticket messages table
      await db.query(`
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          message TEXT NOT NULL,
          attachments TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      res.status(200).json({ message: 'Support tables initialized successfully' });
    } catch (error) {
      logger.error('Error initializing support tables:', error);
      res.status(500).json({ error: 'Failed to initialize support tables' });
    }
  }

  /**
   * Create a new support ticket
   * @param {Object} req - Request object with user_id, subject, category, and initial message
   * @param {Object} res - Response object
   */
  static async createTicket(req, res) {
    const { user_id, subject, category, message } = req.body;

    if (!user_id || !subject || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Insert ticket
      const ticketResult = await db.query(
        `INSERT INTO support_tickets 
         (user_id, subject, category) 
         VALUES ($1, $2, $3) 
         RETURNING id, status, priority, created_at`,
        [user_id, subject, category]
      );

      const ticket = ticketResult.rows[0];

      // Insert initial message
      await db.query(
        `INSERT INTO ticket_messages 
         (ticket_id, user_id, message, is_admin) 
         VALUES ($1, $2, $3, FALSE)`,
        [ticket.id, user_id, message]
      );

      // Update last reply info
      await db.query(
        `UPDATE support_tickets 
         SET last_reply_at = CURRENT_TIMESTAMP, last_reply_by = 'user'
         WHERE id = $1`,
        [ticket.id]
      );

      res.status(201).json({
        message: 'Support ticket created successfully',
        ticket_id: ticket.id,
        status: ticket.status,
        created_at: ticket.created_at
      });
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      res.status(500).json({ error: 'Failed to create support ticket' });
    }
  }

  /**
   * Get all tickets (admin only)
   */
  static async getAllTickets(req, res) {
    try {
      const result = await db.query(`
        SELECT t.id, t.user_id, u.name as user_name, t.subject, t.status, t.priority, 
               t.category, t.created_at, t.updated_at, t.last_reply_at, t.last_reply_by
        FROM support_tickets t
        JOIN users u ON t.user_id = u.id
        ORDER BY 
          CASE 
            WHEN t.status = 'open' THEN 1
            WHEN t.status = 'in_progress' THEN 2
            WHEN t.status = 'resolved' THEN 3
            WHEN t.status = 'closed' THEN 4
            ELSE 5
          END,
          CASE 
            WHEN t.priority = 'urgent' THEN 1
            WHEN t.priority = 'high' THEN 2
            WHEN t.priority = 'medium' THEN 3
            WHEN t.priority = 'low' THEN 4
            ELSE 5
          END,
          t.updated_at DESC
      `);

      res.status(200).json(result.rows);
    } catch (error) {
      logger.error('Error fetching all tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  /**
   * Get tickets for a specific user
   */
  static async getUserTickets(req, res) {
    const userId = req.params.userId;

    try {
      const result = await db.query(
        `SELECT id, subject, status, priority, category, created_at, updated_at, last_reply_at, last_reply_by
         FROM support_tickets
         WHERE user_id = $1
         ORDER BY 
           CASE 
             WHEN status = 'open' THEN 1
             WHEN status = 'in_progress' THEN 2
             WHEN status = 'resolved' THEN 3
             WHEN status = 'closed' THEN 4
             ELSE 5
           END,
           updated_at DESC`,
        [userId]
      );

      res.status(200).json(result.rows);
    } catch (error) {
      logger.error(`Error fetching tickets for user ${userId}:`, error);
      res.status(500).json({ error: 'Failed to fetch user tickets' });
    }
  }

  /**
   * Get details of a specific ticket
   */
  static async getTicketById(req, res) {
    const ticketId = req.params.ticketId;

    try {
      const result = await db.query(
        `SELECT t.id, t.user_id, u.name as user_name, t.subject, t.status, t.priority, 
                t.category, t.created_at, t.updated_at, t.last_reply_at, t.last_reply_by
         FROM support_tickets t
         JOIN users u ON t.user_id = u.id
         WHERE t.id = $1`,
        [ticketId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      logger.error(`Error fetching ticket ${ticketId}:`, error);
      res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
  }

  /**
   * Update a ticket's status or priority
   */
  static async updateTicket(req, res) {
    const ticketId = req.params.ticketId;
    const { status, priority } = req.body;

    // Validate status if provided
    if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority value' });
    }

    if (!status && !priority) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }

    try {
      // Build the query dynamically based on what fields are being updated
      let query = 'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP';
      const values = [];
      let paramCount = 1;

      if (status) {
        query += `, status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (priority) {
        query += `, priority = $${paramCount}`;
        values.push(priority);
        paramCount++;
      }

      query += ` WHERE id = $${paramCount} RETURNING *`;
      values.push(ticketId);

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.status(200).json({
        message: 'Ticket updated successfully',
        ticket: result.rows[0]
      });
    } catch (error) {
      logger.error(`Error updating ticket ${ticketId}:`, error);
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  }

  /**
   * Get all messages for a specific ticket
   */
  static async getTicketMessages(req, res) {
    const ticketId = req.params.ticketId;

    try {
      const result = await db.query(
        `SELECT id, ticket_id, user_id, admin_id, is_admin, message, attachments, created_at
         FROM ticket_messages
         WHERE ticket_id = $1
         ORDER BY created_at ASC`,
        [ticketId]
      );

      res.status(200).json(result.rows);
    } catch (error) {
      logger.error(`Error fetching messages for ticket ${ticketId}:`, error);
      res.status(500).json({ error: 'Failed to fetch ticket messages' });
    }
  }

  /**
   * Add a message to a ticket
   */
  static async addTicketMessage(req, res) {
    const ticketId = req.params.ticketId;
    const { message, is_admin, user_id, admin_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check that we have either user_id or admin_id based on is_admin
    if (is_admin && !admin_id) {
      return res.status(400).json({ error: 'Admin ID is required for admin messages' });
    }

    if (!is_admin && !user_id) {
      return res.status(400).json({ error: 'User ID is required for user messages' });
    }

    try {
      // First verify the ticket exists
      const ticketCheck = await db.query('SELECT id FROM support_tickets WHERE id = $1', [ticketId]);
      
      if (ticketCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Insert the message
      const messageResult = await db.query(
        `INSERT INTO ticket_messages 
         (ticket_id, user_id, admin_id, is_admin, message) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, created_at`,
        [ticketId, is_admin ? null : user_id, is_admin ? admin_id : null, is_admin, message]
      );

      // Update the last reply info on the ticket
      await db.query(
        `UPDATE support_tickets 
         SET last_reply_at = CURRENT_TIMESTAMP, last_reply_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [is_admin ? 'admin' : 'user', ticketId]
      );

      res.status(201).json({
        message: 'Message added successfully',
        id: messageResult.rows[0].id,
        created_at: messageResult.rows[0].created_at
      });
    } catch (error) {
      logger.error(`Error adding message to ticket ${ticketId}:`, error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  }

  /**
   * Get ticket statistics for admin dashboard
   */
  static async getTicketStatistics(req, res) {
    try {
      // Get counts by status
      const statusCountsResult = await db.query(`
        SELECT status, COUNT(*) as count
        FROM support_tickets
        GROUP BY status
      `);

      // Get counts by priority for open and in-progress tickets
      const priorityCountsResult = await db.query(`
        SELECT priority, COUNT(*) as count
        FROM support_tickets
        WHERE status IN ('open', 'in_progress')
        GROUP BY priority
      `);

      // Get average resolution time (for resolved tickets)
      const avgResolutionTimeResult = await db.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
        FROM support_tickets
        WHERE status = 'resolved'
      `);

      // Get tickets requiring attention (open tickets with no reply from admin)
      const needsAttentionResult = await db.query(`
        SELECT COUNT(*) as count
        FROM support_tickets
        WHERE status = 'open' AND (last_reply_by IS NULL OR last_reply_by = 'user')
      `);

      // Format the status counts into an object
      const statusCounts = {};
      statusCountsResult.rows.forEach(row => {
        statusCounts[row.status] = parseInt(row.count);
      });

      // Ensure all statuses have a value
      const allStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      allStatuses.forEach(status => {
        if (!statusCounts[status]) {
          statusCounts[status] = 0;
        }
      });

      // Format the priority counts into an object
      const priorityCounts = {};
      priorityCountsResult.rows.forEach(row => {
        priorityCounts[row.priority] = parseInt(row.count);
      });

      // Ensure all priorities have a value
      const allPriorities = ['low', 'medium', 'high', 'urgent'];
      allPriorities.forEach(priority => {
        if (!priorityCounts[priority]) {
          priorityCounts[priority] = 0;
        }
      });

      res.status(200).json({
        total_tickets: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        status_counts: statusCounts,
        priority_counts: priorityCounts,
        avg_resolution_time_hours: avgResolutionTimeResult.rows[0].avg_hours || 0,
        needs_attention: parseInt(needsAttentionResult.rows[0].count) || 0
      });
    } catch (error) {
      logger.error('Error fetching ticket statistics:', error);
      res.status(500).json({ error: 'Failed to fetch ticket statistics' });
    }
  }
}

module.exports = SupportController; 
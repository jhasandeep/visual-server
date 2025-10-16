const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Page = require('../models/Page');

// Store active users per page
const activeUsers = new Map();

const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected with socket ${socket.id}`);

    // Join page room
    socket.on('join-page', async (pageId) => {
      try {
        // Verify user has access to the page
        const page = await Page.findById(pageId);
        if (!page) {
          socket.emit('error', { message: 'Page not found' });
          return;
        }

        if (!page.hasAccess(socket.userId)) {
          socket.emit('error', { message: 'Access denied to this page' });
          return;
        }

        // Leave previous page room if any
        if (socket.currentPageId) {
          socket.leave(socket.currentPageId);
          removeUserFromPage(socket.currentPageId, socket.userId);
        }

        // Join new page room
        socket.join(pageId);
        socket.currentPageId = pageId;

        // Add user to active users list
        addUserToPage(pageId, socket.userId, socket.user);

        // Notify others in the room
        socket.to(pageId).emit('user-joined', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          }
        });

        // Send current active users to the new user
        const currentUsers = getActiveUsersForPage(pageId);
        socket.emit('active-users', currentUsers);

        console.log(`User ${socket.user.name} joined page ${pageId}`);
      } catch (error) {
        console.error('Join page error:', error);
        socket.emit('error', { message: 'Failed to join page' });
      }
    });

    // Handle real-time block updates
    socket.on('update-blocks', async (data) => {
      try {
        const { pageId, blocks, changeType, blockId } = data;

        // Verify user has edit access
        const page = await Page.findById(pageId);
        if (!page || !page.hasAccess(socket.userId, 'editor')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Save to history
        page.history.push({
          version: page.version,
          blocks: page.blocks,
          updatedAt: new Date(),
          updatedBy: socket.userId,
          changeDescription: `${changeType} block${blockId ? ` ${blockId}` : ''}`
        });

        // Keep only last 10 versions
        if (page.history.length > 10) {
          page.history = page.history.slice(-10);
        }

        // Update blocks and version
        page.blocks = blocks;
        page.version += 1;
        await page.save();

        // Broadcast update to other users in the room
        socket.to(pageId).emit('blocks-updated', {
          blocks,
          version: page.version,
          updatedBy: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          changeType,
          blockId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Update blocks error:', error);
        socket.emit('error', { message: 'Failed to update blocks' });
      }
    });

    // Handle cursor position updates
    socket.on('cursor-move', (data) => {
      if (socket.currentPageId) {
        socket.to(socket.currentPageId).emit('user-cursor', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          position: data.position,
          blockId: data.blockId
        });
      }
    });

    // Handle selection changes
    socket.on('block-select', (data) => {
      if (socket.currentPageId) {
        socket.to(socket.currentPageId).emit('block-selected', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          blockId: data.blockId,
          timestamp: new Date()
        });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      if (socket.currentPageId) {
        socket.to(socket.currentPageId).emit('user-typing', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          blockId: data.blockId,
          isTyping: true
        });
      }
    });

    socket.on('typing-stop', (data) => {
      if (socket.currentPageId) {
        socket.to(socket.currentPageId).emit('user-typing', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          blockId: data.blockId,
          isTyping: false
        });
      }
    });

    // Handle page settings updates
    socket.on('update-page-settings', async (data) => {
      try {
        const { pageId, settings } = data;

        // Verify user has edit access
        const page = await Page.findById(pageId);
        if (!page || !page.hasAccess(socket.userId, 'editor')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Update page settings
        page.settings = { ...page.settings, ...settings };
        await page.save();

        // Broadcast update
        socket.to(pageId).emit('page-settings-updated', {
          settings: page.settings,
          updatedBy: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Update page settings error:', error);
        socket.emit('error', { message: 'Failed to update page settings' });
      }
    });

    // Handle page title updates
    socket.on('update-page-title', async (data) => {
      try {
        const { pageId, title } = data;

        // Verify user has edit access
        const page = await Page.findById(pageId);
        if (!page || !page.hasAccess(socket.userId, 'editor')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Update page title
        page.title = title;
        await page.save();

        // Broadcast update
        socket.to(pageId).emit('page-title-updated', {
          title: page.title,
          updatedBy: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Update page title error:', error);
        socket.emit('error', { message: 'Failed to update page title' });
      }
    });

    // Handle undo/redo operations
    socket.on('undo-redo', async (data) => {
      try {
        const { pageId, action, version } = data;

        // Verify user has edit access
        const page = await Page.findById(pageId);
        if (!page || !page.hasAccess(socket.userId, 'editor')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        let targetVersion;
        if (action === 'undo') {
          targetVersion = page.version - 1;
        } else if (action === 'redo') {
          targetVersion = page.version + 1;
        } else if (version !== undefined) {
          targetVersion = version;
        }

        // Find the target version in history
        const historyEntry = page.history.find(h => h.version === targetVersion);
        if (historyEntry) {
          page.blocks = historyEntry.blocks;
          page.version = targetVersion;
          await page.save();

          // Broadcast update
          socket.to(pageId).emit('history-navigated', {
            blocks: page.blocks,
            version: page.version,
            action,
            updatedBy: {
              _id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });
        }

      } catch (error) {
        console.error('Undo/redo error:', error);
        socket.emit('error', { message: 'Failed to perform undo/redo operation' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.name} disconnected`);

      if (socket.currentPageId) {
        // Remove user from active users
        removeUserFromPage(socket.currentPageId, socket.userId);

        // Notify others in the room
        socket.to(socket.currentPageId).emit('user-left', {
          userId: socket.userId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          }
        });
      }
    });
  });
};

// Helper functions for managing active users
const addUserToPage = (pageId, userId, user) => {
  if (!activeUsers.has(pageId)) {
    activeUsers.set(pageId, new Map());
  }
  
  const pageUsers = activeUsers.get(pageId);
  pageUsers.set(userId, {
    _id: user._id,
    name: user.name,
    avatar: user.avatar,
    joinedAt: new Date()
  });
};

const removeUserFromPage = (pageId, userId) => {
  const pageUsers = activeUsers.get(pageId);
  if (pageUsers) {
    pageUsers.delete(userId);
    if (pageUsers.size === 0) {
      activeUsers.delete(pageId);
    }
  }
};

const getActiveUsersForPage = (pageId) => {
  const pageUsers = activeUsers.get(pageId);
  return pageUsers ? Array.from(pageUsers.values()) : [];
};

module.exports = { setupSocketHandlers };


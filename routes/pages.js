const express = require('express');
const Page = require('../models/Page');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { 
  validateRequest, 
  createPageSchema, 
  updatePageSchema, 
  addCollaboratorSchema,
  updateBlocksSchema 
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/pages
// @desc    Get user's pages
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isPublished, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    };

    if (category) {
      query.category = category;
    }

    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      ];
    }

    const pages = await Page.find(query)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Page.countDocuments(query);

    res.json({
      success: true,
      data: {
        pages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/pages/public
// @desc    Get public pages
// @access  Public
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublished: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const pages = await Page.find(query)
      .populate('owner', 'name avatar')
      .select('title description slug publishedAt analytics.views category tags')
      .sort({ 'analytics.views': -1, publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Page.countDocuments(query);

    res.json({
      success: true,
      data: {
        pages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get public pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/pages/:id
// @desc    Get single page
// @access  Private/Public (if published)
router.get('/:id', auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check access permissions
    if (!page.isPublished) {
      // For unpublished pages, user must be the owner
      if (!req.user || !page.owner.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Update view count for published pages
    if (page.isPublished) {
      page.analytics.views += 1;
      page.analytics.lastViewed = new Date();
      await page.save();
    }

    res.json({
      success: true,
      data: { page }
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/pages
// @desc    Create new page
// @access  Private
router.post('/', auth, validateRequest(createPageSchema), async (req, res) => {
  try {
    const pageData = {
      ...req.body,
      owner: req.user._id
    };

    const page = new Page(pageData);
    await page.save();

    // Populate the response
    await page.populate('owner', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      data: { page }
    });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during page creation'
    });
  }
});

// @route   PUT /api/pages/:id
// @desc    Update page
// @access  Private
router.put('/:id', auth, validateRequest(updatePageSchema), async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check permissions
    if (!page.hasAccess(req.user._id, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Save to history if blocks are being updated
    if (req.body.blocks) {
      page.history.push({
        version: page.version,
        blocks: page.blocks,
        updatedAt: new Date(),
        updatedBy: req.user._id,
        changeDescription: 'Blocks updated'
      });

      // Keep only last 10 versions
      if (page.history.length > 10) {
        page.history = page.history.slice(-10);
      }

      page.version += 1;
    }

    // Update page
    Object.assign(page, req.body);
    await page.save();

    res.json({
      success: true,
      message: 'Page updated successfully',
      data: { page }
    });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during page update'
    });
  }
});

// @route   PUT /api/pages/:id/blocks
// @desc    Update page blocks
// @access  Private
router.put('/:id/blocks', auth, validateRequest(updateBlocksSchema), async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check permissions
    if (!page.hasAccess(req.user._id, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Save to history
    page.history.push({
      version: page.version,
      blocks: page.blocks,
      updatedAt: new Date(),
      updatedBy: req.user._id,
      changeDescription: 'Blocks updated'
    });

    // Keep only last 10 versions
    if (page.history.length > 10) {
      page.history = page.history.slice(-10);
    }

    // Update blocks and version
    page.blocks = req.body.blocks;
    page.version += 1;
    await page.save();

    res.json({
      success: true,
      message: 'Blocks updated successfully',
      data: { page }
    });
  } catch (error) {
    console.error('Update blocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during blocks update'
    });
  }
});

// @route   POST /api/pages/:id/collaborators
// @desc    Add collaborator to page
// @access  Private
router.post('/:id/collaborators', auth, validateRequest(addCollaboratorSchema), async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check permissions (only owner and admins can add collaborators)
    if (!page.hasAccess(req.user._id, 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if user exists
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add collaborator
    await page.addCollaborator(req.body.userId, req.body.role);
    await page.populate('collaborators.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      data: { page }
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during collaborator addition'
    });
  }
});

// @route   DELETE /api/pages/:id/collaborators/:userId
// @desc    Remove collaborator from page
// @access  Private
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check permissions (only owner and admins can remove collaborators)
    if (!page.hasAccess(req.user._id, 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove collaborator
    await page.removeCollaborator(req.params.userId);
    await page.populate('collaborators.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Collaborator removed successfully',
      data: { page }
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during collaborator removal'
    });
  }
});

// @route   DELETE /api/pages/:id
// @desc    Delete page
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check permissions (only owner can delete)
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Page.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during page deletion'
    });
  }
});

module.exports = router;


const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

// User validation schemas
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  avatar: Joi.string().uri(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark'),
    notifications: Joi.boolean()
  })
});

// Page validation schemas
const createPageSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow(''),
  category: Joi.string().valid('business', 'portfolio', 'blog', 'landing', 'personal', 'other'),
  tags: Joi.array().items(Joi.string().trim().max(20)),
  settings: Joi.object({
    theme: Joi.string().allow(''),
    favicon: Joi.string().uri().allow(''),
    metaTitle: Joi.string().max(60).allow(''),
    metaDescription: Joi.string().max(160).allow(''),
    customCSS: Joi.string().max(10000).allow(''),
    customJS: Joi.string().max(10000).allow('')
  })
});

const updatePageSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow(''),
  blocks: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('text', 'image', 'button', 'container', 'form', 'divider', 'card', 'list').required(),
      content: Joi.object(),
      styles: Joi.object(),
      children: Joi.array(),
      parent: Joi.string().allow(null),
      order: Joi.number().default(0)
    })
  ),
  category: Joi.string().valid('business', 'portfolio', 'blog', 'landing', 'personal', 'other'),
  tags: Joi.array().items(Joi.string().trim().max(20)),
  settings: Joi.object({
    theme: Joi.string().allow(''),
    favicon: Joi.string().uri().allow(''),
    metaTitle: Joi.string().max(60).allow(''),
    metaDescription: Joi.string().max(160).allow(''),
    customCSS: Joi.string().max(10000).allow(''),
    customJS: Joi.string().max(10000).allow('')
  }),
  isPublished: Joi.boolean()
});

const addCollaboratorSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('viewer', 'editor', 'admin').default('editor')
});

// Block validation schemas
const blockSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('text', 'image', 'button', 'container', 'form', 'divider', 'card', 'list').required(),
  content: Joi.object().required(),
  styles: Joi.object(),
  children: Joi.array().items(Joi.string()),
  parent: Joi.string().allow(null),
  order: Joi.number().default(0)
});

const updateBlocksSchema = Joi.object({
  blocks: Joi.array().items(blockSchema).required()
});

module.exports = {
  validateRequest,
  registerSchema,
  loginSchema,
  updateUserSchema,
  createPageSchema,
  updatePageSchema,
  addCollaboratorSchema,
  updateBlocksSchema
};


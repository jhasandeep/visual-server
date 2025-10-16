const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'button', 'container', 'form', 'divider', 'card', 'list']
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  styles: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block'
  }],
  parent: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  blocks: [blockSchema],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'editor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  publishedUrl: {
    type: String
  },
  version: {
    type: Number,
    default: 1
  },
  history: [{
    version: Number,
    blocks: [blockSchema],
    updatedAt: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDescription: String
  }],
  settings: {
    theme: {
      type: String,
      default: 'default'
    },
    favicon: String,
    metaTitle: String,
    metaDescription: String,
    customCSS: String,
    customJS: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  tags: [String],
  category: {
    type: String,
    enum: ['business', 'portfolio', 'blog', 'landing', 'personal', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Indexes for performance
pageSchema.index({ owner: 1, createdAt: -1 });
pageSchema.index({ slug: 1 });
pageSchema.index({ isPublished: 1, publishedAt: -1 });
pageSchema.index({ tags: 1 });
pageSchema.index({ 'collaborators.user': 1 });

// Generate slug before saving
pageSchema.pre('save', function(next) {
  if (this.isModified('title') && this.isPublished) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Update publishedAt when publishing
pageSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
    this.publishedUrl = `/preview/${this._id}`;
  }
  next();
});

// Virtual for blocks count
pageSchema.virtual('blocksCount').get(function() {
  return this.blocks.length;
});

// Virtual for collaborators count
pageSchema.virtual('collaboratorsCount').get(function() {
  return this.collaborators.length;
});

// Method to add collaborator
pageSchema.methods.addCollaborator = function(userId, role = 'editor') {
  const existingCollaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (!existingCollaborator) {
    this.collaborators.push({ user: userId, role });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove collaborator
pageSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user has access
pageSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  if (this.owner.toString() === userId.toString()) return true;
  
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (!collaborator) return false;
  
  const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
  return roleHierarchy[collaborator.role] >= roleHierarchy[requiredRole];
};

module.exports = mongoose.model('Page', pageSchema);


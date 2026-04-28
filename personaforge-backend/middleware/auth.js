import mongoose from 'mongoose';
import crypto from 'crypto';

// API Key Schema (for backend validation)
const apiKeySchema = new mongoose.Schema({
  keyHash: String,
  keyPrefix: String,
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  lastUsedAt: Date,
  isActive: Boolean,
  createdAt: Date
});

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Hash API key using SHA-256
 */
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Authenticate API key middleware
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <API-Token>' 
      });
    }

    const apiKey = authHeader.split(' ')[1];

    if (!apiKey || !apiKey.startsWith('sk_')) {
      return res.status(401).json({ 
        error: 'Invalid API key format. Key must start with sk_' 
      });
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }

    // Hash the provided key
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12);

    // Find the API key in database
    const apiKeyDoc = await ApiKey.findOne({
      keyPrefix,
      isActive: true
    });

    if (!apiKeyDoc) {
      return res.status(401).json({ 
        error: 'Invalid or inactive API key' 
      });
    }

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(keyHash, 'utf-8'),
      Buffer.from(apiKeyDoc.keyHash, 'utf-8')
    );

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid API key' 
      });
    }

    // Update last used timestamp
    apiKeyDoc.lastUsedAt = new Date();
    await apiKeyDoc.save();

    // Attach user ID to request
    req.userId = apiKeyDoc.userId;
    req.apiKeyId = apiKeyDoc._id;

    next();
  } catch (error) {
    console.error('API key authentication error:', safeErrorMessage(error));
    return res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
}

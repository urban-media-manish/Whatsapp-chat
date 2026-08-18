import express from 'express';
import { User } from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';

const router = express.Router();

// Auto seed single dedicated admin & remove all demo accounts
export const seedInitialUsers = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@official.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Secret2026';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    // Remove all old demo accounts
    await User.deleteMany({
      email: { $in: ['agent@support.com', 'manager@support.com', 'admin@support.com'] }
    });

    // Check if designated admin user exists
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      // Clean up any remaining non-matching users to ensure only 1 admin exists
      await User.deleteMany({});

      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: '+91 98765 43210',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      });
      console.log(`🔒 Single Dedicated Admin seeded: ${adminEmail}`);
    } else {
      // Delete any other users to keep strictly ONE single admin
      await User.deleteMany({ _id: { $ne: adminUser._id } });
    }
  } catch (err) {
    console.error('Error seeding single admin user:', err);
  }
};

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.matchPassword(password))) {
      user.status = 'online';
      user.lastActive = new Date();
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        status: user.status,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// @route GET /api/auth/agents
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await User.find({}).select('-password');
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/auth/status
router.put('/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    req.user.status = status;
    req.user.lastActive = new Date();
    await req.user.save();
    res.json({ status: req.user.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

import express from 'express';
import { User } from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';

const router = express.Router();

// Auto seed initial admin & agents on startup/demand
export const seedInitialUsers = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.create({
        name: 'Sarah Connor (Admin)',
        email: 'admin@support.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1 (555) 019-2831',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      });
      await User.create({
        name: 'Alex Rivera (Support Agent)',
        email: 'agent@support.com',
        password: 'agent123',
        role: 'agent',
        phone: '+1 (555) 014-9921',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      });
      await User.create({
        name: 'Elena Rostova (Manager)',
        email: 'manager@support.com',
        password: 'manager123',
        role: 'manager',
        phone: '+1 (555) 017-8822',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      });
      console.log('✅ Default users seeded successfully: admin@support.com / admin123, agent@support.com / agent123');
    }
  } catch (err) {
    console.error('Error seeding initial users:', err);
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

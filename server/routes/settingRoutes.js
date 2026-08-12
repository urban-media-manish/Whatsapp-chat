import express from 'express';
import { protect } from '../middleware/auth.js';
import { Setting } from '../models/Setting.js';

const router = express.Router();

// @route GET /api/settings
router.get('/', protect, async (req, res) => {
  try {
    const welcomeMessageSetting = await Setting.findOne({ key: 'welcomeMessage' });
    const welcomeMessage = welcomeMessageSetting ? welcomeMessageSetting.value : '👋 Welcome to our Live Support, {name}! An agent will be with you shortly. Feel free to describe your issue or ask any questions.';
    res.json({ welcomeMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/settings
router.post('/', protect, async (req, res) => {
  try {
    const { welcomeMessage } = req.body;
    const welcomeMessageSetting = await Setting.findOneAndUpdate(
      { key: 'welcomeMessage' },
      { value: welcomeMessage || '' },
      { upsert: true, new: true }
    );
    res.json({ message: 'Settings saved successfully', welcomeMessage: welcomeMessageSetting.value });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

const User = require("../models/User");

// Search users by name or email (Admin only)
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const users = await User.find({
      $or: [
        {
          name: {
            $regex: q.trim(),
            $options: "i",
          },
        },
        {
          email: {
            $regex: q.trim(),
            $options: "i",
          },
        },
      ],
    })
      .select("-password")
      .limit(10);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
};
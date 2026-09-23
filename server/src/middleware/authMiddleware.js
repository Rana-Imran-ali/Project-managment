const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET || "dev_secret_jwt_key_fallback";
      const decoded = jwt.verify(token, secret);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({
          message: "User not found or token invalid",
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        message: "Not authorized, token failed",
        error: error.message,
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "Not authorized, no token provided",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: You do not have permission to perform this action",
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};

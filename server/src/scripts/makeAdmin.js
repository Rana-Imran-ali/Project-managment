const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const User = require("../models/User");

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address.");
  console.log("Usage: node src/scripts/makeAdmin.js <email>");
  console.log("Example: node src/scripts/makeAdmin.js admin@example.com");
  process.exit(1);
}

const promoteToAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI or MONGO_URI is not defined in .env");
    }

    await mongoose.connect(mongoUri);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error(`❌ User not found with email: ${normalizedEmail}`);
      console.log("💡 Tip: Make sure the user has already registered on the website first.");
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`ℹ️ User "${user.name}" (${normalizedEmail}) is already an Admin.`);
      process.exit(0);
    }

    user.role = "admin";
    await user.save();

    console.log(`✅ Success! "${user.name}" (${normalizedEmail}) has been promoted to Admin.`);
  } catch (error) {
    console.error("❌ Error promoting user to admin:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

promoteToAdmin();

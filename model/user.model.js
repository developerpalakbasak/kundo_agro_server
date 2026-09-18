import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: ["Admin", "Seller", "Customer"],
        message: "{VALUE} is not a valid role",
      },
      default: "Customer",
      index: true,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Active", "Inactive"],
        message: "{VALUE} is not a valid status",
      },
      default: "Active",
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
      trim: true,
    },
    isVerifiedSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    sellerFor: {
      type: String,
      required: [true, "Seller for is required"],
      enum: ["fish", "animale"],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Compound text index for search queries
userSchema.index({ name: "text", email: "text", phone: "text" });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

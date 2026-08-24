import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [120, "Product name cannot exceed 120 characters"],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: {
        values: ["kg", "gram", "litre", "piece", "dozen", "pack"],
        message: "{VALUE} is not a valid unit",
      },
      default: "kg",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
    },
    compareAtPrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (val == null) return true;
          return val > this.price;
        },
        message: "Old price (compareAtPrice) must be higher than current price",
      },
    },
    thumbnail: {
      type: String,
      required: [true, "Main thumbnail image is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    video: {
      type: String,
      default: null,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound text index for fast search queries
productSchema.index({ name: "text", description: "text", category: "text" });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;


import mongoose, { Schema } from 'mongoose';

const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    thumbnail: {
      type: String,
      required: [true, 'Item thumbnail is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unit: {
      type: String,
      default: 'piece',
      trim: true,
    },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Shipping address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'District / City is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
      default: 'Cash on Delivery',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'failed'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['processing', 'shipped', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'processing',
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative'],
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total cannot be negative'],
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
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

// Compound text index for search across orders
orderSchema.index({
  orderId: 'text',
  customerName: 'text',
  phone: 'text',
  city: 'text',
  address: 'text',
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;

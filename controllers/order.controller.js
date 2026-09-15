import mongoose from 'mongoose';
import Order from '../model/order.model.js';
import Product from '../model/product.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import SSLCommerzPayment from 'sslcommerz-lts';

/**
 * Generate a unique human-friendly Order ID (e.g. ORD-2026-8841)
 */
const generateOrderId = async () => {
    const year = new Date().getFullYear();
    let orderId = '';
    let exists = true;
    while (exists) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        orderId = `ORD-${year}-${randomNum}`;
        exists = await Order.exists({ orderId });
    }
    return orderId;
};

/**
 * Place a new Order (Public / Customer Checkout)
 */
export const createOrder = catchAsync(async (req, res) => {
    const {
        customerName,
        phone,
        address,
        city,
        notes,
        paymentMethod,
        items,
        deliveryFee = 0,
    } = req.body;

    if (!customerName || !customerName.trim()) {
        throw new AppError('Customer full name is required.', 400);
    }
    if (!phone || !phone.trim()) {
        throw new AppError('Contact phone number is required.', 400);
    }
    if (!address || !address.trim()) {
        throw new AppError('Shipping address is required.', 400);
    }
    if (!city || !city.trim()) {
        throw new AppError('District / City is required.', 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Order must contain at least one item.', 400);
    }

    // Validate each item has a valid product identifier
    for (const item of items) {
        const prodId = item.product || item.productId || item._id;
        if (!prodId || !mongoose.Types.ObjectId.isValid(prodId)) {
            throw new AppError('Each item must contain a valid product ID.', 400);
        }
    }

    // Fetch products from database to ensure genuine products and authoritative prices
    const productIds = items.map((item) => item.product || item.productId || item._id);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    // Format & validate each item using DB product data
    const formattedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
        const prodId = (item.product || item.productId || item._id).toString();
        const dbProduct = productMap.get(prodId);

        if (!dbProduct) {
            throw new AppError(`Product not found: ${item.name || prodId}`, 404);
        }

        if (dbProduct.isAvailable === false) {
            throw new AppError(`Product "${dbProduct.name}" is currently unavailable.`, 400);
        }

        const itemQty = Number(item.quantity) || 1;
        if (Number.isNaN(itemQty) || itemQty <= 0) {
            throw new AppError(`Invalid quantity for item: ${dbProduct.name}`, 400);
        }

        // Take price directly from the database record (ignoring any client payload price)
        const itemPrice = Number(dbProduct.price);
        if (Number.isNaN(itemPrice) || itemPrice < 0) {
            throw new AppError(`Invalid price configured for product: ${dbProduct.name}`, 400);
        }

        const lineTotal = itemPrice * itemQty;
        calculatedSubtotal += lineTotal;

        formattedItems.push({
            product: dbProduct._id,
            name: dbProduct.name,
            thumbnail: dbProduct.thumbnail || item.thumbnail || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80',
            price: itemPrice,
            quantity: itemQty,
            unit: dbProduct.unit || item.unit || 'piece',
        });
    }

    const numericDeliveryFee = Number(deliveryFee) || 0;
    const finalTotal = calculatedSubtotal + numericDeliveryFee;
    const orderId = await generateOrderId();

    const order = await Order.create({
        orderId,
        customer: req.user?.id || null,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        notes: notes ? notes.trim() : '',
        paymentMethod: paymentMethod ? paymentMethod.trim() : 'Cash on Delivery',
        paymentStatus: 'pending',
        status: 'processing',
        items: formattedItems,
        subtotal: calculatedSubtotal,
        deliveryFee: numericDeliveryFee,
        total: finalTotal,
        date: new Date().toISOString().split('T')[0],
    });

    res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        order,
    });
});

/**
 * Get orders placed by current authenticated Customer
 */
export const getMyOrders = catchAsync(async (req, res) => {
    const filter = {
        $or: [
            { customer: req.user.id },
            { phone: req.user.phone && req.user.phone.trim() ? req.user.phone : '__none__' }
        ]
    };

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: orders.length,
        orders,
    });
});

/**
 * Get single order details by Order ID or MongoDB _id (Public / Customer tracking)
 */
export const getOrderByIdOrTracking = catchAsync(async (req, res) => {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
    }
    if (!order) {
        order = await Order.findOne({ orderId: id.toUpperCase().trim() });
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    res.status(200).json({
        success: true,
        order,
    });
});

/**
 * Get all Orders (Admin / Seller) with search, filter, and pagination
 */
export const getAllOrdersAdmin = catchAsync(async (req, res) => {
    const { status, paymentStatus, search, page = 1, limit = 50, sort } = req.query;

    const filter = {};
    if (status && status !== 'all') {
        filter.status = status;
    }
    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    } else {
        // By default, exclude orders with failed payments (abandoned attempts)
        filter.paymentStatus = { $ne: 'failed' };
    }
    if (search) {
        filter.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'total_desc') sortOption = { total: -1 };
    else if (sort === 'total_asc') sortOption = { total: 1 };

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: orders.length,
        orders,
    });
});

/**
 * Get single Order details (Admin / Seller)
 */
export const getAdminOrderById = catchAsync(async (req, res) => {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id).populate('customer', 'name email phone role');
    }
    if (!order) {
        order = await Order.findOne({ orderId: id.toUpperCase().trim() }).populate('customer', 'name email phone role');
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    res.status(200).json({
        success: true,
        order,
    });
});

/**
 * Update Order status / payment status (Seller / Admin)
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
    }
    if (!order) {
        order = await Order.findOne({ orderId: id.toUpperCase().trim() });
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    if (status) {
        const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid order status. Allowed: ${validStatuses.join(', ')}`, 400);
        }
        order.status = status;
    }

    if (paymentStatus) {
        const validPaymentStatuses = ['pending', 'paid', 'failed'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            throw new AppError(`Invalid payment status. Allowed: ${validPaymentStatuses.join(', ')}`, 400);
        }
        order.paymentStatus = paymentStatus;
    }

    if (notes !== undefined) {
        order.notes = notes.trim();
    }

    await order.save();

    res.status(200).json({
        success: true,
        message: 'Order status updated successfully.',
        order,
    });
});

/**
 * Delete an Order (Admin only)
 */
export const deleteOrder = catchAsync(async (req, res) => {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findByIdAndDelete(id);
    }
    if (!order) {
        order = await Order.findOneAndDelete({ orderId: id.toUpperCase().trim() });
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Order deleted successfully.',
        deletedId: id,
    });
});

/**
 * SSLCommerz: Initialize Payment Gateway Redirect
 */
export const initSSLCommerzPayment = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: orderId.trim() });
    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    const store_id = process.env.STORE_ID || 'testbox';
    const store_passwd = process.env.STORE_PASSWORD || 'qwerty';
    const is_live = process.env.IS_LIVE === 'true';

    const data = {
        total_amount: order.total,
        currency: 'BDT',
        tran_id: order.orderId,
        success_url: process.env.SSL_SUCCESS_URL || `http://localhost:4000/api/v1/orders/payment/success`,
        fail_url: process.env.SSL_FAIL_URL || `http://localhost:4000/api/v1/orders/payment/fail`,
        cancel_url: process.env.SSL_CANCEL_URL || `http://localhost:4000/api/v1/orders/payment/cancel`,
        ipn_url: process.env.SSL_IPN_URL || `http://localhost:4000/api/v1/orders/payment/ipn`,
        shipping_method: 'Courier',
        product_name: order.items.map(i => i.name).join(', ') || 'Agro Products',
        product_category: 'Agro & Fisheries',
        product_profile: 'general',
        cus_name: order.customerName,
        cus_email: 'customer@kunduagro.com',
        cus_add1: order.address,
        cus_city: order.city,
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: order.phone,
        ship_name: order.customerName,
        ship_add1: order.address,
        ship_city: order.city,
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };

    try {
        const SSLFactory = SSLCommerzPayment.SSLCommerzPayment || SSLCommerzPayment.default || SSLCommerzPayment;
        const sslcz = new SSLFactory(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(data);

        // console.log('SSLCommerz Init API Response:', apiResponse);

        if (apiResponse?.GatewayPageURL) {
            return res.status(200).json({
                success: true,
                gatewayUrl: apiResponse.GatewayPageURL,
            });
        }
        
        return res.status(400).json({
            success: false,
            message: apiResponse?.failedreason || 'SSLCommerz gateway session failed to initialize.',
        });
    } catch (err) {
        console.error('SSLCommerz Initialization Exception:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'SSLCommerz payment service error.',
        });
    }
});

/**
 * SSLCommerz: Success Callback (POST from SSLCommerz server)
 */
export const handleSSLCommerzSuccess = catchAsync(async (req, res) => {
    const { tran_id, val_id, card_issuer } = req.body;

    console.log("start=>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log(req.body)
    console.log("end=>>>>>>>>>>>>>>>>>>>>>>>>>>>")


    const store_id = process.env.STORE_ID || 'testbox';
    const store_passwd = process.env.STORE_PASSWORD || 'qwerty';
    const is_live = process.env.IS_LIVE === 'true';

    const order = await Order.findOne({ orderId: tran_id });
    if (!order) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?payment=failed&reason=ordernotfound`);
    }

    // Validate payment with SSLCommerz
    const SSLFactory = SSLCommerzPayment.SSLCommerzPayment || SSLCommerzPayment.default || SSLCommerzPayment;
    const sslcz = new SSLFactory(store_id, store_passwd, is_live);
    const validationData = { val_id };
    const validationRes = await sslcz.validate(validationData);

    if (validationRes?.status === 'VALID' || validationRes?.status === 'VALIDATED') {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paymentMethod = card_issuer || 'Online Payment';
        await order.save();
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?placed=${order.orderId}&payment=success`);
    } else {
        order.paymentStatus = 'failed';
        await order.save();
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?placed=${order.orderId}&payment=failed`);
    }
});

/**
 * SSLCommerz: Fail Callback
 */
export const handleSSLCommerzFail = catchAsync(async (req, res) => {
    const { tran_id, card_issuer } = req.body;
    if (tran_id) {
        await Order.findOneAndUpdate({ orderId: tran_id }, { paymentStatus: 'failed', paymentMethod: card_issuer || 'Online Payment' });
    }
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?payment=failed`);
});

/**
 * SSLCommerz: Cancel Callback
 */
export const handleSSLCommerzCancel = catchAsync(async (req, res) => {
    const { tran_id, card_issuer } = req.body;
    if (tran_id) {
        await Order.findOneAndUpdate({ orderId: tran_id }, { paymentStatus: 'failed', paymentMethod: card_issuer || 'Online Payment' });
    }
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?payment=cancelled`);
});

/**
 * SSLCommerz: IPN Notification Handler
 */
export const handleSSLCommerzIPN = catchAsync(async (req, res) => {
    const { tran_id, status } = req.body;
    if (tran_id && (status === 'VALID' || status === 'VALIDATED')) {
        await Order.findOneAndUpdate({ orderId: tran_id }, { paymentStatus: 'paid', status: 'processing' });
    }
    res.status(200).send('IPN Received');
});


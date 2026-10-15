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
        senderNumber,
        transactionId,
        bankName,
        depositReference,
        paymentDetails: incomingPaymentDetails,
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
        paymentDetails: {
            senderNumber: senderNumber?.trim() || incomingPaymentDetails?.senderNumber?.trim() || null,
            transactionId: transactionId?.trim() || incomingPaymentDetails?.transactionId?.trim() || null,
            bankName: bankName?.trim() || incomingPaymentDetails?.bankName?.trim() || null,
            depositReference: depositReference?.trim() || incomingPaymentDetails?.depositReference?.trim() || null,
        },
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
 * SSLCommerz: Initialize Payment Gateway Redirect
 */
export const initSSLCommerzPayment = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: orderId.trim() });
    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    if (order.paymentStatus === 'paid') {
        throw new AppError('This order has already been paid.', 400);
    }

    const store_id = process.env.STORE_ID || 'testbox';
    const store_passwd = process.env.STORE_PASSWORD || 'qwerty';
    const is_live = process.env.IS_LIVE === 'true';

    // Base backend server URL fallback
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;

    const data = {
        total_amount: Number(order.total),
        currency: 'BDT',
        tran_id: order.orderId,
        success_url: process.env.SSL_SUCCESS_URL || `${backendBase}/api/v1/orders/payment/success`,
        fail_url: process.env.SSL_FAIL_URL || `${backendBase}/api/v1/orders/payment/fail`,
        cancel_url: process.env.SSL_CANCEL_URL || `${backendBase}/api/v1/orders/payment/cancel`,
        ipn_url: process.env.SSL_IPN_URL || `${backendBase}/api/v1/orders/payment/ipn`,
        shipping_method: 'Courier',
        product_name: order.items.map((i) => i.name).slice(0, 5).join(', ') || 'Agro Products',
        product_category: 'Agro & Fisheries',
        product_profile: 'general',
        cus_name: order.customerName || 'Customer',
        cus_email: (order.customer && order.customer.email) || 'customer@kunduagro.com',
        cus_add1: order.address || 'Bangladesh',
        cus_city: order.city || 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: order.phone || '01700000000',
        ship_name: order.customerName || 'Customer',
        ship_add1: order.address || 'Bangladesh',
        ship_city: order.city || 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };

    try {
        const SSLFactory = SSLCommerzPayment.SSLCommerzPayment || SSLCommerzPayment.default || SSLCommerzPayment;
        const sslcz = new SSLFactory(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(data);

        if (apiResponse?.GatewayPageURL) {
            return res.status(200).json({
                success: true,
                gatewayUrl: apiResponse.GatewayPageURL,
                sessionKey: apiResponse.sessionkey,
            });
        }

        console.error('SSLCommerz Init Failed:', apiResponse);
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
    const { tran_id, val_id, card_issuer, card_brand, card_type, bank_tran_id, tran_date, amount } = req.body;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!tran_id || !val_id) {
        console.error('SSLCommerz callback missing tran_id or val_id:', req.body);
        return res.redirect(`${frontendBase}/orders?payment=failed&reason=invalid_params`);
    }

    const order = await Order.findOne({ orderId: tran_id });
    if (!order) {
        console.error(`SSLCommerz order not found for tran_id: ${tran_id}`);
        return res.redirect(`${frontendBase}/orders?payment=failed&reason=ordernotfound`);
    }

    // Already paid (e.g. verified via IPN first)
    if (order.paymentStatus === 'paid') {
        return res.redirect(`${frontendBase}/orders?placed=${order.orderId}&payment=success`);
    }

    const store_id = process.env.STORE_ID || 'testbox';
    const store_passwd = process.env.STORE_PASSWORD || 'qwerty';
    const is_live = process.env.IS_LIVE === 'true';

    try {
        // Validate payment with SSLCommerz server
        const SSLFactory = SSLCommerzPayment.SSLCommerzPayment || SSLCommerzPayment.default || SSLCommerzPayment;
        const sslcz = new SSLFactory(store_id, store_passwd, is_live);
        const validationRes = await sslcz.validate({ val_id });

        const isValidStatus = validationRes?.status === 'VALID' || validationRes?.status === 'VALIDATED';
        const paidAmount = Number(validationRes?.currency_amount || validationRes?.amount || amount || 0);
        const isAmountMatching = Math.abs(paidAmount - Number(order.total)) < 1.0; // allow fractional rounding tolerance

        if (isValidStatus && isAmountMatching) {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            order.paymentMethod = card_issuer || card_brand || 'Online Payment';
            order.paymentDetails = {
                val_id,
                bank_tran_id: bank_tran_id || validationRes?.bank_tran_id || null,
                card_type: card_type || validationRes?.card_type || null,
                card_brand: card_brand || validationRes?.card_brand || null,
                card_issuer: card_issuer || validationRes?.card_issuer || null,
                tran_date: tran_date || validationRes?.tran_date || new Date().toISOString(),
                amount_paid: paidAmount,
                gateway_status: validationRes?.status,
            };
            await order.save();
            return res.redirect(`${frontendBase}/orders?placed=${order.orderId}&payment=success`);
        } else {
            console.error('SSLCommerz Payment Validation Discrepancy:', {
                status: validationRes?.status,
                paidAmount,
                orderTotal: order.total,
                response: validationRes,
            });
            order.paymentStatus = 'failed';
            order.paymentDetails = {
                val_id,
                gateway_status: validationRes?.status || 'INVALID',
            };
            await order.save();
            return res.redirect(`${frontendBase}/orders?placed=${order.orderId}&payment=failed&reason=validation_mismatch`);
        }
    } catch (validateErr) {
        console.error('SSLCommerz validation error:', validateErr);
        order.paymentStatus = 'failed';
        await order.save();
        return res.redirect(`${frontendBase}/orders?placed=${order.orderId}&payment=failed`);
    }
});

/**
 * SSLCommerz: Fail Callback
 */
export const handleSSLCommerzFail = catchAsync(async (req, res) => {
    const { tran_id, card_issuer, error } = req.body;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (tran_id) {
        await Order.findOneAndUpdate(
            { orderId: tran_id },
            {
                paymentStatus: 'failed',
                paymentMethod: card_issuer || 'Online Payment',
                'paymentDetails.gateway_status': 'FAILED',
            }
        );
        return res.redirect(`${frontendBase}/orders?placed=${tran_id}&payment=failed`);
    }
    return res.redirect(`${frontendBase}/orders?payment=failed`);
});

/**
 * SSLCommerz: Cancel Callback
 */
export const handleSSLCommerzCancel = catchAsync(async (req, res) => {
    const { tran_id, card_issuer } = req.body;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (tran_id) {
        await Order.findOneAndUpdate(
            { orderId: tran_id },
            {
                paymentStatus: 'failed',
                paymentMethod: card_issuer || 'Online Payment',
                'paymentDetails.gateway_status': 'CANCELLED',
            }
        );
        return res.redirect(`${frontendBase}/orders?placed=${tran_id}&payment=cancelled`);
    }
    return res.redirect(`${frontendBase}/orders?payment=cancelled`);
});

/**
 * SSLCommerz: IPN Notification Handler
 */
export const handleSSLCommerzIPN = catchAsync(async (req, res) => {
    const { tran_id, val_id, status } = req.body;

    if (!tran_id || !val_id) {
        return res.status(400).send('Missing tran_id or val_id');
    }

    const store_id = process.env.STORE_ID || 'testbox';
    const store_passwd = process.env.STORE_PASSWORD || 'qwerty';
    const is_live = process.env.IS_LIVE === 'true';

    try {
        const order = await Order.findOne({ orderId: tran_id });
        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.paymentStatus === 'paid') {
            return res.status(200).send('Already Paid');
        }

        const SSLFactory = SSLCommerzPayment.SSLCommerzPayment || SSLCommerzPayment.default || SSLCommerzPayment;
        const sslcz = new SSLFactory(store_id, store_passwd, is_live);
        const validationRes = await sslcz.validate({ val_id });

        if (validationRes?.status === 'VALID' || validationRes?.status === 'VALIDATED') {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            order.paymentDetails = {
                val_id,
                bank_tran_id: validationRes?.bank_tran_id || null,
                card_type: validationRes?.card_type || null,
                card_brand: validationRes?.card_brand || null,
                card_issuer: validationRes?.card_issuer || null,
                tran_date: validationRes?.tran_date || new Date().toISOString(),
                amount_paid: Number(validationRes?.currency_amount || validationRes?.amount || 0),
                gateway_status: validationRes?.status,
            };
            await order.save();
            return res.status(200).send('IPN Validated & Order Updated');
        }

        return res.status(400).send('IPN Validation Failed');
    } catch (error) {
        console.error('IPN processing error:', error);
        return res.status(500).send('IPN Server Error');
    }
});


const mongoose = require("mongoose");

const Payment = require("../Models/Payment");
const Invoice = require("../Models/Invoice");
const Tenancy = require("../Models/Tenancy");
const Apartment = require("../Models/Apartment");
const Property = require("../Models/Property");
const ApiError = require("../Utils/ApiError");

const VALID_STATUSES = Payment.schema.path("status").enumValues;

const PAYMENT_POPULATE = {
    path: "invoice",
    populate: {
        path: "tenancy",
        populate: [
            { path: "tenant", select: "name email" },
            { path: "apartment", select: "apartmentNumber property" },
        ],
    },
};

// Same ownership chain as invoices: tenants reach their own tenancies,
// managers reach tenancies inside properties they manage.
const getAccessibleTenancyIds = async (user) => {
    if (user.role === "tenant") {
        const tenancies = await Tenancy.find({ tenant: user._id }).select("_id");
        return tenancies.map((tenancy) => tenancy._id);
    }

    if (user.role === "manager") {
        const properties = await Property.find({ manager: user._id }).select("_id");
        const apartments = await Apartment.find({
            property: { $in: properties.map((property) => property._id) },
        }).select("_id");
        const tenancies = await Tenancy.find({
            apartment: { $in: apartments.map((apartment) => apartment._id) },
        }).select("_id");
        return tenancies.map((tenancy) => tenancy._id);
    }

    return [];
};

const getAccessibleInvoiceIds = async (user) => {
    const tenancyIds = await getAccessibleTenancyIds(user);
    const invoices = await Invoice.find({ tenancy: { $in: tenancyIds } }).select("_id");
    return invoices.map((invoice) => invoice._id);
};

// Recomputes an invoice's status from the sum of its successful payments.
const recalculateInvoiceStatus = async (invoiceId) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    const result = await Payment.aggregate([
        { $match: { invoice: invoice._id, status: "SUCCESSFUL" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPaid = result[0]?.total || 0;

    let status;
    if (totalPaid >= invoice.amount) {
        status = "PAID";
    } else if (totalPaid > 0) {
        status = "PARTIALLY_PAID";
    } else {
        status = invoice.dueDate < new Date() ? "OVERDUE" : "UNPAID";
    }

    if (status !== invoice.status) {
        invoice.status = status;
        await invoice.save();
    }
};

const createPayment = async (req, res, next) => {
    try {
        const { invoice, amount, reference } = req.body;

        if (!invoice || !mongoose.isValidObjectId(invoice)) {
            throw ApiError.badRequest("A valid invoice id is required");
        }

        if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
            throw ApiError.badRequest("Amount must be a positive number");
        }

        const invoiceDoc = await Invoice.findById(invoice).populate({
            path: "tenancy",
            populate: { path: "apartment" },
        });
        if (!invoiceDoc) {
            throw ApiError.notFound("Invoice not found");
        }

        const accessibleTenancyIds = await getAccessibleTenancyIds(req.user);
        const hasAccess = accessibleTenancyIds.some((id) => id.equals(invoiceDoc.tenancy._id));
        if (!hasAccess) {
            throw ApiError.forbidden("You do not have permission to pay this invoice");
        }

        const result = await Payment.aggregate([
            { $match: { invoice: invoiceDoc._id, status: "SUCCESSFUL" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const alreadyPaid = result[0]?.total || 0;
        const balance = invoiceDoc.amount - alreadyPaid;

        if (amount > balance) {
            throw ApiError.badRequest(
                `Payment exceeds invoice balance. Outstanding balance is ${balance}`
            );
        }

        const payment = await Payment.create({
            invoice,
            amount,
            reference,
            status: "SUCCESSFUL",
        });

        await recalculateInvoiceStatus(invoice);

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
};

const getPayments = async (req, res, next) => {
    try {
        let invoiceIds = (await getAccessibleInvoiceIds(req.user)).map((id) => id.toString());

        if (req.query.invoice) {
            if (!mongoose.isValidObjectId(req.query.invoice)) {
                throw ApiError.badRequest("Invalid invoice id");
            }
            if (!invoiceIds.includes(req.query.invoice)) {
                throw ApiError.forbidden("You do not have access to this invoice");
            }
            invoiceIds = [req.query.invoice];
        }

        const filter = { invoice: { $in: invoiceIds } };

        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                throw ApiError.badRequest(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
            }
            filter.status = req.query.status;
        }

        const payments = await Payment.find(filter)
            .populate(PAYMENT_POPULATE)
            .sort("-createdAt");

        res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw ApiError.badRequest("Invalid payment id");
        }

        const payment = await Payment.findById(req.params.id).populate(PAYMENT_POPULATE);
        if (!payment) {
            throw ApiError.notFound("Payment not found");
        }

        const accessibleTenancyIds = await getAccessibleTenancyIds(req.user);
        const hasAccess = accessibleTenancyIds.some((id) =>
            id.equals(payment.invoice.tenancy._id)
        );
        if (!hasAccess) {
            throw ApiError.forbidden("You do not have permission to view this payment");
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
};

module.exports = { createPayment, getPayments, getPaymentById };

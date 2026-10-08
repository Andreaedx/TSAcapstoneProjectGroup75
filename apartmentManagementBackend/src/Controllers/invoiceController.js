const mongoose = require("mongoose");

const Invoice = require("../Models/Invoice");
const Tenancy = require("../Models/Tenancy");
const Apartment = require("../Models/Apartment");
const Property = require("../Models/Property");
const ApiError = require("../Utils/ApiError");

const VALID_STATUSES = Invoice.schema.path("status").enumValues;

const INVOICE_POPULATE = {
    path: "tenancy",
    populate: [
        { path: "tenant", select: "name email" },
        { path: "apartment", select: "apartmentNumber property" },
    ],
};

// Tenants can only reach invoices tied to their own tenancies.
// Managers can only reach invoices for tenancies inside properties they manage.
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

// Any unpaid/partially paid invoice whose due date has passed is stale-flipped to OVERDUE.
const markOverdueInvoices = async () => {
    await Invoice.updateMany(
        {
            status: { $in: ["UNPAID", "PARTIALLY_PAID"] },
            dueDate: { $lt: new Date() },
        },
        { $set: { status: "OVERDUE" } }
    );
};

const createInvoice = async (req, res, next) => {
    try {
        const { tenancy, amount, dueDate } = req.body;

        if (!tenancy || !mongoose.isValidObjectId(tenancy)) {
            throw ApiError.badRequest("A valid tenancy id is required");
        }

        if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
            throw ApiError.badRequest("Amount must be a positive number");
        }

        if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
            throw ApiError.badRequest("A valid due date is required");
        }

        const tenancyDoc = await Tenancy.findById(tenancy).populate("apartment");
        if (!tenancyDoc) {
            throw ApiError.notFound("Tenancy not found");
        }

        // Ended tenancies can still get a final invoice; cancelled ones never started
        if (tenancyDoc.status === "CANCELLED") {
            throw ApiError.badRequest("Cannot create an invoice for a cancelled tenancy");
        }

        const property = await Property.findById(tenancyDoc.apartment.property);
        if (!property) {
            throw ApiError.notFound("Property not found for this tenancy");
        }

        if (req.user.role === "manager" && !property.manager.equals(req.user._id)) {
            throw ApiError.forbidden("You can only create invoices for your own properties");
        }

        const parsedDueDate = new Date(dueDate);
        const status = parsedDueDate < new Date() ? "OVERDUE" : "UNPAID";

        const invoice = await Invoice.create({
            tenancy,
            amount,
            dueDate: parsedDueDate,
            status,
        });

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        next(error);
    }
};

const getInvoices = async (req, res, next) => {
    try {
        await markOverdueInvoices();

        let tenancyIds = (await getAccessibleTenancyIds(req.user)).map((id) => id.toString());

        if (req.query.tenancy) {
            if (!mongoose.isValidObjectId(req.query.tenancy)) {
                throw ApiError.badRequest("Invalid tenancy id");
            }
            if (!tenancyIds.includes(req.query.tenancy)) {
                throw ApiError.forbidden("You do not have access to this tenancy");
            }
            tenancyIds = [req.query.tenancy];
        }

        if (req.query.tenant) {
            if (!mongoose.isValidObjectId(req.query.tenant)) {
                throw ApiError.badRequest("Invalid tenant id");
            }
            const matchingTenancies = await Tenancy.find({
                tenant: req.query.tenant,
                _id: { $in: tenancyIds },
            }).select("_id");
            tenancyIds = matchingTenancies.map((tenancy) => tenancy._id.toString());
        }

        const filter = { tenancy: { $in: tenancyIds } };

        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                throw ApiError.badRequest(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
            }
            filter.status = req.query.status;
        }

        const invoices = await Invoice.find(filter)
            .populate(INVOICE_POPULATE)
            .sort("-createdAt");

        res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        next(error);
    }
};

const getInvoiceById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw ApiError.badRequest("Invalid invoice id");
        }

        await markOverdueInvoices();

        const invoice = await Invoice.findById(req.params.id).populate(INVOICE_POPULATE);
        if (!invoice) {
            throw ApiError.notFound("Invoice not found");
        }

        const accessibleTenancyIds = await getAccessibleTenancyIds(req.user);
        const hasAccess = accessibleTenancyIds.some((id) => id.equals(invoice.tenancy._id));
        if (!hasAccess) {
            throw ApiError.forbidden("You do not have permission to view this invoice");
        }

        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        next(error);
    }
};

module.exports = { createInvoice, getInvoices, getInvoiceById };
const mongoose = require("mongoose");

const Maintenance = require("../Models/MaintenanceRequest");
const Tenancy = require("../Models/Tenancy");
const Apartment = require("../Models/Apartment");
const Property = require("../Models/Property");
const ApiError = require("../Utils/ApiError");

// Pulled straight from the schema - single source of truth
const VALID_STATUSES = Maintenance.schema.path("status").enumValues;     // OPEN / IN_PROGRESS / RESOLVED
const VALID_PRIORITIES = Maintenance.schema.path("priority").enumValues; // LOW / MEDIUM / HIGH / URGENT

// Controlled status lifecycle - no arbitrary jumps
const ALLOWED_TRANSITIONS = {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
    RESOLVED: [],
};

// Tenant currently occupying this apartment = has an ACTIVE tenancy on it
const isOccupiedBy = async (tenantId, apartmentId) => {
    const tenancy = await Tenancy.findOne({
        tenant: tenantId,
        apartment: apartmentId,
        status: "ACTIVE",
    });
    return Boolean(tenancy);
};

// Apartment IDs inside properties this manager manages (same pattern as invoiceController)
const getManagerApartmentIds = async (managerId) => {
    const properties = await Property.find({ manager: managerId }).select("_id");
    const apartments = await Apartment.find({
        property: { $in: properties.map((property) => property._id) },
    }).select("_id");
    return apartments.map((apartment) => apartment._id.toString());
};

// @desc   Create a maintenance request (tenant must occupy the apartment)
// @route  POST /api/maintenance
// @access Tenant
const createMaintenanceRequest = async (req, res, next) => {
    try {
        const { apartment, title, description, priority } = req.body;

        if (!apartment || !mongoose.isValidObjectId(apartment)) {
            throw ApiError.badRequest("A valid apartment id is required");
        }
        if (!title || !description) {
            throw ApiError.badRequest("Title and description are required");
        }
        if (priority && !VALID_PRIORITIES.includes(priority)) {
            throw ApiError.badRequest(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
        }

        const apartmentDoc = await Apartment.findById(apartment);
        if (!apartmentDoc) {
            throw ApiError.notFound("Apartment not found");
        }

        const occupies = await isOccupiedBy(req.user._id, apartment);
        if (!occupies) {
            throw ApiError.forbidden("You can only raise requests for an apartment you occupy");
        }

        const request = await Maintenance.create({
            tenant: req.user._id,
            apartment,
            title,
            description,
            priority: priority || "MEDIUM",
        });

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

// @desc   Get all maintenance requests (tenant: own | manager: their properties | admin: all)
// @route  GET /api/maintenance?status=&priority=
// @access Tenant, Manager, admin
const getMaintenanceRequests = async (req, res, next) => {
    try {
        const filter = {};

        if (req.user.role === "Tenant") {
            filter.tenant = req.user._id;
        } else if (req.user.role === "Manager") {
            const apartmentIds = await getManagerApartmentIds(req.user._id);
            filter.apartment = { $in: apartmentIds };
        }

        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                throw ApiError.badRequest(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
            }
            filter.status = req.query.status;
        }

        if (req.query.priority) {
            if (!VALID_PRIORITIES.includes(req.query.priority)) {
                throw ApiError.badRequest(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
            }
            filter.priority = req.query.priority;
        }

        const requests = await Maintenance.find(filter)
            .populate("apartment", "apartmentNumber type status")
            .sort("-createdAt");

        res.json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        next(error);
    }
};

// @desc   Get one maintenance request (with ownership check)
// @route  GET /api/maintenance/:id
// @access Tenant, Manager, admin
const getMaintenanceRequestById = async (req, res, next) => {
    try {
        const request = await Maintenance.findById(req.params.id).populate(
            "apartment",
            "apartmentNumber type status property"
        );
        if (!request) {
            throw ApiError.notFound("Maintenance request not found");
        }

        if (req.user.role === "Tenant" && !request.tenant.equals(req.user._id)) {
            throw ApiError.forbidden("You can only view your own requests");
        }

        if (req.user.role === "Manager") {
            const apartmentIds = await getManagerApartmentIds(req.user._id);
            if (!apartmentIds.includes(request.apartment._id.toString())) {
                throw ApiError.forbidden("You can only view requests for your own properties");
            }
        }

        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

// @desc   Update title/description/priority (owner tenant while OPEN, or managing manager)
// @route  PATCH /api/maintenance/:id
// @access Tenant, Manager
const updateMaintenanceRequest = async (req, res, next) => {
    try {
        const request = await Maintenance.findById(req.params.id);
        if (!request) {
            throw ApiError.notFound("Maintenance request not found");
        }

        const isOwner = request.tenant.equals(req.user._id);

        if (req.user.role === "Tenant" && !isOwner) {
            throw ApiError.forbidden("You can only update your own requests");
        }
        if (req.user.role === "Tenant" && request.status !== "OPEN") {
            throw ApiError.badRequest("A request that is no longer OPEN can no longer be edited");
        }
        if (req.user.role === "Manager") {
            const apartmentIds = await getManagerApartmentIds(req.user._id);
            if (!apartmentIds.includes(request.apartment.toString())) {
                throw ApiError.forbidden("You can only update requests for your own properties");
            }
        }

        const { title, description, priority } = req.body;
        if (priority && !VALID_PRIORITIES.includes(priority)) {
            throw ApiError.badRequest(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
        }

        if (title) request.title = title;
        if (description) request.description = description;
        if (priority) request.priority = priority;

        await request.save();
        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

// @desc   Move a request through its status lifecycle (controlled transitions)
// @route  PATCH /api/maintenance/:id/status
// @access Manager
const updateMaintenanceStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status || !VALID_STATUSES.includes(status)) {
            throw ApiError.badRequest(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
        }

        const request = await Maintenance.findById(req.params.id);
        if (!request) {
            throw ApiError.notFound("Maintenance request not found");
        }

        const apartmentIds = await getManagerApartmentIds(req.user._id);
        if (!apartmentIds.includes(request.apartment.toString())) {
            throw ApiError.forbidden("You can only update requests for your own properties");
        }

        if (!ALLOWED_TRANSITIONS[request.status].includes(status)) {
            throw ApiError.badRequest(
                `Cannot move a request from ${request.status} to ${status}. Allowed next state(s): ${ALLOWED_TRANSITIONS[request.status].join(", ") || "none"}`
            );
        }

        request.status = status;
        await request.save();

        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    updateMaintenanceRequest,
    updateMaintenanceStatus,
};

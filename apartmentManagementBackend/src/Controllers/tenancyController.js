const mongoose = require('mongoose');
const Tenancy = require('../Models/Tenancy');
const User = require('../Models/User');
const Apartment = require('../Models/Apartment');
const Property = require('../Models/Property');
const {
  findOverlappingActiveTenancy,
  isValidDate,
  canAccessTenancy,
  scopeFilterForUser,
} = require('../Utils/tenancyHelpers');

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'ENDED', 'CANCELLED'];

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function parseDate(value) {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

async function createTenancy(req, res) {
  try {
    const { tenant: tenantId, apartment: apartmentId, startDate, endDate, rentAmount } = req.body || {};

    if (!tenantId || !apartmentId || !startDate || !endDate) {
      return res.status(400).json({ message: 'tenant, apartment, startDate, and endDate are required.' });
    }
    if (!isValidObjectId(tenantId) || !isValidObjectId(apartmentId)) {
      return res.status(400).json({ message: 'tenant and apartment must be valid IDs.' });
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found.' });
    }
    if (tenant.role !== 'tenant') {
      return res.status(400).json({ message: 'Specified user is not a Tenant.' });
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found.' });
    }

    if (req.user.role === 'manager') {
      const property = await Property.findById(apartment.property);
      if (!property || !property.manager.equals(req.user._id)) {
        return res.status(403).json({
          message: 'You can only create tenancies for apartments in properties you manage.',
        });
      }
    }

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: 'startDate and endDate must be valid dates.' });
    }
    if (parsedEnd <= parsedStart) {
      return res.status(400).json({ message: 'endDate must be after startDate.' });
    }

    const resolvedRentAmount = rentAmount === undefined ? apartment.rentAmount : rentAmount;
    if (typeof resolvedRentAmount !== 'number' || !Number.isFinite(resolvedRentAmount) || resolvedRentAmount < 0) {
      return res.status(400).json({ message: 'rentAmount must be a non-negative number.' });
    }

    const conflict = await findOverlappingActiveTenancy(apartmentId, parsedStart, parsedEnd);
    if (conflict) {
      return res.status(409).json({
        message: 'This apartment already has an active tenancy that conflicts with the given dates.',
        conflictingTenancyId: conflict._id,
      });
    }

    const tenancy = await Tenancy.create({
      tenant: tenantId,
      apartment: apartmentId,
      startDate: parsedStart,
      endDate: parsedEnd,
      rentAmount: resolvedRentAmount,
      status: 'ACTIVE',
    });

    apartment.status = 'OCCUPIED';
    await apartment.save();

    return res.status(201).json(tenancy);
  } catch (error) {
    console.error('createTenancy error:', error);
    return res.status(500).json({ message: 'Failed to create tenancy.' });
  }
}

async function getAllTenancies(req, res) {
  try {
    const { tenant: tenantFilter, apartment: apartmentFilter, status } = req.query;
    const filter = await scopeFilterForUser(req.user);

    if (tenantFilter) {
      if (!isValidObjectId(tenantFilter)) {
        return res.status(400).json({ message: 'Invalid tenant filter.' });
      }
      if (req.user.role === 'tenant' && tenantFilter !== String(req.user._id)) {
        return res.status(403).json({ message: 'You can only view your own tenancies.' });
      }
      filter.tenant = tenantFilter;
    }

    if (apartmentFilter) {
      if (!isValidObjectId(apartmentFilter)) {
        return res.status(400).json({ message: 'Invalid apartment filter.' });
      }
      filter.apartment = apartmentFilter;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
      }
      filter.status = status;
    }

    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);
    const [tenancies, total] = await Promise.all([
      Tenancy.find(filter)
        .populate('tenant', 'name email')
        .populate('apartment', 'apartmentNumber type rentAmount property')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Tenancy.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: tenancies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('getAllTenancies error:', error);
    return res.status(500).json({ message: 'Failed to fetch tenancies.' });
  }
}

async function getTenancyById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid tenancy ID.' });
    }

    const tenancy = await Tenancy.findById(id)
      .populate('tenant', 'name email')
      .populate('apartment', 'apartmentNumber type rentAmount property');

    if (!tenancy) {
      return res.status(404).json({ message: 'Tenancy not found.' });
    }
    if (!(await canAccessTenancy(req.user, tenancy))) {
      return res.status(403).json({ message: 'You do not have access to this tenancy.' });
    }

    return res.status(200).json(tenancy);
  } catch (error) {
    console.error('getTenancyById error:', error);
    return res.status(500).json({ message: 'Failed to fetch tenancy.' });
  }
}

async function updateTenancy(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid tenancy ID.' });
    }

    const body = req.body || {};
    const allowedFields = ['startDate', 'endDate', 'rentAmount'];
    const unsupportedField = Object.keys(body).find((field) => !allowedFields.includes(field));
    if (unsupportedField) {
      return res.status(400).json({ message: `Field "${unsupportedField}" is not updatable.` });
    }

    const tenancy = await Tenancy.findById(id);
    if (!tenancy) {
      return res.status(404).json({ message: 'Tenancy not found.' });
    }

    if (!(await canAccessTenancy(req.user, tenancy))) {
      return res.status(403).json({ message: 'You can only update tenancies for your own properties.' });
    }

    let newStart = tenancy.startDate;
    let newEnd = tenancy.endDate;
    if (body.startDate !== undefined) {
      newStart = parseDate(body.startDate);
      if (!newStart) {
        return res.status(400).json({ message: 'startDate is invalid.' });
      }
    }
    if (body.endDate !== undefined) {
      newEnd = parseDate(body.endDate);
      if (!newEnd) {
        return res.status(400).json({ message: 'endDate is invalid.' });
      }
    }
    if (newEnd <= newStart) {
      return res.status(400).json({ message: 'endDate must be after startDate.' });
    }

    if ((body.startDate !== undefined || body.endDate !== undefined) && tenancy.status === 'ACTIVE') {
      const conflict = await findOverlappingActiveTenancy(
        tenancy.apartment,
        newStart,
        newEnd,
        tenancy._id
      );
      if (conflict) {
        return res.status(409).json({
          message: 'Updated dates conflict with another active tenancy for this apartment.',
          conflictingTenancyId: conflict._id,
        });
      }
    }

    if (body.rentAmount !== undefined) {
      if (typeof body.rentAmount !== 'number' || !Number.isFinite(body.rentAmount) || body.rentAmount < 0) {
        return res.status(400).json({ message: 'rentAmount must be a non-negative number.' });
      }
      tenancy.rentAmount = body.rentAmount;
    }

    tenancy.startDate = newStart;
    tenancy.endDate = newEnd;
    await tenancy.save();
    return res.status(200).json(tenancy);
  } catch (error) {
    console.error('updateTenancy error:', error);
    return res.status(500).json({ message: 'Failed to update tenancy.' });
  }
}

async function endTenancy(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid tenancy ID.' });
    }

    const tenancy = await Tenancy.findById(id);
    if (!tenancy) {
      return res.status(404).json({ message: 'Tenancy not found.' });
    }
    if (!(await canAccessTenancy(req.user, tenancy))) {
      return res.status(403).json({ message: 'You can only end tenancies for your own properties.' });
    }
    if (tenancy.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only active tenancies can be ended.' });
    }

    const endDate = req.body?.endDate ? parseDate(req.body.endDate) : new Date();
    if (!endDate) {
      return res.status(400).json({ message: 'endDate is invalid.' });
    }
    if (endDate <= tenancy.startDate) {
      return res.status(400).json({ message: 'endDate must be after the tenancy startDate.' });
    }

    tenancy.endDate = endDate;
    tenancy.status = 'ENDED';
    await tenancy.save();

    // Free the apartment once it has no other active tenancy
    const stillOccupied = await Tenancy.exists({ apartment: tenancy.apartment, status: 'ACTIVE' });
    if (!stillOccupied) {
      await Apartment.findByIdAndUpdate(tenancy.apartment, { status: 'VACANT' });
    }

    return res.status(200).json(tenancy);
  } catch (error) {
    console.error('endTenancy error:', error);
    return res.status(500).json({ message: 'Failed to end tenancy.' });
  }
}

async function getCurrentApartmentTenancy(req, res) {
  try {
    const { apartmentId } = req.params;
    if (!isValidObjectId(apartmentId)) {
      return res.status(400).json({ message: 'Invalid apartment ID.' });
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found.' });
    }

    const tenancy = await Tenancy.findOne({ apartment: apartmentId, status: 'ACTIVE' })
      .populate('tenant', 'name email')
      .populate('apartment', 'apartmentNumber type rentAmount property');

    if (!tenancy) {
      return res.status(404).json({ message: 'No active tenancy for this apartment.' });
    }
    if (!(await canAccessTenancy(req.user, tenancy))) {
      return res.status(403).json({ message: 'You do not have access to this tenancy.' });
    }

    return res.status(200).json(tenancy);
  } catch (error) {
    console.error('getCurrentApartmentTenancy error:', error);
    return res.status(500).json({ message: 'Failed to fetch current tenancy.' });
  }
}

module.exports = {
  createTenancy,
  getAllTenancies,
  getTenancyById,
  updateTenancy,
  endTenancy,
  getCurrentApartmentTenancy,
};

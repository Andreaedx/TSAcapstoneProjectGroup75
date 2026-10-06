const Tenancy = require('../Models/Tenancy');
const Apartment = require('../Models/Apartment');
const Property = require('../Models/Property');

async function findOverlappingActiveTenancy(apartmentId, startDate, endDate, excludeTenancyId) {
  const query = {
    apartment: apartmentId,
    status: 'ACTIVE',
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeTenancyId) {
    query._id = { $ne: excludeTenancyId };
  }

  return Tenancy.findOne(query);
}

function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

// Apartment ids belonging to properties this manager actually manages.
async function getManagerApartmentIds(managerId) {
  const properties = await Property.find({ manager: managerId }).select('_id');
  const apartments = await Apartment.find({
    property: { $in: properties.map((property) => property._id) },
  }).select('_id');
  return apartments.map((apartment) => apartment._id.toString());
}

async function canAccessTenancy(user, tenancy) {
  if (!user || !tenancy) return false;

  if (user.role === 'tenant') {
    const tenancyTenantId = tenancy.tenant?._id ?? tenancy.tenant;
    return String(tenancyTenantId) === String(user._id);
  }

  if (user.role === 'manager') {
    const apartmentId = tenancy.apartment?._id ?? tenancy.apartment;
    const managerApartmentIds = await getManagerApartmentIds(user._id);
    return managerApartmentIds.includes(String(apartmentId));
  }

  return false;
}

async function scopeFilterForUser(user) {
  if (!user) return { _id: null };

  if (user.role === 'tenant') return { tenant: user._id };

  if (user.role === 'manager') {
    const apartmentIds = await getManagerApartmentIds(user._id);
    return { apartment: { $in: apartmentIds } };
  }

  return { _id: null };
}

module.exports = {
  findOverlappingActiveTenancy,
  isValidDate,
  canAccessTenancy,
  scopeFilterForUser,
  getManagerApartmentIds,
};
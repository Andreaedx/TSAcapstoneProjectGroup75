const Tenancy = require('../Models/Tenancy');

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

function canAccessTenancy(user, tenancy) {
  if (!user || !tenancy) return false;
  if (user.role === 'Manager') return true;
  if (user.role !== 'Tenant') return false;

  const tenancyTenantId = tenancy.tenant?._id ?? tenancy.tenant;
  return String(tenancyTenantId) === String(user._id);
}

function scopeFilterForUser(user) {
  if (!user) return { _id: null };
  if (user.role === 'Manager') return {};
  if (user.role === 'Tenant') return { tenant: user._id };

  return { _id: null };
}

module.exports = {
  findOverlappingActiveTenancy,
  isValidDate,
  canAccessTenancy,
  scopeFilterForUser,
};
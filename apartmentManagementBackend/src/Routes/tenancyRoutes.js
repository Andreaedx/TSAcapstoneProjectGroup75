const express = require('express');
const router = express.Router();

const {
  createTenancy,
  getAllTenancies,
  getTenancyById,
  updateTenancy,
  endTenancy,
  getCurrentApartmentTenancy,
} = require('../Controllers/tenancyController');

const { protect } = require('../Middleware/authMiddleware');
const { authorized } = require('../Middleware/roleMiddleware');

router.use(protect);

// Filtering by ?tenant= and ?apartment= is handled inside getAllTenancies,
// so both "filter by tenant" and "filter by apartment" requirements are
// covered by this single route.
router.get('/', authorized('Manager', 'Tenant'), getAllTenancies);

router.get(
  '/apartment/:apartmentId/current',
  authorized('Manager', 'Tenant'),
  getCurrentApartmentTenancy
);

router.get('/:id', authorized('Manager', 'Tenant'), getTenancyById);

router.post('/', authorized('Manager'), createTenancy);

router.patch('/:id', authorized('Manager'), updateTenancy);

router.patch('/:id/end', authorized('Manager'), endTenancy);

module.exports = router;
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
router.get('/', authorized('manager', 'tenant'), getAllTenancies);

router.get(
  '/apartment/:apartmentId/current',
  authorized('manager', 'tenant'),
  getCurrentApartmentTenancy
);

router.get('/:id', authorized('manager', 'tenant'), getTenancyById);

router.post('/', authorized('manager'), createTenancy);

router.patch('/:id', authorized('manager'), updateTenancy);

router.patch('/:id/end', authorized('manager'), endTenancy);

module.exports = router;
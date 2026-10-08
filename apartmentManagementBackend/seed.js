const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

// ===============================
// IMPORT MODELS
// ===============================
const User = require("./src/Models/User");
const Property = require("./src/Models/Property");
const Apartment = require("./src/Models/Apartment");
const Tenancy = require("./src/Models/Tenancy");
const Invoice = require("./src/Models/Invoice");
const Payment = require("./src/Models/Payment");
const Maintenance = require("./Models/MaintenanceRequest");

// ===============================
// DATABASE CONNECTION
// ===============================
const MONGODB_URI = process.env.MONGODB_URI;

// ===============================
// FIXED OBJECT IDS
// ===============================
// Using fixed IDs makes it easy for us to
// connect related documents together.

const ids = {
  // Users
  admin: new mongoose.Types.ObjectId("650000000000000000000001"),

  manager1: new mongoose.Types.ObjectId("650000000000000000000002"),
  manager2: new mongoose.Types.ObjectId("650000000000000000000003"),

  tenant1: new mongoose.Types.ObjectId("650000000000000000000004"),
  tenant2: new mongoose.Types.ObjectId("650000000000000000000005"),
  tenant3: new mongoose.Types.ObjectId("650000000000000000000006"),

  // Properties
  property1: new mongoose.Types.ObjectId("650000000000000000000101"),
  property2: new mongoose.Types.ObjectId("650000000000000000000102"),
  property3: new mongoose.Types.ObjectId("650000000000000000000103"),

  // Apartments
  apartment1: new mongoose.Types.ObjectId("650000000000000000000201"),
  apartment2: new mongoose.Types.ObjectId("650000000000000000000202"),
  apartment3: new mongoose.Types.ObjectId("650000000000000000000203"),
  apartment4: new mongoose.Types.ObjectId("650000000000000000000204"),
  apartment5: new mongoose.Types.ObjectId("650000000000000000000205"),
  apartment6: new mongoose.Types.ObjectId("650000000000000000000206"),

  // Tenancies
  tenancy1: new mongoose.Types.ObjectId("650000000000000000000301"),
  tenancy2: new mongoose.Types.ObjectId("650000000000000000000302"),

  // Invoices
  invoice1: new mongoose.Types.ObjectId("650000000000000000000401"),
  invoice2: new mongoose.Types.ObjectId("650000000000000000000402"),
  invoice3: new mongoose.Types.ObjectId("650000000000000000000403"),

  // Payments
  payment1: new mongoose.Types.ObjectId("650000000000000000000501"),
  payment2: new mongoose.Types.ObjectId("650000000000000000000502"),

  // Maintenance
  maintenance1: new mongoose.Types.ObjectId("650000000000000000000601"),
  maintenance2: new mongoose.Types.ObjectId("650000000000000000000602"),
};

// ===============================
// SEED FUNCTION
// ===============================
const seedDatabase = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in your .env file."
      );
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected successfully.");

    // ==========================================
    // DELETE ONLY OUR SEEDED DATA
    // ==========================================
    // This does NOT delete your entire database.
    // It only removes documents using the IDs below.

    await Promise.all([
      User.deleteMany({
        _id: {
          $in: [
            ids.admin,
            ids.manager1,
            ids.manager2,
            ids.tenant1,
            ids.tenant2,
            ids.tenant3,
          ],
        },
      }),

      Property.deleteMany({
        _id: {
          $in: [
            ids.property1,
            ids.property2,
            ids.property3,
          ],
        },
      }),

      Apartment.deleteMany({
        _id: {
          $in: [
            ids.apartment1,
            ids.apartment2,
            ids.apartment3,
            ids.apartment4,
            ids.apartment5,
            ids.apartment6,
          ],
        },
      }),

      Tenancy.deleteMany({
        _id: {
          $in: [
            ids.tenancy1,
            ids.tenancy2,
          ],
        },
      }),

      Invoice.deleteMany({
        _id: {
          $in: [
            ids.invoice1,
            ids.invoice2,
            ids.invoice3,
          ],
        },
      }),

      Payment.deleteMany({
        _id: {
          $in: [
            ids.payment1,
            ids.payment2,
          ],
        },
      }),

      Maintenance.deleteMany({
        _id: {
          $in: [
            ids.maintenance1,
            ids.maintenance2,
          ],
        },
      }),
    ]);

    console.log("Previous seed data removed.");

    // ==========================================
    // 1. USERS
    // ==========================================

    const password = await bcrypt.hash("Password123!", 12);

    const users = await User.insertMany([
      {
        _id: ids.admin,
        name: "Michael Okafor",
        email: "admin@rentahome.test",
        password,
        role: "admin",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },

      {
        _id: ids.manager1,
        name: "Daniel Williams",
        email: "manager1@rentahome.test",
        password,
        role: "manager",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },

      {
        _id: ids.manager2,
        name: "Grace Johnson",
        email: "manager2@rentahome.test",
        password,
        role: "manager",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },

      {
        _id: ids.tenant1,
        name: "David Eze",
        email: "tenant1@rentahome.test",
        password,
        role: "tenant",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },

      {
        _id: ids.tenant2,
        name: "Sarah Williams",
        email: "tenant2@rentahome.test",
        password,
        role: "tenant",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },

      {
        _id: ids.tenant3,
        name: "Emeka Nwosu",
        email: "tenant3@rentahome.test",
        password,
        role: "tenant",

        profilePicture: {
          url: null,
          publicId: null,
        },

        isEmailVerified: true,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    ]);

    console.log(`Users created: ${users.length}`);

    // ==========================================
    // 2. PROPERTIES
    // ==========================================

    const properties = await Property.insertMany([
      {
        _id: ids.property1,
        name: "Garden View Residences",
        address: "15 Peter Odili Road",
        city: "Port Harcourt",

        description:
          "A modern residential property located in a quiet and secure neighborhood. The property features spacious apartments, reliable water supply, parking facilities and good road access.",

        manager: ids.manager1,

        images: [
          {
            url: "https://placehold.co/1200x800?text=Garden+View+Residences",
            publicId: "seed-garden-view",
          },
        ],
      },

      {
        _id: ids.property2,
        name: "Riverside Court",
        address: "28 Stadium Road",
        city: "Port Harcourt",

        description:
          "A comfortable residential complex close to major roads and commercial areas. Riverside Court offers well-maintained apartments suitable for families and professionals.",

        manager: ids.manager1,

        images: [
          {
            url: "https://placehold.co/1200x800?text=Riverside+Court",
            publicId: "seed-riverside-court",
          },
        ],
      },

      {
        _id: ids.property3,
        name: "Palm Heights Apartments",
        address: "10 Ada George Road",
        city: "Port Harcourt",

        description:
          "Contemporary apartments in a peaceful residential environment with spacious rooms, parking and convenient access to schools, offices and shopping areas.",

        manager: ids.manager2,

        images: [
          {
            url: "https://placehold.co/1200x800?text=Palm+Heights+Apartments",
            publicId: "seed-palm-heights",
          },
        ],
      },
    ]);

    console.log(`Properties created: ${properties.length}`);

    // ==========================================
    // 3. APARTMENTS
    // ==========================================

    const apartments = await Apartment.insertMany([
      // Property 1
      {
        _id: ids.apartment1,
        property: ids.property1,
        apartmentNumber: "A101",
        type: "2-BEDROOM",
        rentAmount: 1800000,
        status: "VACANT",

        description:
          "Spacious two-bedroom apartment with a fitted kitchen, living room, two bathrooms and dedicated parking space.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+A101",
            publicId: "seed-apartment-a101",
          },
        ],
      },

      {
        _id: ids.apartment2,
        property: ids.property1,
        apartmentNumber: "A102",
        type: "3-BEDROOM",
        rentAmount: 2400000,
        status: "OCCUPIED",

        description:
          "Large three-bedroom family apartment with spacious living areas and modern fittings.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+A102",
            publicId: "seed-apartment-a102",
          },
        ],
      },

      // Property 2
      {
        _id: ids.apartment3,
        property: ids.property2,
        apartmentNumber: "B201",
        type: "1-BEDROOM",
        rentAmount: 1200000,
        status: "VACANT",

        description:
          "Affordable one-bedroom apartment suitable for a single professional or couple.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+B201",
            publicId: "seed-apartment-b201",
          },
        ],
      },

      {
        _id: ids.apartment4,
        property: ids.property2,
        apartmentNumber: "B202",
        type: "2-BEDROOM",
        rentAmount: 1700000,
        status: "VACANT",

        description:
          "Well-designed two-bedroom apartment with good natural lighting and ample storage.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+B202",
            publicId: "seed-apartment-b202",
          },
        ],
      },

      // Property 3
      {
        _id: ids.apartment5,
        property: ids.property3,
        apartmentNumber: "C301",
        type: "4-BEDROOM",
        rentAmount: 3200000,
        status: "MAINTENANCE",

        description:
          "Large four-bedroom apartment currently undergoing maintenance and upgrades.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+C301",
            publicId: "seed-apartment-c301",
          },
        ],
      },

      {
        _id: ids.apartment6,
        property: ids.property3,
        apartmentNumber: "C302",
        type: "2-BEDROOM",
        rentAmount: 1600000,
        status: "OCCUPIED",

        description:
          "Modern two-bedroom apartment with comfortable living spaces and secure parking.",

        images: [
          {
            url: "https://placehold.co/1000x700?text=Apartment+C302",
            publicId: "seed-apartment-c302",
          },
        ],
      },
    ]);

    console.log(`Apartments created: ${apartments.length}`);

    // ==========================================
    // DATES
    // ==========================================

    const now = new Date();

    const daysAgo = (days) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    const daysFromNow = (days) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return date;
    };

    // ==========================================
    // 4. TENANCIES
    // ==========================================

    const tenancies = await Tenancy.insertMany([
      {
        _id: ids.tenancy1,

        tenant: ids.tenant1,
        apartment: ids.apartment2,

        startDate: daysAgo(120),
        endDate: daysFromNow(245),

        rentAmount: 2400000,

        status: "ACTIVE",
      },

      {
        _id: ids.tenancy2,

        tenant: ids.tenant3,
        apartment: ids.apartment6,

        startDate: daysAgo(90),
        endDate: daysFromNow(275),

        rentAmount: 1600000,

        status: "ACTIVE",
      },
    ]);

    console.log(`Tenancies created: ${tenancies.length}`);

    // ==========================================
    // 5. INVOICES
    // ==========================================

    const invoices = await Invoice.insertMany([
      {
        _id: ids.invoice1,

        tenancy: ids.tenancy1,

        amount: 2400000,

        dueDate: daysAgo(30),

        status: "PAID",
      },

      {
        _id: ids.invoice2,

        tenancy: ids.tenancy1,

        amount: 2400000,

        dueDate: daysFromNow(30),

        status: "UNPAID",
      },

      {
        _id: ids.invoice3,

        tenancy: ids.tenancy2,

        amount: 1600000,

        dueDate: daysFromNow(15),

        status: "PARTIALLY_PAID",
      },
    ]);

    console.log(`Invoices created: ${invoices.length}`);

    // ==========================================
    // 6. PAYMENTS
    // ==========================================

    const payments = await Payment.insertMany([
      {
        _id: ids.payment1,

        invoice: ids.invoice1,

        amount: 2400000,

        paidAt: daysAgo(35),

        status: "SUCCESSFUL",

        reference: "PAY-SEED-2026-0001",
      },

      {
        _id: ids.payment2,

        invoice: ids.invoice3,

        amount: 800000,

        paidAt: daysAgo(5),

        status: "SUCCESSFUL",

        reference: "PAY-SEED-2026-0002",
      },
    ]);

    console.log(`Payments created: ${payments.length}`);

    // ==========================================
    // 7. MAINTENANCE REQUESTS
    // ==========================================

    const maintenanceRequests = await Maintenance.insertMany([
      {
        _id: ids.maintenance1,

        tenant: ids.tenant1,

        apartment: ids.apartment2,

        title: "Leaking bathroom tap",

        description:
          "The bathroom tap has been leaking continuously and needs to be repaired or replaced.",

        priority: "MEDIUM",

        status: "OPEN",
      },

      {
        _id: ids.maintenance2,

        tenant: ids.tenant3,

        apartment: ids.apartment6,

        title: "Air conditioner not cooling",

        description:
          "The living room air conditioner turns on but is not producing enough cooling. A technician needs to inspect the unit.",

        priority: "HIGH",

        status: "IN_PROGRESS",
      },
    ]);

    console.log(
      `Maintenance requests created: ${maintenanceRequests.length}`
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log("\n====================================");
    console.log("DATABASE SEEDED SUCCESSFULLY");
    console.log("====================================");

    console.log("\nTEST LOGIN ACCOUNTS");
    console.log("------------------------------------");

    console.log("Admin:");
    console.log("Email: admin@rentahome.test");
    console.log("Password: Password123!");

    console.log("\nManager 1:");
    console.log("Email: manager1@rentahome.test");
    console.log("Password: Password123!");

    console.log("\nManager 2:");
    console.log("Email: manager2@rentahome.test");
    console.log("Password: Password123!");

    console.log("\nTenant 1:");
    console.log("Email: tenant1@rentahome.test");
    console.log("Password: Password123!");

    console.log("\nTenant 2:");
    console.log("Email: tenant2@rentahome.test");
    console.log("Password: Password123!");

    console.log("\nTenant 3:");
    console.log("Email: tenant3@rentahome.test");
    console.log("Password: Password123!");

    console.log("\n====================================");
    console.log("SEED SUMMARY");
    console.log("====================================");
    console.log("Users:        6");
    console.log("Properties:   3");
    console.log("Apartments:   6");
    console.log("Tenancies:    2");
    console.log("Invoices:     3");
    console.log("Payments:     2");
    console.log("Maintenance:  2");
    console.log("====================================\n");

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("\nDatabase seeding failed:");
    console.error(error);

    await mongoose.connection.close();

    process.exit(1);
  }
};

seedDatabase();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@tds.com';
    const password = 'AdminTDS2026!';
    const firstName = 'Admin';
    const lastName = 'TDS';

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('❌ User already exists:', email);
      return;
    }

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password_hash,
        firstName,
        lastName,
        role: 'ADMIN',
        isEmailVerified: true
      }
    });

    console.log('✅ Admin account created successfully!');
    console.log('📋 Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Role: ADMIN`);
    console.log(`🆔 User ID: ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

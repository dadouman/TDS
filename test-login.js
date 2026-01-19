const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'admin@tds.com';
    const password = 'AdminTDS2026!';
    
    console.log('🔍 Searching for admin user...');
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        is_deleted: false,
      },
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   is_deleted:', user.is_deleted);
    console.log('   isEmailVerified:', user.isEmailVerified);
    
    console.log('\n🔐 Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (passwordMatch) {
      console.log('✅ Password is CORRECT');
      console.log('   Login should work!');
    } else {
      console.log('❌ Password is INCORRECT');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();

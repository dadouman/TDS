const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    // Check with findFirst (includes deleted records)
    const user = await prisma.user.findFirst({
      where: { email: 'admin@tds.com' }
    });
    
    if (user) {
      console.log('✅ Admin user found:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   is_deleted:', user.is_deleted);
    } else {
      console.log('❌ Admin user NOT found at all');
      
      // List all users
      const allUsers = await prisma.user.findMany();
      console.log('\nAll users in database:');
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (role: ${u.role}, deleted: ${u.is_deleted})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debug();

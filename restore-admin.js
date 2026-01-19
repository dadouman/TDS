const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'admin@tds.com' }
    });
    
    if (!user) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('Admin user current state:');
    console.log('   is_deleted:', user.is_deleted);
    
    if (user.is_deleted) {
      // Restore the deleted admin
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { is_deleted: false }
      });
      console.log('✅ Admin account restored!');
      console.log('   Email: ' + updated.email);
      console.log('   Role: ' + updated.role);
    } else {
      console.log('✅ Admin account is already active');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restore();

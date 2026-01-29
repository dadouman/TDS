const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('🌱 Seeding database with test data...\n');

    // ===== CLEAN UP EXISTING DATA (except admin) =====
    console.log('🧹 Cleaning up existing test data...');
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { not: 'admin@tds.com' } }
    });
    console.log('   ✅ Cleanup completed\n');

    // ===== SUPPLIERS =====
    console.log('📦 Creating suppliers...');
    const suppliers = await Promise.all([
      prisma.location.create({
        data: {
          name: 'Usine Textile Paris',
          type: 'SUPPLIER',
          address: '123 Rue de la Paix, 75000 Paris, France',
          latitude: 48.8566,
          longitude: 2.3522
        }
      }),
      prisma.location.create({
        data: {
          name: 'Manufacture Provence',
          type: 'SUPPLIER',
          address: '456 Route de la Lavande, 84000 Avignon, France',
          latitude: 43.9493,
          longitude: 4.8055
        }
      }),
      prisma.location.create({
        data: {
          name: 'Atelier Lyon',
          type: 'SUPPLIER',
          address: '789 Rue du Progrès, 69000 Lyon, France',
          latitude: 45.7640,
          longitude: 4.8357
        }
      }),
      prisma.location.create({
        data: {
          name: 'Production Marseille',
          type: 'SUPPLIER',
          address: '321 Avenue de la Canebière, 13000 Marseille, France',
          latitude: 43.2965,
          longitude: 5.3698
        }
      })
    ]);
    console.log(`   ✅ ${suppliers.length} suppliers created\n`);

    // ===== HUBS (Warehouses) =====
    console.log('🏢 Creating hubs/warehouses...');
    const hubs = await Promise.all([
      prisma.location.create({
        data: {
          name: 'Centre Logistique Paris',
          type: 'HUB',
          address: '1000 Boulevard Périphérique, 75000 Paris, France',
          latitude: 48.8566,
          longitude: 2.2922
        }
      }),
      prisma.location.create({
        data: {
          name: 'Hub Rhône-Alpes',
          type: 'HUB',
          address: '2000 Route de Genas, 69700 Bron, France',
          latitude: 45.7300,
          longitude: 4.9203
        }
      }),
      prisma.location.create({
        data: {
          name: 'Centre de Distribution Méditerranée',
          type: 'HUB',
          address: '3000 Route du Port, 13200 Arles, France',
          latitude: 43.6769,
          longitude: 4.6294
        }
      })
    ]);
    console.log(`   ✅ ${hubs.length} hubs created\n`);

    // ===== STORES =====
    console.log('🛍️ Creating stores...');
    const stores = await Promise.all([
      prisma.location.create({
        data: {
          name: 'Magasin Galeries Lafayette Paris',
          type: 'STORE',
          address: '40 Boulevard Haussmann, 75009 Paris, France',
          latitude: 48.8724,
          longitude: 2.3212
        }
      }),
      prisma.location.create({
        data: {
          name: 'Boutique Champs-Élysées',
          type: 'STORE',
          address: '250 Avenue des Champs-Élysées, 75008 Paris, France',
          latitude: 48.8698,
          longitude: 2.3076
        }
      }),
      prisma.location.create({
        data: {
          name: 'Magasin Presqu\'île Lyon',
          type: 'STORE',
          address: '47 Rue de la République, 69000 Lyon, France',
          latitude: 45.7597,
          longitude: 4.8340
        }
      }),
      prisma.location.create({
        data: {
          name: 'Store Marseille Centre-Ville',
          type: 'STORE',
          address: '5 Rue Saint-Ferréol, 13000 Marseille, France',
          latitude: 43.2955,
          longitude: 5.3727
        }
      }),
      prisma.location.create({
        data: {
          name: 'Boutique Avignon Vieille Ville',
          type: 'STORE',
          address: '15 Rue Joseph Vernet, 84000 Avignon, France',
          latitude: 43.9493,
          longitude: 4.8055
        }
      }),
      prisma.location.create({
        data: {
          name: 'Magasin Toulouse',
          type: 'STORE',
          address: '88 Rue Saint-Antoine, 31000 Toulouse, France',
          latitude: 43.6045,
          longitude: 1.4440
        }
      })
    ]);
    console.log(`   ✅ ${stores.length} stores created\n`);

    // ===== TRANSPORT PLANS =====
    console.log('📋 Creating transport plans...');
    
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@tds.com' }
    });

    if (!adminUser) {
      console.log('   ⚠️ Admin user not found. Skipping transport plans.');
      return;
    }

    // ===== TEST USERS =====
    console.log('👥 Creating test users...');
    const testUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'freighter@tds.com',
          password_hash: await bcrypt.hash('TestPass123!', 10),
          firstName: 'Jean',
          lastName: 'Transporteur',
          role: 'FREIGHTER',
          isEmailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'carrier@tds.com',
          password_hash: await bcrypt.hash('TestPass123!', 10),
          firstName: 'Marie',
          lastName: 'Livreur',
          role: 'CARRIER',
          isEmailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'warehouse@tds.com',
          password_hash: await bcrypt.hash('TestPass123!', 10),
          firstName: 'Pierre',
          lastName: 'Entrepôt',
          role: 'WAREHOUSE',
          isEmailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'store1@tds.com',
          password_hash: await bcrypt.hash('TestPass123!', 10),
          firstName: 'Sophie',
          lastName: 'Magasin',
          role: 'STORE',
          isEmailVerified: true,
          storeLocationId: stores[0].id
        }
      }),
      prisma.user.create({
        data: {
          email: 'store2@tds.com',
          password_hash: await bcrypt.hash('TestPass123!', 10),
          firstName: 'Luc',
          lastName: 'Boutique',
          role: 'STORE',
          isEmailVerified: true,
          storeLocationId: stores[1].id
        }
      })
    ]);
    console.log(`   ✅ ${testUsers.length} test users created\n`);

    const plans = await Promise.all([
      prisma.transportPlan.create({
        data: {
          supplierId: suppliers[0].id,
          destinationId: stores[0].id,
          hubId: hubs[0].id,
          unitCount: 150,
          plannedLoadingTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          estimatedHubTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          notes: 'Plan de transport textile Paris → Galeries Lafayette',
          createdBy: adminUser.id
        }
      }),
      prisma.transportPlan.create({
        data: {
          supplierId: suppliers[1].id,
          destinationId: stores[3].id,
          hubId: hubs[2].id,
          unitCount: 200,
          plannedLoadingTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          estimatedHubTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: 'PROPOSED',
          notes: 'Lavande Provence → Marseille',
          createdBy: adminUser.id
        }
      }),
      prisma.transportPlan.create({
        data: {
          supplierId: suppliers[2].id,
          destinationId: stores[2].id,
          hubId: hubs[1].id,
          unitCount: 120,
          plannedLoadingTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          estimatedHubTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'ACCEPTED',
          notes: 'Lyon vers Presqu\'île',
          createdBy: adminUser.id
        }
      }),
      prisma.transportPlan.create({
        data: {
          supplierId: suppliers[3].id,
          destinationId: stores[1].id,
          unitCount: 300,
          plannedLoadingTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'IN_TRANSIT',
          notes: 'Marseille direction Champs-Élysées',
          createdBy: adminUser.id
        }
      }),
      prisma.transportPlan.create({
        data: {
          supplierId: suppliers[0].id,
          destinationId: stores[4].id,
          hubId: hubs[2].id,
          unitCount: 180,
          plannedLoadingTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          estimatedHubTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          notes: 'Plan Avignon - En préparation',
          createdBy: adminUser.id
        }
      })
    ]);
    console.log(`   ✅ ${plans.length} transport plans created\n`);

    // ===== TRIPS (for warehouse CMR workflow) =====
    console.log('🚚 Creating trips for warehouse CMR...');
    const carrierUser = testUsers.find(u => u.role === 'CARRIER');
    
    const trips = await Promise.all([
      // Trip for plan 2 (PROPOSED) - needs CMR when ACCEPTED
      prisma.trip.create({
        data: {
          planId: plans[1].id,
          carrierId: carrierUser.id,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      }),
      // Trip for plan 3 (ACCEPTED) - needs CMR before IN_TRANSIT
      prisma.trip.create({
        data: {
          planId: plans[2].id,
          carrierId: carrierUser.id,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      }),
      // Trip for plan 4 (IN_TRANSIT) - CMR already needed
      prisma.trip.create({
        data: {
          planId: plans[3].id,
          carrierId: carrierUser.id,
          status: 'IN_TRANSIT',
          acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      })
    ]);
    console.log(`   ✅ ${trips.length} trips created\n`);

    // ===== SUMMARY =====
    console.log('📊 Seed Summary:');
    console.log(`   🔹 Suppliers: ${suppliers.length}`);
    console.log(`   🔹 Hubs: ${hubs.length}`);
    console.log(`   🔹 Stores: ${stores.length}`);
    console.log(`   🔹 Test Users: ${testUsers.length}`);
    console.log(`   🔹 Transport Plans: ${plans.length}`);
    console.log(`   🔹 Trips: ${trips.length}`);
    console.log(`   🔹 Total Locations: ${suppliers.length + hubs.length + stores.length}`);
    
    console.log('\n🔐 Test Accounts:');
    console.log('   Admin:');
    console.log('      📧 admin@tds.com');
    console.log('      🔑 AdminTDS2026!');
    console.log('   Freighter:');
    console.log('      📧 freighter@tds.com');
    console.log('      🔑 TestPass123!');
    console.log('   Carrier:');
    console.log('      📧 carrier@tds.com');
    console.log('      🔑 TestPass123!');
    console.log('   Warehouse:');
    console.log('      📧 warehouse@tds.com');
    console.log('      🔑 TestPass123!');
    console.log('   Store 1:');
    console.log('      📧 store1@tds.com');
    console.log('      🔑 TestPass123!');
    console.log('   Store 2:');
    console.log('      📧 store2@tds.com');
    console.log('      🔑 TestPass123!');
    console.log('\n✨ Database seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();

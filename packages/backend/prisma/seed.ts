import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin gebruiker
  const passwordHash = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@transportplanner.be" },
    update: {},
    create: {
      email: "admin@transportplanner.be",
      passwordHash,
      displayName: "Administrator",
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Voorbeeld chauffeurs
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { licenseNumber: "BE-001" },
      update: {},
      create: { name: "Jan Janssen", licenseNumber: "BE-001" },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: "BE-002" },
      update: {},
      create: { name: "Piet Pieters", licenseNumber: "BE-002" },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: "BE-003" },
      update: {},
      create: { name: "Marie Claes", licenseNumber: "BE-003" },
    }),
  ]);
  console.log(`${drivers.length} drivers seeded.`);

  // Voorbeeld voertuigen (01 t/m 05)
  const vehicles = await Promise.all(
    ["01", "02", "03", "04", "05"].map((code) =>
      prisma.vehicle.upsert({
        where: { code },
        update: {},
        create: { code, capacityKarren: 40 },
      })
    )
  );
  console.log(`${vehicles.length} vehicles seeded.`);

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

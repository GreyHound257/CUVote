import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database with initial data...");

  // Default admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@cuvote.local";
  const initialPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "System Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    });
    console.log(`Created default admin user: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
        console.log(`Generated secure temporary password for admin: ${initialPassword}`);
        console.log(`IMPORTANT: Please save this password securely and change it immediately upon login.`);
    }
  } else {
    console.log("Default admin user already exists.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

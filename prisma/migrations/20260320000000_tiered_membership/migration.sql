-- CreateTable: MembershipTier
CREATE TABLE "MembershipTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "MembershipTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTier_name_key" ON "MembershipTier"("name");
CREATE UNIQUE INDEX "MembershipTier_slug_key" ON "MembershipTier"("slug");
CREATE UNIQUE INDEX "MembershipTier_level_key" ON "MembershipTier"("level");

-- Seed system tiers
INSERT INTO "MembershipTier" ("id", "name", "slug", "level", "isSystem", "description")
VALUES
  ('tier_pending', 'Pending', 'pending', 0, true, 'Default tier for new users awaiting approval'),
  ('tier_member', 'Member', 'member', 10, false, 'Standard member'),
  ('tier_admin', 'Admin', 'admin', 999, true, 'Full system access');

-- Add new columns to User (nullable first for backfill)
ALTER TABLE "User" ADD COLUMN "tierId" TEXT;
ALTER TABLE "User" ADD COLUMN "tierLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "tierName" TEXT NOT NULL DEFAULT 'Pending';

-- Backfill existing users based on old role enum
UPDATE "User" SET "tierId" = 'tier_pending', "tierLevel" = 0, "tierName" = 'Pending' WHERE "role" = 'PENDING';
UPDATE "User" SET "tierId" = 'tier_member', "tierLevel" = 10, "tierName" = 'Member' WHERE "role" = 'MEMBER';
UPDATE "User" SET "tierId" = 'tier_admin', "tierLevel" = 999, "tierName" = 'Admin' WHERE "role" = 'ADMIN';

-- Handle any remaining nulls (safety net)
UPDATE "User" SET "tierId" = 'tier_pending' WHERE "tierId" IS NULL;

-- Make tierId NOT NULL
ALTER TABLE "User" ALTER COLUMN "tierId" SET NOT NULL;

-- AddForeignKey for User -> MembershipTier
ALTER TABLE "User" ADD CONSTRAINT "User_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old role column and enum BEFORE creating new Role table
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";

-- CreateTable: Role (new model-based Role, replaces enum)
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "minTierLevel" INTEGER NOT NULL DEFAULT 0,
    "requiredRoleId" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserRole
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "Role_slug_key" ON "Role"("slug");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

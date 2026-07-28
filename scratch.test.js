import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Organization from "./server/models/organizationModel.js";
import userModel from "./server/models/userModel.js";
import { joinOrganizationById } from "./server/services/OrganizationService.js";

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const owner = await userModel.create({
    name: "Owner",
    email: "o@o.com",
    password: "pwd",
  });
  const joiner = await userModel.create({
    name: "Joiner",
    email: "j@j.com",
    password: "pwd",
  });

  const org = await Organization.create({
    name: "Private Org",
    slug: "private-org",
    owner: owner._id,
    visibility: "private",
  });

  try {
    await joinOrganizationById(joiner._id, org._id);
    console.log("BUG: Successfully joined private organization!");
  } catch (err) {
    console.log("THROWN:", err.name, err.message);
  }

  await mongoose.disconnect();
  await mongoServer.stop();
}

run().catch(console.error);

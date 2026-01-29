import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth/jwt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify auth
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "FREIGHTER") {
      return res.status(403).json({ error: "Forbidden: FREIGHTER role required" });
    }
    const userId = decoded.id;

    if (req.method === "POST") {
      // Create order
      const {
        departure_location_id,
        arrival_location_id,
        loading_date,
        unit_count,
      } = req.body;

      // Validation
      if (!departure_location_id || !arrival_location_id || !loading_date || !unit_count) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (departure_location_id === arrival_location_id) {
        return res
          .status(400)
          .json({ error: "Departure and arrival must be different" });
      }

      if (unit_count <= 0) {
        return res.status(400).json({ error: "unit_count must be > 0" });
      }

      // Check locations exist
      const [departure, arrival] = await Promise.all([
        prisma.location.findUnique({
          where: { id: departure_location_id },
        }),
        prisma.location.findUnique({
          where: { id: arrival_location_id },
        }),
      ]);

      if (!departure || !arrival) {
        return res.status(400).json({ error: "Location not found" });
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          departure_location_id,
          arrival_location_id,
          loading_date: new Date(loading_date),
          unit_count: parseInt(unit_count),
          status: "DRAFT",
          created_by: userId,
        },
        include: {
          departure_location: true,
          arrival_location: true,
        },
      });

      return res.status(201).json(order);
    } else if (req.method === "GET") {
      // List orders (DRAFT + GROUPED)
      const orders = await prisma.order.findMany({
        where: {
          created_by: userId,
          is_deleted: false,
        },
        include: {
          departure_location: true,
          arrival_location: true,
          trip: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(orders);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

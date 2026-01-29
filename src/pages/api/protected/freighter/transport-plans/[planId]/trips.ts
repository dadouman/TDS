import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth/jwt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "FREIGHTER") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { planId } = req.query;

    if (req.method === "GET") {
      // Get trips for a plan
      const trips = await prisma.trip.findMany({
        where: {
          planId: planId as string,
          is_deleted: false,
        },
        include: {
          orders: {
            select: {
              id: true,
              unit_count: true,
            },
          },
        },
      });

      const formatted = trips.map((trip) => ({
        id: trip.id,
        departure_location_id: trip.departure_location_id,
        arrival_location_id: trip.arrival_location_id,
        loading_time: trip.loading_time,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time,
        status: trip.status,
        order_count: trip.orders.length,
        total_units: trip.orders.reduce((sum, o) => sum + o.unit_count, 0),
      }));

      return res.status(200).json(formatted);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

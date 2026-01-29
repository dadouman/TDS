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
    if (decoded.role !== "CARRIER") {
      return res.status(403).json({ error: "Forbidden: CARRIER role required" });
    }

    const { tripId } = req.query;
    const userId = decoded.id;

    if (req.method === "PUT") {
      const { action, refusal_reason } = req.body;

      if (!["ACCEPT", "REFUSE"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      const trip = await prisma.trip.findUnique({
        where: { id: tripId as string },
      });

      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (action === "ACCEPT") {
        // Accept trip
        const updated = await prisma.trip.update({
          where: { id: tripId as string },
          data: {
            carrierId: userId,
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
          include: {
            orders: true,
          },
        });

        // Update orders to ASSIGNED
        await prisma.order.updateMany({
          where: {
            trip_id: tripId as string,
          },
          data: {
            status: "ASSIGNED",
          },
        });

        return res.status(200).json({
          success: true,
          trip: {
            id: updated.id,
            status: updated.status,
            carrier_id: updated.carrierId,
            order_count: updated.orders.length,
          },
        });
      } else {
        // Refuse trip
        const updated = await prisma.trip.update({
          where: { id: tripId as string },
          data: {
            status: "CANCELLED",
            refusedAt: new Date(),
            refusalReason: refusal_reason || "Carrier refused",
          },
        });

        // Reset orders to GROUPED (so freighter can re-assign)
        await prisma.order.updateMany({
          where: {
            trip_id: tripId as string,
          },
          data: {
            status: "GROUPED",
          },
        });

        return res.status(200).json({
          success: true,
          trip: {
            id: updated.id,
            status: updated.status,
            refusal_reason: updated.refusalReason,
          },
        });
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

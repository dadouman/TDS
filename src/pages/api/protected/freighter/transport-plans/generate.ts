import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/lib/auth/jwt";
import { generateTransportPlan } from "@/lib/services/tripGroupingService";

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
      // Generate plan
      const { plan_date } = req.body;

      const planDate = new Date(plan_date || new Date());

      const { plan, trips } = await generateTransportPlan(userId, planDate);

      return res.status(201).json({
        success: true,
        plan: {
          id: plan.id,
          status: plan.status,
          createdAt: plan.createdAt,
        },
        trips: trips.map((t) => ({
          id: t.id,
          departure_location_id: t.departure_location_id,
          arrival_location_id: t.arrival_location_id,
          loading_time: t.loading_time,
          departure_time: t.departure_time,
          arrival_time: t.arrival_time,
          status: t.status,
          order_count: t.orders.length,
          total_units: t.orders.reduce((sum, o) => sum + o.unit_count, 0),
        })),
      });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ error: error.message || "Failed to generate plan" });
  }
}

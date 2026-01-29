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

    if (req.method === "GET") {
      // List all plans for this freighter
      const plans = await prisma.transportPlan.findMany({
        where: {
          createdBy: decoded.id,
          is_deleted: false,
        },
        select: {
          id: true,
          plan_date: true,
          status: true,
          total_trips: true,
          total_units: true,
          createdAt: true,
        },
        orderBy: { plan_date: "desc" },
        take: 30,
      });

      return res.status(200).json(plans);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

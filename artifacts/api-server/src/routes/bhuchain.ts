import { Router, type IRouter } from "express";
import { blockchain } from "../lib/blockchain";
import {
  RegisterPropertyBody,
  TransferPropertyBody,
  GetPropertyParams,
  CheckUlpinParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/stats
router.get("/stats", async (_req, res): Promise<void> => {
  const stats = blockchain.getStats();
  res.json(stats);
});

// POST /api/properties
router.post("/properties", async (req, res): Promise<void> => {
  const parsed = RegisterPropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.message });
    return;
  }
  const { block, message } = blockchain.registerLand(parsed.data);
  if (!block) {
    res.status(409).json({ success: false, message });
    return;
  }
  res.status(201).json({ success: true, message, block: block.toDict() });
});

// GET /api/properties/:ulpin
router.get("/properties/:ulpin", async (req, res): Promise<void> => {
  const params = GetPropertyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: params.error.message });
    return;
  }
  const { latest, history, alerts, currentOwner } = blockchain.searchByUlpin(params.data.ulpin);
  if (!latest) {
    res.status(404).json({ success: false, message: "No record found for this ULPIN" });
    return;
  }
  res.json({ success: true, currentOwner, latestBlock: latest.toDict(), history, alerts });
});

// GET /api/properties/:ulpin/check
router.get("/properties/:ulpin/check", async (req, res): Promise<void> => {
  const params = CheckUlpinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ exists: false });
    return;
  }
  const owner = blockchain.fraudDetector.getUlpinOwner(params.data.ulpin);
  const { isDuplicate } = blockchain.fraudDetector.checkDuplicateUlpin(params.data.ulpin);
  res.json({ exists: isDuplicate, ownerName: owner });
});

// POST /api/transfers
router.post("/transfers", async (req, res): Promise<void> => {
  const parsed = TransferPropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.message });
    return;
  }
  const { block, message } = blockchain.transferLand(parsed.data);
  if (!block) {
    res.status(409).json({ success: false, message });
    return;
  }
  res.status(201).json({ success: true, message, block: block.toDict() });
});

// GET /api/chain
router.get("/chain", async (_req, res): Promise<void> => {
  const chain = blockchain.getFullChain();
  res.json({ length: chain.length, chain });
});

// GET /api/chain/verify
router.get("/chain/verify", async (_req, res): Promise<void> => {
  const { isValid, results } = blockchain.verifyChain();
  res.json({ isValid, totalBlocks: results.length, results });
});

// GET /api/activity
router.get("/activity", async (_req, res): Promise<void> => {
  const stats = blockchain.getStats();
  res.json(stats.recentActivity);
});

// POST /api/seed
router.post("/seed", async (_req, res): Promise<void> => {
  const { blocksAdded, message } = blockchain.seedDemoData();
  res.json({ success: true, blocksAdded, message });
});

export default router;

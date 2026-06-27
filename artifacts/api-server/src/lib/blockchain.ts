import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

// ─── Resolve data directory relative to workspace root ──────────────────────
const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const DATA_DIR = path.resolve(workspaceRoot, "artifacts/api-server/data");
const DATA_FILE = path.resolve(DATA_DIR, "blockchain.json");

// ─── Types ───────────────────────────────────────────────────────────────────

export type BlockData = Record<string, unknown>;

export interface BlockDict {
  index: number;
  timestamp: string;
  data: BlockData;
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface OwnershipHistoryEntry {
  blockIndex: number;
  timestamp: string;
  type: "registration" | "transfer";
  hash: string;
  owner?: string | null;
  from?: string | null;
  to?: string | null;
  details: string;
}

export interface FraudAlert {
  level: "info" | "warning" | "critical";
  message: string;
}

// ─── Block ───────────────────────────────────────────────────────────────────

export class Block {
  index: number;
  timestamp: string;
  data: BlockData;
  previousHash: string;
  nonce: number;
  hash: string;

  constructor(
    index: number,
    timestamp: string,
    data: BlockData,
    previousHash: string,
    nonce = 0,
    existingHash?: string
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = existingHash ?? this.calculateHash();
  }

  calculateHash(): string {
    const content = JSON.stringify(
      {
        index: this.index,
        timestamp: this.timestamp,
        data: this.data,
        previousHash: this.previousHash,
        nonce: this.nonce,
      },
      Object.keys({
        index: 0,
        timestamp: "",
        data: {},
        previousHash: "",
        nonce: 0,
      }).sort()
    );
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  mineBlock(difficulty = 2): string {
    const target = "0".repeat(difficulty);
    while (!this.hash.startsWith(target)) {
      this.nonce += 1;
      this.hash = this.calculateHash();
    }
    return this.hash;
  }

  toDict(): BlockDict {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
    };
  }

  static fromDict(d: BlockDict): Block {
    return new Block(d.index, d.timestamp, d.data, d.previousHash, d.nonce, d.hash);
  }
}

// ─── Fraud Detector ──────────────────────────────────────────────────────────

export class FraudDetector {
  constructor(private bc: Blockchain) {}

  checkDuplicateUlpin(ulpin: string): { isDuplicate: boolean; existing: BlockData | null } {
    for (const block of this.bc.chain.slice(1)) {
      if (block.data["ulpin"] === ulpin && block.data["type"] === "registration") {
        return { isDuplicate: true, existing: block.data };
      }
    }
    return { isDuplicate: false, existing: null };
  }

  checkCurrentOwner(ulpin: string): string | null {
    let currentOwner: string | null = null;
    for (const block of this.bc.chain.slice(1)) {
      if (block.data["ulpin"] === ulpin) {
        if (block.data["type"] === "registration") {
          currentOwner = block.data["ownerName"] as string;
        } else if (block.data["type"] === "transfer") {
          currentOwner = block.data["newOwnerName"] as string;
        }
      }
    }
    return currentOwner;
  }

  validateTransfer(ulpin: string, claimedOwner: string): { isValid: boolean; message: string } {
    const currentOwner = this.checkCurrentOwner(ulpin);
    if (!currentOwner) {
      return { isValid: false, message: "Land record not found for this ULPIN" };
    }
    if (currentOwner.trim().toLowerCase() !== claimedOwner.trim().toLowerCase()) {
      return {
        isValid: false,
        message: `Ownership mismatch. Current owner is '${currentOwner}', not '${claimedOwner}'`,
      };
    }
    return { isValid: true, message: "Ownership verified" };
  }

  getOwnershipHistory(ulpin: string): OwnershipHistoryEntry[] {
    const history: OwnershipHistoryEntry[] = [];
    for (const block of this.bc.chain.slice(1)) {
      if (block.data["ulpin"] === ulpin) {
        const entry: OwnershipHistoryEntry = {
          blockIndex: block.index,
          timestamp: (block.data["timestamp"] as string) ?? block.timestamp,
          type: block.data["type"] as "registration" | "transfer",
          hash: block.hash,
          owner: null,
          from: null,
          to: null,
          details: "",
        };
        if (block.data["type"] === "registration") {
          entry.owner = block.data["ownerName"] as string;
          entry.details = "Initial Registration";
        } else if (block.data["type"] === "transfer") {
          entry.from = block.data["previousOwner"] as string;
          entry.to = block.data["newOwnerName"] as string;
          entry.details = "Ownership Transfer";
        }
        history.push(entry);
      }
    }
    return history;
  }

  detectSuspiciousActivity(ulpin: string): FraudAlert[] {
    const history = this.getOwnershipHistory(ulpin);
    const alerts: FraudAlert[] = [];
    const transfers = history.filter((h) => h.type === "transfer");
    if (transfers.length >= 3) {
      alerts.push({
        level: "warning",
        message: `Multiple transfers detected (${transfers.length} transfers) for ULPIN ${ulpin}. Possible fraudulent activity.`,
      });
    }
    if (transfers.length >= 5) {
      alerts.push({
        level: "critical",
        message: `High-frequency transfer alert (${transfers.length} transfers) — flag for registrar review.`,
      });
    }
    return alerts;
  }

  getUlpinOwner(ulpin: string): string | null {
    return this.checkCurrentOwner(ulpin);
  }
}

// ─── Blockchain ───────────────────────────────────────────────────────────────

export class Blockchain {
  static readonly DIFFICULTY = 2;
  chain: Block[] = [];
  readonly fraudDetector: FraudDetector;

  constructor() {
    this.fraudDetector = new FraudDetector(this);
    this.loadChain();
  }

  private createGenesisBlock(): Block {
    const genesis = new Block(
      0,
      new Date().toISOString(),
      {
        type: "genesis",
        message: "Genesis Block — BhuChain Land Registry System Initialized",
        timestamp: new Date().toISOString(),
        creator: "System Administrator",
      },
      "0"
    );
    genesis.mineBlock(Blockchain.DIFFICULTY);
    return genesis;
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data: BlockData): Block {
    const prev = this.getLatestBlock();
    const block = new Block(this.chain.length, new Date().toISOString(), data, prev.hash);
    block.mineBlock(Blockchain.DIFFICULTY);
    this.chain.push(block);
    this.saveChain();
    return block;
  }

  registerLand(input: {
    ownerName: string;
    ownerAge: number;
    ownerAddress: string;
    ulpin: string;
    area: string;
    landType: string;
    district: string;
    state: string;
    aadhaarLast4?: string;
    ipfsDocHash?: string | null;
  }): { block: Block | null; message: string } {
    const { isDuplicate, existing } = this.fraudDetector.checkDuplicateUlpin(input.ulpin);
    if (isDuplicate) {
      return {
        block: null,
        message: `FRAUD ALERT: Land with ULPIN '${input.ulpin}' is already registered to '${existing?.["ownerName"]}'`,
      };
    }
    const block = this.addBlock({
      type: "registration",
      ulpin: input.ulpin,
      ownerName: input.ownerName,
      ownerAge: input.ownerAge,
      ownerAddress: input.ownerAddress,
      area: input.area,
      landType: input.landType,
      district: input.district,
      state: input.state,
      aadhaarKycStatus: input.aadhaarLast4
        ? `Verified via India Stack (XXXX-XXXX-${input.aadhaarLast4})`
        : "Not provided",
      ipfsDocHash:
        input.ipfsDocHash ?? `Qm${crypto.randomBytes(22).toString("base64url").slice(0, 44)}`,
      timestamp: new Date().toISOString(),
      status: "active",
      mutationStatus: "Approved & Mutated",
    });
    return { block, message: "Land registered successfully and block mined to the chain" };
  }

  transferLand(input: {
    ulpin: string;
    currentOwner: string;
    newOwnerName: string;
    newOwnerAge: number;
    newOwnerAddress: string;
    aadhaarLast4?: string;
    transferReason?: string;
    ipfsDocHash?: string | null;
  }): { block: Block | null; message: string } {
    const { isValid, message } = this.fraudDetector.validateTransfer(
      input.ulpin,
      input.currentOwner
    );
    if (!isValid) {
      return { block: null, message: `TRANSFER DENIED: ${message}` };
    }
    const block = this.addBlock({
      type: "transfer",
      ulpin: input.ulpin,
      previousOwner: input.currentOwner,
      newOwnerName: input.newOwnerName,
      newOwnerAge: input.newOwnerAge,
      newOwnerAddress: input.newOwnerAddress,
      transferReason: input.transferReason ?? "Sale",
      aadhaarKycStatus: input.aadhaarLast4
        ? `Verified via India Stack (XXXX-XXXX-${input.aadhaarLast4})`
        : "Not provided",
      ipfsDocHash:
        input.ipfsDocHash ?? `Qm${crypto.randomBytes(22).toString("base64url").slice(0, 44)}`,
      timestamp: new Date().toISOString(),
      status: "transferred",
      mutationStatus: "Approved & Mutated",
    });
    return { block, message: "Ownership transferred successfully and block mined to the chain" };
  }

  searchByUlpin(ulpin: string): {
    latest: Block | null;
    history: OwnershipHistoryEntry[];
    alerts: FraudAlert[];
    currentOwner: string | null;
  } {
    const records = this.chain.slice(1).filter((b) => b.data["ulpin"] === ulpin);
    if (records.length === 0) {
      return { latest: null, history: [], alerts: [], currentOwner: null };
    }
    const latest = records[records.length - 1];
    const history = this.fraudDetector.getOwnershipHistory(ulpin);
    const alerts = this.fraudDetector.detectSuspiciousActivity(ulpin);
    const currentOwner = this.fraudDetector.checkCurrentOwner(ulpin);
    return { latest, history, alerts, currentOwner };
  }

  verifyChain(): {
    isValid: boolean;
    results: Array<{
      index: number;
      storedHash: string;
      calculatedHash: string;
      hashValid: boolean;
      previousHashValid: boolean;
      type: string;
    }>;
  } {
    const results = [];
    let isValid = true;
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const calculatedHash = block.calculateHash();
      const hashValid = block.hash === calculatedHash;
      let previousHashValid = true;
      if (i > 0) {
        previousHashValid = block.previousHash === this.chain[i - 1].hash;
      }
      if (!hashValid || !previousHashValid) isValid = false;
      results.push({
        index: block.index,
        storedHash: block.hash,
        calculatedHash,
        hashValid,
        previousHashValid,
        type: (block.data["type"] as string) ?? "unknown",
      });
    }
    return { isValid, results };
  }

  getStats(): {
    totalBlocks: number;
    totalRegistrations: number;
    totalTransfers: number;
    uniqueProperties: number;
    chainValid: boolean;
    recentActivity: object[];
    registrationsByState: { state: string; count: number }[];
    transfersOverTime: { date: string; registrations: number; transfers: number }[];
  } {
    const nonGenesis = this.chain.slice(1);
    const totalRegistrations = nonGenesis.filter((b) => b.data["type"] === "registration").length;
    const totalTransfers = nonGenesis.filter((b) => b.data["type"] === "transfer").length;
    const uniqueUlpins = new Set(
      nonGenesis.map((b) => b.data["ulpin"] as string).filter(Boolean)
    );
    const { isValid } = this.verifyChain();

    const recentActivity = [...nonGenesis]
      .reverse()
      .slice(0, 20)
      .map((block) => ({
        index: block.index,
        type: block.data["type"] as string,
        ulpin: (block.data["ulpin"] as string) ?? "N/A",
        timestamp: (block.data["timestamp"] as string) ?? block.timestamp,
        hash: block.hash.slice(0, 16) + "...",
        description:
          block.data["type"] === "registration"
            ? `Land '${block.data["ulpin"]}' registered to ${block.data["ownerName"]}`
            : block.data["type"] === "transfer"
            ? `Land '${block.data["ulpin"]}' transferred to ${block.data["newOwnerName"]}`
            : "Genesis block",
      }));

    // Registrations by state
    const stateMap = new Map<string, number>();
    nonGenesis
      .filter((b) => b.data["type"] === "registration")
      .forEach((b) => {
        const state = (b.data["state"] as string) ?? "Unknown";
        stateMap.set(state, (stateMap.get(state) ?? 0) + 1);
      });
    const registrationsByState = Array.from(stateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));

    // Transfers/registrations over time (last 7 days)
    const now = Date.now();
    const transfersOverTime = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const registrations = nonGenesis.filter((b) => {
        const ts = (b.data["timestamp"] as string) ?? b.timestamp;
        return ts.startsWith(dateStr) && b.data["type"] === "registration";
      }).length;
      const transfers = nonGenesis.filter((b) => {
        const ts = (b.data["timestamp"] as string) ?? b.timestamp;
        return ts.startsWith(dateStr) && b.data["type"] === "transfer";
      }).length;
      return { date: dateStr, registrations, transfers };
    });

    return {
      totalBlocks: this.chain.length,
      totalRegistrations,
      totalTransfers,
      uniqueProperties: uniqueUlpins.size,
      chainValid: isValid,
      recentActivity,
      registrationsByState,
      transfersOverTime,
    };
  }

  getFullChain(): BlockDict[] {
    return this.chain.map((b) => b.toDict());
  }

  private saveChain(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.chain.map((b) => b.toDict()), null, 2));
    } catch (err) {
      logger.error({ err }, "Failed to save blockchain");
    }
  }

  private loadChain(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const data = JSON.parse(raw) as BlockDict[];
        this.chain = data.map((d) => Block.fromDict(d));
        if (this.chain.length === 0) {
          this.chain = [this.createGenesisBlock()];
          this.saveChain();
        }
        logger.info({ blocks: this.chain.length }, "Blockchain loaded from disk");
      } else {
        this.chain = [this.createGenesisBlock()];
        this.saveChain();
        logger.info("New blockchain initialized with genesis block");
      }
    } catch (err) {
      logger.error({ err }, "Failed to load blockchain, reinitializing");
      this.chain = [this.createGenesisBlock()];
      this.saveChain();
    }
  }

  /**
   * Seed the chain with realistic demo data spread across the last 7 days.
   * Only runs if the chain has fewer than 5 non-genesis blocks.
   */
  seedDemoData(): { blocksAdded: number; message: string } {
    const existing = this.chain.slice(1).length;
    if (existing >= 5) {
      return { blocksAdded: 0, message: "Chain already has enough data — seed skipped" };
    }

    // Helper: ISO timestamp backdated by N days + random hour/minute offset
    const daysAgo = (n: number, hourOffset = 0): string => {
      const d = new Date(Date.now() - n * 86_400_000 + hourOffset * 3_600_000);
      return d.toISOString();
    };

    const ipfs = () => `Qm${crypto.randomBytes(22).toString("base64url").slice(0, 44)}`;

    type Reg = {
      ulpin: string; ownerName: string; ownerAge: number; ownerAddress: string;
      area: string; landType: string; district: string; state: string;
      aadhaarLast4: string; daysBack: number; hourOffset?: number;
    };
    type Xfer = {
      ulpin: string; currentOwner: string; newOwnerName: string; newOwnerAge: number;
      newOwnerAddress: string; transferReason: string; daysBack: number; hourOffset?: number;
    };

    const registrations: Reg[] = [
      { ulpin: "09350200056789", ownerName: "Priya Sharma", ownerAge: 34, ownerAddress: "Flat 12B, Andheri West, Mumbai, Maharashtra", area: "320 sq m", landType: "Residential", district: "Mumbai", state: "Maharashtra", aadhaarLast4: "4521", daysBack: 6, hourOffset: 2 },
      { ulpin: "33180100234567", ownerName: "Abdul Rahman Siddiqui", ownerAge: 55, ownerAddress: "14/3 Anna Salai, Chennai, Tamil Nadu", area: "1.2 acres", landType: "Commercial", district: "Chennai", state: "Tamil Nadu", aadhaarLast4: "8873", daysBack: 6, hourOffset: 5 },
      { ulpin: "24150300112233", ownerName: "Sunita Devi Patel", ownerAge: 42, ownerAddress: "Survey No. 45, Navsari Road, Surat, Gujarat", area: "0.8 acres", landType: "Agricultural", district: "Surat", state: "Gujarat", aadhaarLast4: "3390", daysBack: 5, hourOffset: 1 },
      { ulpin: "08090200445566", ownerName: "Vikram Singh Rathore", ownerAge: 48, ownerAddress: "Khasra No. 221, Jodhpur Rural, Rajasthan", area: "2.5 acres", landType: "Agricultural", district: "Jodhpur", state: "Rajasthan", aadhaarLast4: "7712", daysBack: 5, hourOffset: 3 },
      { ulpin: "29200100778899", ownerName: "Lakshmi Narayanan Iyer", ownerAge: 61, ownerAddress: "No. 8, Basavangudi, Bengaluru, Karnataka", area: "600 sq m", landType: "Residential", district: "Bengaluru", state: "Karnataka", aadhaarLast4: "5504", daysBack: 4, hourOffset: 2 },
      { ulpin: "19110400991122", ownerName: "Mohammad Iqbal Ansari", ownerAge: 39, ownerAddress: "Ward 14, Howrah Industrial Area, West Bengal", area: "1,800 sq ft", landType: "Industrial", district: "Howrah", state: "West Bengal", aadhaarLast4: "2241", daysBack: 4, hourOffset: 6 },
      { ulpin: "23060200334455", ownerName: "Geeta Rani Mishra", ownerAge: 51, ownerAddress: "Plot 77, Bhopal North Zone, Madhya Pradesh", area: "0.6 acres", landType: "Agricultural", district: "Bhopal", state: "Madhya Pradesh", aadhaarLast4: "9968", daysBack: 3, hourOffset: 4 },
      { ulpin: "10040100667788", ownerName: "Rajendra Prasad Yadav", ownerAge: 58, ownerAddress: "Mauza Khagaul, Patna District, Bihar", area: "1.75 acres", landType: "Agricultural", district: "Patna", state: "Bihar", aadhaarLast4: "1134", daysBack: 3, hourOffset: 1 },
      { ulpin: "07010100223344", ownerName: "Anita Kumari Verma", ownerAge: 36, ownerAddress: "House 24, Sector 9, Dwarka, New Delhi", area: "200 sq m", landType: "Residential", district: "South West Delhi", state: "Delhi", aadhaarLast4: "6627", daysBack: 2, hourOffset: 3 },
      { ulpin: "09270300556677", ownerName: "Suresh Kumar Yadav", ownerAge: 44, ownerAddress: "Khasra 418/2, Ayodhya Tehsil, Faizabad, UP", area: "1.1 acres", landType: "Agricultural", district: "Faizabad", state: "Uttar Pradesh", aadhaarLast4: "8845", daysBack: 2, hourOffset: 5 },
      { ulpin: "36120100889900", ownerName: "Meera Reddy Naidu", ownerAge: 29, ownerAddress: "H. No. 5-6-789, Jubilee Hills, Hyderabad", area: "450 sq m", landType: "Residential", district: "Hyderabad", state: "Telangana", aadhaarLast4: "3312", daysBack: 1, hourOffset: 2 },
      { ulpin: "03070200123123", ownerName: "Karan Jeet Singh", ownerAge: 52, ownerAddress: "Village Bhatinda Kalan, Amritsar Tehsil, Punjab", area: "3 acres", landType: "Agricultural", district: "Amritsar", state: "Punjab", aadhaarLast4: "7790", daysBack: 1, hourOffset: 4 },
    ];

    const transfers: Xfer[] = [
      { ulpin: "09350200056789", currentOwner: "Priya Sharma", newOwnerName: "Arun Mehta", newOwnerAge: 38, newOwnerAddress: "Flat 5A, Bandra, Mumbai, Maharashtra", transferReason: "Sale", daysBack: 4, hourOffset: 8 },
      { ulpin: "08090200445566", currentOwner: "Vikram Singh Rathore", newOwnerName: "Kavita Choudhary", newOwnerAge: 44, newOwnerAddress: "9B, Paota Colony, Jodhpur, Rajasthan", transferReason: "Inheritance", daysBack: 3, hourOffset: 7 },
      { ulpin: "23060200334455", currentOwner: "Geeta Rani Mishra", newOwnerName: "Shyam Lal Tiwari", newOwnerAge: 49, newOwnerAddress: "H. No. 31, Arera Colony, Bhopal, MP", transferReason: "Sale", daysBack: 2, hourOffset: 6 },
      { ulpin: "09270300556677", currentOwner: "Suresh Kumar Yadav", newOwnerName: "Mohan Das Gupta", newOwnerAge: 55, newOwnerAddress: "Khasra 55/1, Ram Nagar, Faizabad, UP", transferReason: "Gift", daysBack: 1, hourOffset: 9 },
      { ulpin: "07010100223344", currentOwner: "Anita Kumari Verma", newOwnerName: "Ravi Shankar Gupta", newOwnerAge: 41, newOwnerAddress: "D-47, Vasant Kunj, New Delhi", transferReason: "Sale", daysBack: 0, hourOffset: 3 },
    ];

    let blocksAdded = 0;

    // Register all parcels
    for (const r of registrations) {
      const { isDuplicate } = this.fraudDetector.checkDuplicateUlpin(r.ulpin);
      if (isDuplicate) continue;
      const ts = daysAgo(r.daysBack, r.hourOffset ?? 0);
      this.addBlockWithTimestamp({
        type: "registration",
        ulpin: r.ulpin,
        ownerName: r.ownerName,
        ownerAge: r.ownerAge,
        ownerAddress: r.ownerAddress,
        area: r.area,
        landType: r.landType,
        district: r.district,
        state: r.state,
        aadhaarKycStatus: `Verified via India Stack (XXXX-XXXX-${r.aadhaarLast4})`,
        ipfsDocHash: ipfs(),
        timestamp: ts,
        status: "active",
        mutationStatus: "Approved & Mutated",
      }, ts);
      blocksAdded++;
    }

    // Apply transfers in order (registrations must come first)
    for (const t of transfers) {
      const { isValid } = this.fraudDetector.validateTransfer(t.ulpin, t.currentOwner);
      if (!isValid) continue;
      const ts = daysAgo(t.daysBack, t.hourOffset ?? 0);
      this.addBlockWithTimestamp({
        type: "transfer",
        ulpin: t.ulpin,
        previousOwner: t.currentOwner,
        newOwnerName: t.newOwnerName,
        newOwnerAge: t.newOwnerAge,
        newOwnerAddress: t.newOwnerAddress,
        transferReason: t.transferReason,
        aadhaarKycStatus: "Verified via India Stack",
        ipfsDocHash: ipfs(),
        timestamp: ts,
        status: "transferred",
        mutationStatus: "Approved & Mutated",
      }, ts);
      blocksAdded++;
    }

    return { blocksAdded, message: `Seeded ${blocksAdded} blocks successfully` };
  }

  /** Like addBlock but uses a custom block-level timestamp (for seeding backdated data). */
  private addBlockWithTimestamp(data: BlockData, blockTimestamp: string): Block {
    const prev = this.getLatestBlock();
    const block = new Block(this.chain.length, blockTimestamp, data, prev.hash);
    block.mineBlock(Blockchain.DIFFICULTY);
    this.chain.push(block);
    this.saveChain();
    return block;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────
export const blockchain = new Blockchain();

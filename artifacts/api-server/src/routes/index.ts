import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bhuchainRouter from "./bhuchain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bhuchainRouter);

export default router;

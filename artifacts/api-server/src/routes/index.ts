import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { requireAuth } from "../middlewares/auth";
import profileRouter from "./profile";
import discoveryRouter from "./discovery";
import connectionsRouter from "./connections";
import activitiesRouter from "./activities";
import skillsRouter from "./skills";
import projectsRouter from "./projects";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(profileRouter);
router.use(discoveryRouter);
router.use(connectionsRouter);
router.use(activitiesRouter);
router.use(skillsRouter);
router.use(projectsRouter);
router.use(socialRouter);

export default router;

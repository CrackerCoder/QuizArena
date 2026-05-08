import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quizRouter from "./quiz";
import studyRouter from "./study";
import roomRouter from "./room";
import assignmentRouter from "./assignment";
import userRouter from "./user";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(quizRouter);
router.use(studyRouter);
router.use(roomRouter);
router.use(assignmentRouter);
router.use(userRouter);

export default router;

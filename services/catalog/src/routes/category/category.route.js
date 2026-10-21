import { Router } from "express";
import Categories from "../../controllers/category/category.controller.js";
import CategoryValidator from "../../validators/category/category.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = Router();

router.get("/", Categories.list);
router.post("/", validate(CategoryValidator.create), Categories.create);

export default router;

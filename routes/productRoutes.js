import express from "express";
const router = express.Router();
import {
  addProduct,
  checkAuth,
  addFavourite,
  getFavourites,
  getMyProducts,
  getProducts,
  getProductById,
  deleteProduct,
  addToCart,
  getCartItems,
  addOrder,
  getMyOrders,
  updateOrderStatus,
  userProfile,
  getUsers,
  getOrders
} from "../controllers/productControllers.js";
import { upload } from "../middlewares/multer.js";

router.get("/auth/me", checkAuth);
router.get("/admin/allUsers" , getUsers)
router.get("/user/products", getProducts);
router.get("/admin/products", getProducts);
router.get("/allProducts" , getProducts)
router.get("/admin/allOrders" , getOrders)
router.put('/admin/updateOrder/:orderId', updateOrderStatus)
router.get("/user/myProducts", getMyProducts);
router.post("/user/addProduct", upload.array("images" , 5), addProduct);
router.post("/user/favourite/:productId", addFavourite);
router.get("/productDetails/:productId", getProductById);
router.post("/user/addToCart", addToCart);
router.get("/user/cartItems", getCartItems);
router.delete("/deleteProduct/:ProductId", deleteProduct);
router.get("/user/favourite", getFavourites);
router.post("/user/addOrder" , addOrder)
router.get("/user/myOrders", getMyOrders);
router.get("/user/profile" , userProfile)
export default router;

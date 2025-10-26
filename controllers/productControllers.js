import { client } from "../dbConfig.js";
const db = client.db("OlxClone");
const productsCollection = db.collection("Products");
const userCollection = db.collection("Users");
const myFavourites = db.collection("Favourites");
const cartCollection = db.collection("Cart");
const orderCollection = db.collection("Orders");

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import cloudinary from "../middlewares/cloudinary.js";
import { upload } from "../middlewares/multer.js";

export const checkAuth = (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).send({
        status: 0,
        message: "UnAuhorized",
      });
    }
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("decoded", decoded);
    return res.status(200).send({
      status: 1,
      data: decoded,
    });
  } catch (error) {
    return res.send({
      status: 0,
      error: error,
      message: "Something Went Wrong",
    });
  }
};

export const getProducts = async (req, res) => {
  const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
  if (decoded) {
    const products = await productsCollection
      .find({
        isDeleted: false,
        deletedAt: null,
      })
      .toArray();
    return res.status(200).send({
      status: 1,
      data: products,
      message: "Product Fetched Successfully",
    });
  } else {
    return res.status(401).json({ error: "Authentication required" });
  }
};
export const getUsers = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const users = await userCollection.find({ role: "user" }).toArray();

    const usersWithOrderCounts = await Promise.all(
      users.map(async (user) => {
        const orderCount = await orderCollection.countDocuments({
          userId: user._id,
        });
        return {
          email: user.email,
          status: user.status || "active",
          joinDate: user.joinedAt,
          orderCount,
        };
      })
    );

    return res.status(200).send({
      status: 1,
      data: usersWithOrderCounts,
      message: "Users fetched successfully with order counts",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyProducts = async (req, res) => {
  const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
  try {
    const myProducts = await productsCollection.find({ postedBy: decoded._id });
    const response = await myProducts.toArray();
    console.log("response ", response);
    if (response.length > 0) {
      return res.status(200).send({
        status: 1,
        data: response,
        message: "Products fetched successfully",
      });
    } else {
      return res.status(201).send({
        status: 0,
        message: "No products Found",
      });
    }
  } catch (error) {
    return res.status(404).send({
      status: 0,
      error,
      message: "Something Went Wrong",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Check if user is authenticated (optional - depending on your requirements)
    let userId = null;
    if (req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
        userId = decoded.id; // or decoded._id depending on your JWT payload
      } catch (jwtError) {
        // If token is invalid, we can still proceed without user context
        console.log("Invalid token, proceeding without user context");
      }
    }

    // Find product by ID
    const product = await productsCollection.findOne({
      _id: new ObjectId(productId), isDeleted: false,
    });

    // Check if product exists
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // You might want to populate additional data here
    // For example, if you have separate collections for users/categories

    // Format the response data
    // const productData = {
    //   id: product._id,
    //   title: product.title,
    //   price: product.price,
    //   originalPrice: product.originalPrice || [],
    //   description: product.description,
    //   category: product.category,
    //   condition: product.condition,
    //   location: product.location,
    //   images: product.image || [],
    //   features: product.features || [],
    //   seller: {
    //     id: product.sellerId, // if you have seller reference
    //     name: product.sellerName || 'Seller',
    //     memberSince: product.memberSince || '2023'
    //   },
    //   postedDate: formatPostedDate(product.createdAt),
    //   status: product.status,
    //   // Add any other fields you need
    // };

    // Optional: Track product view (if you want analytics)
    if (userId) {
      await trackProductView(productId, userId);
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product by ID:", error);

    // Handle specific errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to format posted date
// const formatPostedDate = (date) => {
//   if (!date) return 'Recently';

//   const now = new Date();
//   const posted = new Date(date);
//   const diffInMs = now - posted;
//   const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
//   const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

//   if (diffInHours < 1) {
//     return 'Just now';
//   } else if (diffInHours < 24) {
//     return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
//   } else if (diffInDays < 7) {
//     return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
//   } else {
//     return posted.toLocaleDateString();
//   }
// };

// Optional: Function to track product views
// const trackProductView = async (productId, userId) => {
//   try {
//     // You can implement view tracking logic here
//     // For example, increment view count or store in analytics collection
//     await productsCollection.updateOne(
//       { _id: new ObjectId(productId) },
//       { $inc: { views: 1 } }
//     );
//   } catch (error) {
//     console.error('Error tracking product view:', error);
//   }
// };

export const addProduct = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Req files: ", req.files);

    // Upload images
    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
      });
      return result.secure_url;
    });

    const imageUrls = await Promise.all(uploadPromises);

    // Create product
    const product = {
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      location: req.body.location,
      condition: req.body.condition,
      images: imageUrls, // ✅ now accessible
      postedBy: decoded._id,
      status: true,
      isDelete: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await productsCollection.insertOne(product);

    if (response.acknowledged) {
      return res.status(201).json({
        success: true,
        message: "Product added successfully",
        product: { ...product, _id: response.insertedId },
      });
    } else {
      return res.status(500).json({ error: "Failed to add product" });
    }
  } catch (error) {
    console.error("Error in addProduct:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addFavourite = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    console.log("Product Id :", req.params.productId);
    const product = await productsCollection.findOne({
      _id: new ObjectId(req.params.productId),
    });
    if (!product) {
      return res.status(404).send({
        status: 0,
        message: "Product not found",
      });
    }

    // Check if already in favorites
    const existingFavorite = await myFavourites.findOne({
      userId: decoded._id,
      productId: req.params.productId,
    });

    if (existingFavorite) {
      return res.status(400).send({
        status: 0,
        message: "Product already in favorites",
      });
    }

    const favourite = await myFavourites.insertOne({
      userId: decoded._id,
      productId: req.params.productId,
      addedAt: new Date(),
    });

    return res.status(200).send({
      status: 1,
      success: true,
      message: "Added to favorites",
      data: { favouriteId: favourite.insertedId },
    });
  } catch (error) {
    console.error("Error in getFavourites:", error);
    return res.status(500).send({
      status: 0,
      message: "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

export const getFavourites = async (req, res) => {
  try {
    // ✅ Verify JWT
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }

    const userId = decoded._id;

    // ✅ Get user's favourite entries
    const favDocs = await myFavourites.find({ userId }).toArray();

    if (!favDocs.length) {
      return res.status(200).send({
        status: 1,
        data: [],
        message: "No favourite products found",
      });
    }

    // ✅ Extract product IDs as ObjectId
    const productIds = favDocs.map((fav) => new ObjectId(fav.productId));

    // ✅ Fetch all favourite products
    const favProducts = await productsCollection
      .find({ _id: { $in: productIds } })
      .toArray();

    // ✅ Send plain JSON (no BSON issue now)
    return res.status(200).send({
      status: 1,
      success: true,
      data: favProducts,
      message: "Favourites fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching favourites:", error);
    return res.status(500).json({
      status: 0,
      error: "Internal server error",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }


    // Find the product before deletion
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Delete the product
    const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { returnDocument: "after" } // returns the updated document
    );

    if (result.deletedCount === 1) {
      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        deletedProduct: product,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to delete product",
      });
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product",
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    // 1️⃣ Verify user token
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }

    // 2️⃣ Get product ID from body
    const { id } = req.body;

    if (!id) {
      return res.status(400).send({
        status: 0,
        message: "Product ID is required",
      });
    }

    // 3️⃣ Fetch product from database
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).send({
        status: 0,
        message: "Product not found",
      });
    }

    // 4️⃣ Check if already in cart
    const existingCartItem = await cartCollection.findOne({
      userId: decoded._id,
      productId: id,
    });

    if (existingCartItem) {
      return res.status(201).send({
        status: 0,
        success: true,
        message: "Product already in cart",
      });
    }

    // 5️⃣ Insert new item into cart
    const result = await cartCollection.insertOne({
      userId: decoded._id,
      productId: id,
      addedAt: new Date(),
    });

    // 6️⃣ Return success response
    return res.status(200).send({
      status: 1,
      success: true,
      message: "Product added to cart successfully",
      data: { cartItemId: result.insertedId },
    });
  } catch (error) {
    console.error("Error in Adding Cart:", error);
    return res.status(500).send({
      status: 0,
      message: "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

export const getCartItems = async (req, res) => {
  try {
    // ✅ Verify JWT
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }

    const userId = decoded._id;

    // ✅ Get user's favourite entries
    const cartDocs = await cartCollection.find({ userId }).toArray();

    if (!cartDocs.length) {
      return res.status(200).send({
        status: 1,
        success: true,
        data: [],
        message: "No cart products found",
      });
    }

    // ✅ Extract product IDs as ObjectId
    const productIds = cartDocs.map((cart) => new ObjectId(cart.productId));

    // ✅ Fetch all favourite products
    const cartItems = await productsCollection
      .find({ _id: { $in: productIds } })
      .toArray();

    // ✅ Send plain JSON (no BSON issue now)
    return res.status(200).send({
      status: 1,
      success: true,
      data: cartItems,
      message: "Cart Items fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching cart Items:", error);
    return res.status(500).json({
      status: 0,
      error: "Internal server error",
    });
  }
};

export const addOrder = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }

    const { productId } = req.body;

    const product = await productsCollection.findOne({
      _id: new ObjectId(productId),
      status: true,
      isDelete: false,
    });
    if (!product) {
      return res.status(404).send({ status: 0, message: "Product not found" });
    }

    const checkOrder = await orderCollection.findOne({
      userId: decoded._id,
      productId: new ObjectId(productId),
    });

    if (checkOrder) {
      return res
        .status(400)
        .send({ status: 0, message: "Product already ordered" });
    }
    try {
      const addOrder = await orderCollection.insertOne({
        userId: decoded._id,
        productId: new ObjectId(productId),
        productName: req.body.productName,
        cardName: req.body.cardName,
        cardNumber: parseInt(req.body.cardNumber),
        expiryDate: req.body.expiryDate,
        cvv: parseInt(req.body.cvv),
        totalPrice: parseInt(req.body.totalPrice),
        quantity: parseInt(req.body.quantity),
        status: "pending",
        orderedAt: new Date(),
      });
      return res.status(200).send({
        status: 1,
        success: true,
        message: "Order placed successfully",
        data: { orderId: addOrder.insertedId },
      });
    } catch (error) {
      return res.status(500).send({
        status: 0,
        message: "Failed to place order",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error adding order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }
    const userId = decoded._id;
    const orders = await orderCollection.find({ userId }).toArray();
    return res.status(200).json({ status: 1, success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getOrders = async (req, res) => {
  const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
  if (decoded) {
    const orders = await orderCollection.find().toArray();
    return res.status(200).send({
      status: 1,
      success: true,
      data: orders,
      message: "Product Fetched Successfully",
    });
  } else {
    return res.status(401).json({ error: "Authentication required" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized Request" });
    }
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status field is required" });
    }

    const updatedOrder = await orderCollection.findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { status } },
      { returnDocument: false }
    );
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      status: 1,
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder.value,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const userProfile = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    if (!decoded) {
      return res
        .status(401)
        .send({ status: 0, message: "Authentication required" });
    }
    const userId = decoded._id;
    const user = await userCollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(404).send({ status: 0, message: "User not found" });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const { User, Disease } = require("../model/model");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

exports.auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // console.log(authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send("No token found");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "top_secret_key", async (err, decoded) => {
      if (err) {
        return res.status(401).send("invalid token");
      }

      const foundUser = await User.findOne({
        where: { email: decoded.email },
      });
      if (!foundUser) {
        return res.status(404).send("user not found");
      } else {
        req.user = foundUser;
        if (foundUser.role === "patient") {
          next();
        } else {
          return res.status(404).send("user is not patient");
        }
      }
      //   console.log(token);
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.doc_auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send("No token found");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "top_secret_key", async (err, decoded) => {
      if (err) {
        return res.status(401).send("invalid token");
      }

      const foundUser = await User.findOne({
        where: { email: decoded.email },
      });
      if (!foundUser) {
        return res.status(404).send("user not found");
      } else {
        req.user = foundUser;
   
        
        if (foundUser.role === "doctor") {
          next();
        } else {
          return res.status(404).send("user is not doctor");
        }
      }
      //   console.log(token);
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.user_auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send("No token found");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "top_secret_key", async (err, decoded) => {
      if (err) {
        return res.status(401).send("invalid token");
      }

      const foundUser = await User.findOne({
        where: { email: decoded.email },
      });
      if (!foundUser) {
        return res.status(404).send("user not found");
      } else {
        req.user = foundUser;
        next();
      }
      //   console.log(token);
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
//multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: async function (req, file, cb) {
    if (req.user.id) {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().replace(/:/g, "-");
      const newFileName = `${formattedDate}-${req.body.pa_id}${path.extname(
        file.originalname
      )}`;

      if (!req.body.newpaths) {
        req.body.newpaths = [];
      }

      req.body.newpaths.push(`uploads/${newFileName}`);
      console.log("middleware", req.body.newpaths);
      cb(null, newFileName);
    } else {
      cb(new Error("pa_id is missing in the req body"));
    }
  },
});

const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("only jpeg,jpg,png allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
}).array("files", 5);

exports.uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).send({
          error: "max allowed size is 5MB",
        });
      }
      return res.status(400).send({ error: err.message });
    } else if (err) {
      return res.status(400).send({ error: err.message });
    }
    next();
  });
};

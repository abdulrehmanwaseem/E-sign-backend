import { UserRole } from "@prisma/client";

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === UserRole.ADMIN) {
    return next();
  }
  console.log(req.user);
  return res.status(403).json({
    message:
      "Access denied. You do not have permission to access this resource.",
  });
};

export default isAdmin;

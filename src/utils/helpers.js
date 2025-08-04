export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const generateEmailVerifyUrl = (req, url) => {
  return `${req.protocol}://${req.get("host")}/api/v1${url}`;
};

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export function extractNameFromEmail(email) {
  const raw = email.split("@")[0];
  const parts = raw.split(/[._-]/);

  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const firstName = parts[0] ? capitalize(parts[0]) : "John";
  const lastName = parts[1] ? capitalize(parts[1]) : "Doe";

  return `${firstName}+${lastName}`;
}

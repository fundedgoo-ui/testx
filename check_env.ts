import 'dotenv/config';

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("VITE_DATABASE_URL:", process.env.VITE_DATABASE_URL ? "SET" : "NOT SET");

Object.keys(process.env).forEach(key => {
  if (key.includes("FIREBASE") || key.includes("GOOGLE") || key.includes("SERVICE_ACCOUNT")) {
    console.log(`${key}:`, process.env[key] ? "SET (length: " + process.env[key]!.length + ")" : "EMPTY");
  }
});

// check-password.js
const bcrypt = require("bcryptjs");

const hash = "$2b$10$8A9L6D2mJZG4IK1oT8JQ3OGzZBCyBGFhIF5j/QX560Bvmc/e0Ojha"; // your hash

async function check(candidate) {
  const ok = await bcrypt.compare(candidate, hash);
  console.log(ok ? "✅ Match" : "❌ No match");
}

// Try any password you want to test
check("123456").catch(console.error);

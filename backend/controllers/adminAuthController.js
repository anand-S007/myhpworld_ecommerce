const Admin = require('../models/Admin');
const { signAdminToken } = require('../utils/generateToken');

// POST /api/admin/login
async function adminLogin(req, res) {
  const { email, password } = req.body;
  console.log('email= ',email);
  
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !(await admin.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }
  const token = signAdminToken({ id: admin._id, role: admin.role });
  res.json({ admin: admin.toSafeJSON(), token });
}

module.exports = { adminLogin };

// // Code for test purpose
// const { signAdminToken } = require('../utils/generateToken');

// // Mock admin (for testing only)
// const mockAdmin = {
//   _id: "12345",
//   email: 'admin@gmail.com',
//   password: 'admin123',
//   role: "admin",
//   name: "Admin"
// };

// // mimic toSafeJSON (since MongoDB model is not used)
// function toSafeJSON(admin) {
//   return {
//     _id: admin._id,
//     email: admin.email,
//     role: admin.role,
//     name: admin.name
//   };
// }

// // POST /api/admin/login
// async function adminLogin(req, res) {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password are required' });
//   }

//   // 🔐 Mock validation
//   if (
//     email.toLowerCase() !== mockAdmin.email ||
//     password !== mockAdmin.password
//   ) {
//     return res.status(401).json({ message: 'Invalid admin credentials' });
//   }

//   // 🎟️ Generate token (same structure as before)
//   const token = signAdminToken({ id: mockAdmin._id, role: mockAdmin.role });

//   res.json({
//     admin: toSafeJSON(mockAdmin),
//     token
//   });
// }

// module.exports = { adminLogin };
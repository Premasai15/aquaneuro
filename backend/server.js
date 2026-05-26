const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors({
  origin: "http://127.0.0.1:5500",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));// ✅ IMPORTANT
app.use(express.json());

// ✅ 👉 ADD HERE
app.post('/predict', (req, res) => {

  const { ph = 7, turbidity = 20, doVal = 6 } = req.body;

  let score = 0;

  // 🔹 pH logic
  if (ph >= 6.5 && ph <= 8.5) score += 1;
  else score -= 1;

  // 🔹 Turbidity logic
  if (turbidity < 30) score += 1;
  else score -= 1;

  // 🔹 Dissolved Oxygen logic  ✅ ADD HERE
  if (doVal > 5) score += 1;
  else score -= 1;

  // 🔥 Final decision
   let decision = "";
  if (score >= 2) decision = "Safe";
  else if (score === 1) decision = "Moderate";
  else decision = "Unsafe";

  let confidence = Math.min(100, ((score + 3) / 6) * 100);

  res.json({
    prediction: score,
    decision: decision,
    confidence: confidence
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/aquaneuro")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

// 🔥 Real-time data stream (customized for your dashboard)
setInterval(() => {

  const data = {
    ph: +(Math.random()*1.5 + 6.5).toFixed(2),
    turbidity: +(Math.random()*50 + 10).toFixed(1),
    tds: Math.floor(Math.random()*400 + 200),
    do: +(Math.random()*3 + 5).toFixed(1),
    temperature: +(Math.random()*10 + 20).toFixed(1),
    flow: +(Math.random()*50 + 100).toFixed(1)
  };

  const kpi = {
    recovery: +(85 + Math.random()*5).toFixed(1),
    energy: +(2.1 + Math.random()*0.5).toFixed(2),
    quality: +(97 + Math.random()*2).toFixed(1),
    flow: data.flow,
    total: Math.floor(2500 + Math.random()*500),
    confidence: +(92 + Math.random()*4).toFixed(1)
  };

  const control = {
    pump: Math.round(60 + data.turbidity / 2),
    chem: Math.round(data.turbidity / 3),
    uv: Math.min(100, Math.round(70 + data.do))
  };

  // Send to frontend
  io.emit("live-data", { sensor: data, kpi, control });

}, 1500);

// WebSocket connection
io.on("connection", () => {
  console.log("Frontend connected");
});


server.listen(3000, () => {
  console.log("Server running on port 3000");
});

const path = require("path");

app.use("/socket.io", require("express").static(
  path.join(__dirname, "node_modules/socket.io-client/dist")
));
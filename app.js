// ============================================================
//   UTILITIES
// ============================================================
let latestData = {};
const socket = io("http://127.0.0.1:3000");

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("connect_error", (err) => {
  console.error("Socket error:", err);
});

const ctx = document.getElementById('phChart').getContext('2d');

const phChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'pH Value',
      data: [],
      borderWidth: 2
    }]
  },
  options: {
    responsive: true
  }
});
// Listen to live data (you already have this probably)
socket.on("live-data", (data) => {
  console.log("Live Data:", data);
  document.getElementById("ph").innerText = data.sensor.ph;
document.getElementById("turb").innerText = data.sensor.turbidity;
document.getElementById("do").innerText = data.sensor.do;
  const time = new Date().toLocaleTimeString();

// push data
phChart.data.labels.push(time);
phChart.data.datasets[0].data.push(data.sensor.ph);

// limit size
if (phChart.data.labels.length > 10) {
  phChart.data.labels.shift();
  phChart.data.datasets[0].data.shift();
}

phChart.update();
});
function rnd(min, max, dec=2) {
  return +(Math.random()*(max-min)+min).toFixed(dec);
}

function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent =
    now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000); 
updateClock();

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  event.currentTarget.classList.add('active');
  if(name==='ann') { setTimeout(drawANN,100); }
  if(name==='process') { setTimeout(initStageChart,100); }
  if(name==='data') { setTimeout(initHistChart,100); }
}

// ============================================================
//   CANVAS HELPERS
// ============================================================
function setupHiDPI(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

// ============================================================
//   SENSOR CHART (real-time)
// ============================================================
const sensorData = {
  ph:[], turb:[], tds:[], do_:[]
};

for(let i=0;i<60;i++){
  sensorData.ph.push(7);
  sensorData.turb.push(20);
  sensorData.tds.push(300);
  sensorData.do_.push(6);
}

function initSensorChart() {
  const canvas = document.getElementById('sensorChart');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 600, H = 180;
  const ctx = setupHiDPI(canvas, W, H);
  drawSensorChart(ctx, W, H);
}

function drawSensorChart(ctx, W, H) {
  ctx.clearRect(0,0,W,H);
  const pad = {t:10,b:30,l:30,r:10};
  const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;

  // Grid
  ctx.strokeStyle='rgba(13,58,80,0.8)';
  ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    const y=pad.t+cH*i/5;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cW,y); ctx.stroke();
  }

  function drawLine(data, color, min, max, dashed) {
    const n = data.length;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if(dashed) ctx.setLineDash([4,3]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    data.forEach((v,i) => {
      const x = pad.l + cW*i/(n-1);
      const y = pad.t + cH - cH*(v-min)/(max-min);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawLine(sensorData.ph,'#00e5ff',5,10);
  drawLine(sensorData.turb,'#00c4a7',0,25);
  drawLine(sensorData.tds.map(v=>v/100),'#ffb830',0,8);
  drawLine(sensorData.do_,'#00e396',3,12);

  // X axis labels
  ctx.fillStyle='#3a5a70';
  ctx.font='9px Share Tech Mono';
  ctx.textAlign='center';
  for(let i=0;i<=6;i++){
    const x=pad.l+cW*i/6;
    ctx.fillText((60-i*10)+'s',x,H-8);
  }
}

function updateSensorData() {
  sensorData.ph.shift(); sensorData.ph.push(rnd(6.5,8.2));
  sensorData.turb.shift(); sensorData.turb.push(rnd(2,18));
  sensorData.tds.shift(); sensorData.tds.push(rnd(200,500));
  sensorData.do_.shift(); sensorData.do_.push(rnd(5,9));
  const canvas = document.getElementById('sensorChart');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width||600, H=180;
  const ctx = setupHiDPI(canvas,W,H);
  drawSensorChart(ctx,W,H);
}

// ============================================================
// 🔥 LIVE DATA FROM BACKEND
// ============================================================
socket.on("live-data", (data) => {
   latestData = data;
   fetch('http://127.0.0.1:3000/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ph: latestData.sensor.ph,
    turbidity: latestData.sensor.turbidity,
    doVal: latestData.sensor.do
  })
})
.then(res => res.json())
.then(data => {
  console.log("AI Prediction:", data);

  const el = document.getElementById("ai-result");

el.innerText = data.decision;

// color
if (data.decision === "Safe") {
  el.style.color = "green";
} else if (data.decision === "Moderate") {
  el.style.color = "orange";
} else {
  el.style.color = "red";

  // 🚨 ALERT
  alert("⚠️ Water Quality is UNSAFE!");
}
})
.catch(err => console.error(err));

  // SENSOR UPDATE
  sensorData.ph.shift();
  sensorData.turb.shift();
  sensorData.tds.shift();
  sensorData.do_.shift();

  sensorData.ph.push(data.sensor.ph);
  sensorData.turb.push(data.sensor.turbidity);
  sensorData.tds.push(data.sensor.tds);
  sensorData.do_.push(data.sensor.do);

  initSensorChart();
  
  
 

  // KPI UPDATE
  document.getElementById('kpi-recovery').innerHTML =
    data.kpi.recovery + '<span class="kpi-unit">%</span>';

  document.getElementById('kpi-energy').innerHTML =
    data.kpi.energy + '<span class="kpi-unit">kWh/m³</span>';

  document.getElementById('kpi-quality').innerHTML =
    data.kpi.quality + '<span class="kpi-unit">%</span>';

  document.getElementById('kpi-flow').innerHTML =
    data.kpi.flow + '<span class="kpi-unit">m³/h</span>';

  document.getElementById('kpi-total').innerHTML =
    data.kpi.total + '<span class="kpi-unit">m³</span>';

  document.getElementById('kpi-conf').innerHTML =
    data.kpi.confidence + '<span class="kpi-unit">%</span>';

  // DASH PANEL
  const pump = Math.round(60 + data.kpi.recovery/3);
  document.getElementById('dash-pump').textContent = pump+'%';
  document.getElementById('dash-chem').textContent = data.control.chem+' mg/L';
  document.getElementById('dash-filter').textContent = '0.8 m/h';
  document.getElementById('dash-uv').textContent = data.control.uv+'%';
});

// ============================================================
//   PERFORMANCE CHART
// ============================================================
const perfHours = Array.from({length:24},(_,i)=>i);
const perfRecovery = perfHours.map(h => rnd(82,92));
const perfEnergy = perfHours.map(h => rnd(2.1,2.8));

function initPerfChart() {
  const canvas = document.getElementById('perfChart');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W=rect.width||900, H=150;
  const ctx = setupHiDPI(canvas,W,H);
  const pad={t:10,b:25,l:40,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;

  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='rgba(13,58,80,0.8)';
  ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+cH*i/4;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();
  }

  function drawFilled(data, color, min, max) {
    const n=data.length;
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([]);
    const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
    grad.addColorStop(0,color+'44');
    grad.addColorStop(1,color+'00');
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x=pad.l+cW*i/(n-1);
      const y=pad.t+cH-cH*(v-min)/(max-min);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.lineTo(pad.l+cW,pad.t+cH);ctx.lineTo(pad.l,pad.t+cH);
    ctx.fillStyle=grad;ctx.fill();
  }

  drawFilled(perfRecovery,'#00e5ff',70,100);
  drawFilled(perfEnergy.map(v=>v*30),'#ffb830',60,90);

  ctx.fillStyle='#3a5a70';ctx.font='9px Share Tech Mono';ctx.textAlign='center';
  for(let i=0;i<24;i+=4){
    ctx.fillText(i+'h',pad.l+cW*i/23,H-6);
  }
  ctx.textAlign='right';ctx.fillStyle='#00e5ff';
  ctx.fillText('90%',pad.l-4,pad.t+8);
  ctx.fillText('80%',pad.l-4,pad.t+cH/2);
}

// ============================================================
//   KPI LIVE UPDATES
// ============================================================
let kpiState = {recovery:87.4, energy:2.34, quality:98.7, flow:124.6, total:2847, conf:94.2};

function updateKPIs() {
  kpiState.recovery = Math.min(99, Math.max(75, kpiState.recovery + rnd(-0.3,0.3)));
  kpiState.energy = Math.min(3.5, Math.max(1.8, kpiState.energy + rnd(-0.05,0.05)));
  kpiState.quality = Math.min(99.9, Math.max(92, kpiState.quality + rnd(-0.1,0.1)));
  kpiState.flow = Math.min(200, Math.max(80, kpiState.flow + rnd(-2,2)));
  kpiState.total += rnd(0.02,0.06);
  kpiState.conf = Math.min(99, Math.max(88, kpiState.conf + rnd(-0.2,0.2)));

  document.getElementById('kpi-recovery').innerHTML = kpiState.recovery.toFixed(1)+'<span class="kpi-unit">%</span>';
  document.getElementById('kpi-energy').innerHTML = kpiState.energy.toFixed(2)+'<span class="kpi-unit">kWh/m³</span>';
  document.getElementById('kpi-quality').innerHTML = kpiState.quality.toFixed(1)+'<span class="kpi-unit">%</span>';
  document.getElementById('kpi-flow').innerHTML = kpiState.flow.toFixed(1)+'<span class="kpi-unit">m³/h</span>';
  document.getElementById('kpi-total').innerHTML = Math.floor(kpiState.total).toLocaleString()+'<span class="kpi-unit">m³</span>';
  document.getElementById('kpi-conf').innerHTML = kpiState.conf.toFixed(1)+'<span class="kpi-unit">%</span>';

  // Update dashboard fuzzy outputs
  const pump = Math.round(60+kpiState.recovery/3);
  document.getElementById('dash-pump').textContent = pump+'%';
  document.getElementById('dash-chem').textContent = rnd(14,22).toFixed(0)+' mg/L';
  document.getElementById('dash-filter').textContent = rnd(0.6,1.0).toFixed(1)+' m/h';
  document.getElementById('dash-uv').textContent = rnd(80,95).toFixed(0)+'%';
}

// ============================================================
//   ANN VISUALIZATION
// ============================================================
function drawANN() {
  const canvas = document.getElementById('annCanvas');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width||480, H=260;
  const ctx = setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);

  const layers = [
    {n:8, label:'INPUT', x:0.08, color:'#1a7fbf', names:['pH','Turb.','TDS','DO','Temp','Flow','Cond.','BOD']},
    {n:12, label:'HIDDEN 1', x:0.35, color:'#00e5ff'},
    {n:12, label:'HIDDEN 2', x:0.62, color:'#00c4a7'},
    {n:4, label:'OUTPUT', x:0.90, color:'#00e396', names:['Pump\nSpd','Chem\nDose','UV\nInt.','Filter\nRate']}
  ];

  const activations = [
    Array.from({length:8},()=>Math.random()),
    Array.from({length:12},()=>Math.random()),
    Array.from({length:12},()=>Math.random()),
    Array.from({length:4},()=>Math.random())
  ];

  // Draw connections (sample)
  for(let li=0; li<layers.length-1; li++) {
    const l0=layers[li], l1=layers[li+1];
    const n0=Math.min(l0.n,6), n1=Math.min(l1.n,6);
    for(let i=0;i<n0;i++) {
      for(let j=0;j<n1;j++) {
        const x0 = l0.x*W, y0 = H*0.12+i*(H*0.76/(n0-1||1));
        const x1 = l1.x*W, y1 = H*0.12+j*(H*0.76/(n1-1||1));
        const w = Math.random();
        const alpha = 0.05 + 0.25*Math.abs(w-0.5);
        ctx.strokeStyle = w>0.5 ? `rgba(0,229,255,${alpha})` : `rgba(255,69,96,${alpha})`;
        ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
      }
    }
  }

  // Draw neurons
  layers.forEach((layer, li) => {
    const cx = layer.x * W;
    const total = layer.n;
    for(let i=0; i<total; i++) {
      const cy = H*0.12 + i*(H*0.76/(total-1||1));
      const act = activations[li][i];
      const alpha = 0.3 + 0.7*act;

      // Glow
      const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,12);
      grd.addColorStop(0, layer.color+(Math.round(alpha*255).toString(16).padStart(2,'0')));
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx,cy,12,0,Math.PI*2); ctx.fill();

      // Circle
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = `rgba(7,21,32,0.8)`;
      ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2);
      ctx.fill(); ctx.stroke();

      // Label for first/last
      if(layer.names && layer.names[i]) {
        ctx.fillStyle = '#3a5a70';
        ctx.font = '7px Share Tech Mono';
        ctx.textAlign = li===0 ? 'right' : 'left';
        const offX = li===0 ? -10 : 10;
        ctx.fillText(layer.names[i], cx+offX, cy+3);
      }
    }

    // Layer label
    ctx.fillStyle = layer.color;
    ctx.font = '8px Orbitron,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(layer.label, cx, H-4);
  });
}

// ============================================================
//   ANN TRAINING SIMULATION
// ============================================================
let trainEpoch = 847, trainMSE = 0.00312, trainR2 = 0.9814;
let trainInterval = null;

function simulateTrain() {
  if(trainInterval) { clearInterval(trainInterval); trainInterval=null; return; }
  trainInterval = setInterval(()=>{
    if(trainEpoch>=1000) { clearInterval(trainInterval); trainInterval=null; return; }
    trainEpoch++;
    trainMSE = Math.max(0.0001, trainMSE*0.995);
    trainR2 = Math.min(0.9999, trainR2+0.00005);
    document.getElementById('epochNum').textContent = trainEpoch+' / 1000';
    document.getElementById('epochBar').style.width = trainEpoch/10+'%';
    document.getElementById('mseVal').textContent = trainMSE.toFixed(5);
    document.getElementById('r2Val').textContent = trainR2.toFixed(4);
    initTrainChart();
  }, 80);
}

function resetANN() {
  trainEpoch=0; trainMSE=0.1; trainR2=0.45;
  document.getElementById('epochNum').textContent='0 / 1000';
  document.getElementById('epochBar').style.width='0%';
  document.getElementById('mseVal').textContent='0.10000';
  document.getElementById('r2Val').textContent='0.4500';
}

// ============================================================
//   TRAINING LOSS CHART
// ============================================================
function initTrainChart() {
  const canvas = document.getElementById('trainChart');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W=rect.width||400, H=160;
  const ctx = setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);
  const pad={t:10,b:25,l:40,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;

  // Generate loss curve
  const pts = [];
  let mse=0.12;
  for(let e=0;e<=trainEpoch;e+=Math.ceil(trainEpoch/80)){
    mse *= 0.97;
    pts.push(Math.max(0.0001,mse+rnd(-0.002,0.002)));
  }

  ctx.strokeStyle='rgba(13,58,80,0.8)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+cH*i/4;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();
  }

  const maxMSE=0.12,minMSE=0;
  ctx.strokeStyle='#00e5ff';ctx.lineWidth=2;ctx.setLineDash([]);
  ctx.beginPath();
  pts.forEach((v,i)=>{
    const x=pad.l+cW*i/(pts.length-1||1);
    const y=pad.t+cH-cH*(v-minMSE)/(maxMSE-minMSE);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();

  ctx.fillStyle='#3a5a70';ctx.font='9px Share Tech Mono';
  ctx.textAlign='center';
  ctx.fillText('Epoch '+trainEpoch,pad.l+cW/2,H-6);
  ctx.textAlign='right';
  ctx.fillText('MSE',pad.l-4,pad.t+8);
}

// ============================================================
//   ANN PREDICTION CHART
// ============================================================
function initPredChart() {
  const canvas = document.getElementById('predChart');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W=rect.width||600, H=200;
  const ctx=setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);
  const pad={t:10,b:25,l:40,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const n=40;
  const actual = Array.from({length:n},()=>rnd(80,95));
  const pred = actual.map(v=>v+rnd(-2,2));
  const actQ = Array.from({length:n},()=>rnd(94,99.5));
  const predQ = actQ.map(v=>v+rnd(-1,1));

  ctx.strokeStyle='rgba(13,58,80,0.8)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.t+cH*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();}

  function drawSeries(data,color,min,max,dash){
    ctx.strokeStyle=color;ctx.lineWidth=1.8;
    if(dash)ctx.setLineDash([5,3]);else ctx.setLineDash([]);
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x=pad.l+cW*i/(n-1);
      const y=pad.t+cH-cH*(v-min)/(max-min);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();ctx.setLineDash([]);
  }
  drawSeries(pred,'#00e5ff',70,100);
  drawSeries(actual,'#ff4560',70,100,true);
  drawSeries(predQ.map(v=>(v-94)*3.5+72),'#00c4a7',70,100);
  drawSeries(actQ.map(v=>(v-94)*3.5+70),'#ffb830',70,100,true);
}

// ============================================================
//   ANN INPUTS/OUTPUTS PANEL
// ============================================================
function initANNPanels() {
  const features = [
    {name:'pH',val:rnd(6.8,7.5),unit:''},
    {name:'Turbidity',val:rnd(5,20),unit:' NTU'},
    {name:'TDS',val:rnd(200,500),unit:' mg/L'},
    {name:'DO',val:rnd(5,9),unit:' mg/L'},
    {name:'Temperature',val:rnd(18,28),unit:'°C'},
    {name:'Flow Rate',val:rnd(100,150),unit:' m³/h'},
    {name:'Conductivity',val:rnd(300,700),unit:' μS/cm'},
    {name:'BOD',val:rnd(2,8),unit:' mg/L'}
  ];
  const cont = document.getElementById('inputFeatures');
  if(!cont) return;
  cont.innerHTML = features.map(f=>`
    <div class="param-item">
      <span class="param-name">${f.name}</span>
      <span class="param-value">${f.val}${f.unit}</span>
    </div>
  `).join('');

  const outputs = [
    {name:'Recovery Rate',val:kpiState.recovery.toFixed(1)+'%',color:'#00e5ff'},
    {name:'Water Quality',val:kpiState.quality.toFixed(1)+'%',color:'#00e396'},
    {name:'Chem. Dosage',val:rnd(15,22).toFixed(0)+' mg/L',color:'#ffb830'},
    {name:'Energy Est.',val:kpiState.energy.toFixed(2)+' kWh/m³',color:'#00c4a7'}
  ];
  const oc = document.getElementById('ann-outputs');
  if(!oc) return;
  oc.innerHTML = outputs.map(o=>`
    <div class="param-item">
      <span class="param-name">${o.name}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${o.color};">${o.val}</span>
    </div>
  `).join('');
}

// ============================================================
//   FUZZY LOGIC
// ============================================================
function tri(x, a, b, c) {
  if(x<=a||x>=c) return 0;
  if(x<=b) return (x-a)/(b-a);
  return (c-x)/(c-b);
}

function trap(x, a, b, c, d) {
  if(x<=a||x>=d) return 0;
  if(x>=b&&x<=c) return 1;
  if(x<b) return (x-a)/(b-a);
  return (d-x)/(d-c);
}

function getFuzzyPH(ph) {
  return {
    acidic: trap(ph,0,0,5,7),
    neutral: tri(ph,5.5,7,8.5),
    alkaline: trap(ph,7.5,9,14,14)
  };
}

function getFuzzyTurb(t) {
  return {
    low: trap(t,0,0,5,15),
    medium: tri(t,5,20,50),
    high: trap(t,30,60,200,200)
  };
}

function getFuzzyTDS(tds) {
  return {
    low: trap(tds,0,0,100,400),
    medium: tri(tds,200,600,1000),
    high: trap(tds,800,1200,2000,2000)
  };
}

function getFuzzyDO(dox) {
  return {
    low: trap(dox,0,0,3,5),
    medium: tri(dox,3,6,9),
    high: trap(dox,7,10,14,14)
  };
}

function inferPumpSpeed(phF, turbF, tdsF) {
  let rules=[
    {w:Math.min(phF.neutral, turbF.low), output:40},
    {w:Math.min(phF.neutral, turbF.medium), output:60},
    {w:Math.min(phF.neutral, turbF.high), output:85},
    {w:Math.min(phF.acidic, turbF.low), output:55},
    {w:Math.min(phF.acidic, turbF.high), output:90},
    {w:Math.min(phF.alkaline, turbF.medium), output:70},
    {w:Math.min(turbF.high, tdsF.high), output:95},
    {w:Math.min(turbF.low, tdsF.low), output:35},
    {w:Math.min(phF.neutral, tdsF.medium), output:65},
  ];
  const num=rules.reduce((a,r)=>a+r.w*r.output,0);
  const den=rules.reduce((a,r)=>a+r.w,0);
  return den>0?num/den:50;
}

function inferChemDose(turbF, tdsF, phF) {
  let rules=[
    {w:Math.min(turbF.low, tdsF.low), output:8},
    {w:Math.min(turbF.low, tdsF.medium), output:14},
    {w:Math.min(turbF.medium, tdsF.medium), output:18},
    {w:Math.min(turbF.high, tdsF.high), output:35},
    {w:Math.min(turbF.high, phF.acidic), output:30},
    {w:Math.min(turbF.medium, phF.alkaline), output:22},
    {w:Math.min(tdsF.high, phF.neutral), output:28},
    {w:turbF.low*0.8, output:10},
    {w:tdsF.low*0.5, output:6},
  ];
  const num=rules.reduce((a,r)=>a+r.w*r.output,0);
  const den=rules.reduce((a,r)=>a+r.w,0);
  return den>0?num/den:15;
}

function inferUV(turbF, doF) {
  let rules=[
    {w:Math.min(turbF.low, doF.high), output:65},
    {w:Math.min(turbF.medium, doF.medium), output:80},
    {w:Math.min(turbF.high, doF.low), output:98},
    {w:turbF.low*0.7, output:60},
    {w:turbF.high*0.9, output:95},
    {w:doF.low*0.8, output:90},
  ];
  const num=rules.reduce((a,r)=>a+r.w*r.output,0);
  const den=rules.reduce((a,r)=>a+r.w,0);
  return den>0?num/den:80;
}

function updateFuzzy() {
  const ph = +document.getElementById('sl-ph').value/10;
  const turb = +document.getElementById('sl-turb').value;
  const tds = +document.getElementById('sl-tds').value;
  const dox = +document.getElementById('sl-do').value/10;
  const temp = +document.getElementById('sl-temp').value/10;
  const flow = +document.getElementById('sl-flow').value;

  document.getElementById('fv-ph').textContent = ph.toFixed(1);
  document.getElementById('fv-turb').textContent = turb;
  document.getElementById('fv-tds').textContent = tds;
  document.getElementById('fv-do').textContent = dox.toFixed(1);
  document.getElementById('fv-temp').textContent = temp.toFixed(1);
  document.getElementById('fv-flow').textContent = flow;

  const phF = getFuzzyPH(ph);
  const turbF = getFuzzyTurb(turb);
  const tdsF = getFuzzyTDS(tds);
  const doF = getFuzzyDO(dox);

  const pump = inferPumpSpeed(phF, turbF, tdsF);
  const chem = inferChemDose(turbF, tdsF, phF);
  const uv = inferUV(turbF, doF);

  document.getElementById('fo-pump').innerHTML = Math.round(pump)+'<span style="font-size:14px">%</span>';
  document.getElementById('fo-chem').innerHTML = chem.toFixed(1)+'<span style="font-size:14px"> mg/L</span>';
  document.getElementById('fo-uv').innerHTML = Math.round(uv)+'<span style="font-size:14px">%</span>';

  // Membership display
  const md = document.getElementById('membershipDisplay');
  if(md) {
    const vars=[
      {name:'pH Level', vals:phF, labels:['Acidic','Neutral','Alkaline'], colors:['low','med','high']},
      {name:'Turbidity', vals:turbF, labels:['Low','Medium','High'], colors:['low','med','high']},
      {name:'TDS', vals:tdsF, labels:['Low','Medium','High'], colors:['low','med','high']},
      {name:'DO', vals:doF, labels:['Low','Medium','High'], colors:['low','med','high']},
    ];
    md.innerHTML = vars.map(v=>`
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;color:var(--accent-cyan);letter-spacing:1px;margin-bottom:5px;font-family:'Share Tech Mono',monospace;">${v.name}</div>
        ${Object.values(v.vals).map((val,i)=>`
          <div class="mb-row">
            <div class="mb-label">${v.labels[i]}</div>
            <div class="mb-bar-bg">
              <div class="mb-bar-fill ${v.colors[i]}" style="width:${(val*100).toFixed(1)}%"></div>
            </div>
            <div class="mb-percent">${(val*100).toFixed(0)}%</div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Recommendation
  const rec = document.getElementById('fuzzyRecommendation');
  if(rec) {
    let msgs=[];
    if(turb>50) msgs.push('⚠ High turbidity detected — increase coagulant dosage and extend flocculation time.');
    if(ph<6.5||ph>8.5) msgs.push('⚠ pH out of optimal range — activate pH correction dosing.');
    if(tds>800) msgs.push('⚠ Elevated TDS — consider additional filtration stage or reverse osmosis.');
    if(dox<4) msgs.push('⚠ Low dissolved oxygen — increase aeration rate.');
    if(msgs.length===0) msgs.push('✓ All parameters within acceptable range. System operating optimally.');
    msgs.push(`🤖 ANN recommends pump speed: ${Math.round(pump)}%, chemical dose: ${chem.toFixed(1)} mg/L, UV intensity: ${Math.round(uv)}%.`);
    rec.innerHTML = msgs.join('<br>');
  }

  // Update fuzzy chart
  drawFuzzyChart(turbF);
}

function drawFuzzyChart(turbF) {
  const canvas = document.getElementById('fuzzyChart');
  if(!canvas) return;
  const rect=canvas.parentElement.getBoundingClientRect();
  const W=rect.width||400, H=200;
  const ctx=setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);
  const pad={t:15,b:30,l:10,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;

  // Draw membership functions for turbidity
  const colors=['#1a7fbf','#00c4a7','#ff4560'];
  const sets=[
    x=>trap(x,0,0,5,15),
    x=>tri(x,5,20,50),
    x=>trap(x,30,60,200,200)
  ];
  const labels=['Low','Medium','High'];

  for(let si=0;si<3;si++){
    ctx.strokeStyle=colors[si]; ctx.lineWidth=1.5;
    ctx.beginPath();
    for(let px=0;px<=cW;px++){
      const x=(px/cW)*200;
      const y=pad.t+cH-cH*sets[si](x);
      px===0?ctx.moveTo(pad.l+px,y):ctx.lineTo(pad.l+px,y);
    }
    ctx.stroke();
    ctx.fillStyle=colors[si]+'22';
    ctx.lineTo(pad.l+cW,pad.t+cH); ctx.lineTo(pad.l,pad.t+cH);
    ctx.fill();
  }

  // X axis
  ctx.fillStyle='#3a5a70';ctx.font='9px Share Tech Mono';ctx.textAlign='center';
  for(let i=0;i<=4;i++){
    const x=pad.l+cW*i/4;
    ctx.fillText(Math.round(i*50)+' NTU',x,H-8);
  }
  // Y axis label
  ctx.save();ctx.rotate(-Math.PI/2);
  ctx.fillText('μ(x)',-(pad.t+cH/2),10);ctx.restore();

  ctx.fillStyle='#3a5a70';ctx.font='9px Share Tech Mono';ctx.textAlign='left';
  colors.forEach((c,i)=>{
    ctx.fillStyle=c;
    ctx.fillText(labels[i],pad.l+10+i*60,pad.t+12);
  });
}

// ============================================================
//   FUZZY RULES TABLE
// ============================================================
const fuzzyRules = [
  {ph:'Neutral',turb:'Low',tds:'Low',do:'High',pump:'Low (35%)',chem:'Low (8mg/L)',w:0.92},
  {ph:'Neutral',turb:'Medium',tds:'Medium',do:'Medium',pump:'Medium (60%)',chem:'Medium (18mg/L)',w:0.87},
  {ph:'Neutral',turb:'High',tds:'High',do:'Low',pump:'High (90%)',chem:'High (35mg/L)',w:0.78},
  {ph:'Acidic',turb:'High',tds:'High',do:'Low',pump:'High (95%)',chem:'High (30mg/L)',w:0.65},
  {ph:'Alkaline',turb:'Medium',tds:'Medium',do:'Medium',pump:'Medium (70%)',chem:'Medium (22mg/L)',w:0.70},
  {ph:'Acidic',turb:'Low',tds:'Low',do:'High',pump:'Medium (55%)',chem:'Low (10mg/L)',w:0.83},
  {ph:'Neutral',turb:'Low',tds:'High',do:'Medium',pump:'Medium (65%)',chem:'High (28mg/L)',w:0.74},
  {ph:'Alkaline',turb:'Low',tds:'Low',do:'High',pump:'Low (40%)',chem:'Low (8mg/L)',w:0.88},
];

function initFuzzyRules() {
  const tbody = document.getElementById('fuzzyRulesTable');
  if(!tbody) return;
  tbody.innerHTML = fuzzyRules.map((r,i)=>`
    <tr>
      <td style="color:var(--text-dim)">${i+1}</td>
      <td>${r.ph}</td><td>${r.turb}</td><td>${r.tds}</td><td>${r.do}</td>
      <td style="color:var(--accent-cyan)">${r.pump}</td>
      <td style="color:var(--accent-teal)">${r.chem}</td>
      <td><span class="badge ${r.w>0.85?'ok':r.w>0.7?'warn':'bad'}">${(r.w*100).toFixed(0)}%</span></td>
    </tr>
  `).join('');
}

// ============================================================
//   PROCESS FLOW NODE INFO
// ============================================================
const nodeInfo = {
  source:{title:'Raw Water Source',text:`Raw water is extracted from surface water bodies (rivers, lakes, reservoirs) or groundwater. 
    Typical contaminants include sediments, organic matter, pathogens, heavy metals, and agricultural runoff. 
    ANN continuously monitors source quality through upstream sensors (pH, turbidity, TDS, DO, temperature, conductivity). 
    Fuzzy logic pre-classifies water quality level to prepare optimal treatment parameters.`},
  screening:{title:'Screening & Intake Station',text:`Bar screens and fine screens remove large debris (leaves, sticks, fish). 
    Micro-screens (0.5–3mm) remove fine particulates. 
    ANN inputs: flow rate, screen differential pressure, debris load index. 
    Fuzzy controller adjusts: screen rotation speed, backwash frequency (every 15–120 min based on load).`},
  coagulation:{title:'Coagulation & Flocculation',text:`Aluminum sulfate (alum) or ferric chloride is added to destabilize colloidal particles. 
    Rapid mixing (G=1000 s⁻¹) followed by slow stirring (G=20–80 s⁻¹) forms floc. 
    ANN optimizes chemical dosage based on: turbidity, pH, zeta potential, temperature. 
    Fuzzy rules: IF turbidity HIGH AND pH NEUTRAL THEN alum dose = HIGH (25–35 mg/L).`},
  sedimentation:{title:'Sedimentation & Clarifier',text:`Gravity settling removes floc particles. Typical hydraulic retention time: 2–4 hours. 
    Sludge blanket level monitored by ultrasonic sensors. 
    ANN predicts optimal sludge withdrawal timing. 
    Fuzzy controller manages sludge pump speed and weir overflow rate to maintain optimal clarifier efficiency.`},
  filtration:{title:'Sand & Membrane Filtration',text:`Dual-media filtration (anthracite + sand) removes residual turbidity. 
    Membrane ultrafiltration (0.01–0.1 μm) provides absolute barrier to pathogens. 
    ANN monitors: differential pressure, filtered water turbidity, run length. 
    Fuzzy control: backwash trigger (pressure drop >0.5 bar OR turbidity breakthrough), backwash rate and duration.`},
  ann:{title:'ANN + Fuzzy Logic Controller',text:`Central intelligence hub combining:
    • Artificial Neural Network (MLP, 8-12-12-4): Trained on 50,000+ historical treatment records. Predicts optimal parameters in real-time.
    • Fuzzy Mamdani Inference System: 27 rules covering pH × turbidity × TDS combinations. Provides interpretable, human-readable control logic.
    • Hybrid approach: ANN provides fine-grained numeric predictions; Fuzzy logic provides robust boundary decisions.
    Integration reduces chemical usage by 15–30% and energy consumption by 12–20%.`},
  disinfection:{title:'UV & Chlorine Disinfection',text:`UV irradiation (254nm, 40 mJ/cm²) inactivates Cryptosporidium and Giardia. 
    Chlorine dosing maintains 0.2–0.5 mg/L residual for distribution network protection. 
    ANN inputs: UV transmittance, flow rate, pathogen load index, contact time. 
    Fuzzy controller adjusts: UV lamp intensity (40–120%), chlorine dosing (0.3–2.0 mg/L), contact time.`},
  output:{title:'Clean Water Storage & Distribution',text:`Treated water stored in covered clear water reservoirs. 
    Continuous quality monitoring: turbidity (<0.1 NTU), pH (6.5–8.5), chlorine residual (0.2–0.5 mg/L), TDS (<500 mg/L). 
    ANN provides quality confidence score (0–100%). 
    Fuzzy logic triggers automatic divert valve if any parameter exceeds WHO thresholds, routing water back for re-treatment.`}
};

function showNodeInfo(node) {
  const info = nodeInfo[node];
  const panel = document.getElementById('nodeInfoPanel');
  document.getElementById('nodeInfoTitle').textContent = info.title;
  document.getElementById('nodeInfoContent').innerHTML = info.text.replace(/\n/g,'<br>');
  panel.style.display='block';
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ============================================================
//   STAGE QUALITY CHART
// ============================================================
function initStageChart() {
  const canvas = document.getElementById('stageChart');
  if(!canvas) return;
  const rect=canvas.parentElement.getBoundingClientRect();
  const W=rect.width||400, H=200;
  const ctx=setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);
  const pad={t:20,b:40,l:40,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;

  const stages=['Intake','Post-Coag.','Post-Sed.','Post-Filt.','UV-Treat.','Output'];
  const turbidity=[85,35,18,3,2,0.5];
  const quality=[15,40,62,88,96,99];

  ctx.strokeStyle='rgba(13,58,80,0.8)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.t+cH*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();}

  const n=stages.length;
  function drawBars(data,color,min,max,offset){
    data.forEach((v,i)=>{
      const x=pad.l+cW*i/(n-1)+offset;
      const bH=cH*(v-min)/(max-min);
      const y=pad.t+cH-bH;
      const grad=ctx.createLinearGradient(0,y,0,y+bH);
      grad.addColorStop(0,color+'cc');
      grad.addColorStop(1,color+'33');
      ctx.fillStyle=grad;
      ctx.fillRect(x,y,18,bH);
    });
  }
  drawBars(turbidity,'#ff4560',0,100,-10);
  drawBars(quality,'#00e396',0,100,10);

  ctx.fillStyle='#3a5a70';ctx.font='8px Share Tech Mono';ctx.textAlign='center';
  stages.forEach((s,i)=>{
    const x=pad.l+cW*i/(n-1);
    ctx.fillText(s,x,H-8);
  });
  ctx.fillStyle='#ff4560';ctx.fillRect(pad.l,10,10,8);
  ctx.fillStyle='#3a5a70';ctx.textAlign='left';ctx.fillText('Turbidity',pad.l+14,18);
  ctx.fillStyle='#00e396';ctx.fillRect(pad.l+80,10,10,8);
  ctx.fillStyle='#3a5a70';ctx.fillText('Quality',pad.l+94,18);
}

// ============================================================
//   WATER QUALITY TABLE
// ============================================================
function initQualityTable() {
  const tbody = document.getElementById('qualityTable');
  if(!tbody) return;
  const params=[
    {name:'pH',inlet:rnd(6.0,8.5,1),postCoag:rnd(6.5,7.5,1),postFilt:rnd(6.8,7.4,1),outlet:rnd(7.0,7.3,1),limit:'6.5–8.5',unit:''},
    {name:'Turbidity',inlet:rnd(30,120,1),postCoag:rnd(10,40,1),postFilt:rnd(0.5,2,2),outlet:rnd(0.05,0.15,2),limit:'0.3 NTU',unit:' NTU'},
    {name:'TDS',inlet:rnd(300,800,0),postCoag:rnd(250,600,0),postFilt:rnd(200,400,0),outlet:rnd(150,300,0),limit:'500 mg/L',unit:' mg/L'},
    {name:'Dissolved O₂',inlet:rnd(5,8,1),postCoag:rnd(5,8,1),postFilt:rnd(6,9,1),outlet:rnd(7,9,1),limit:'>5 mg/L',unit:' mg/L'},
    {name:'Chlorine',inlet:0,postCoag:0,postFilt:rnd(0.3,0.8,2),outlet:rnd(0.2,0.5,2),limit:'0.2–0.5 mg/L',unit:' mg/L'},
    {name:'Coliform',inlet:rnd(500,2000,0),postCoag:rnd(100,500,0),postFilt:rnd(1,20,0),outlet:0,limit:'0 CFU/100mL',unit:' CFU/100mL'},
    {name:'Temperature',inlet:rnd(18,28,1),postCoag:rnd(18,27,1),postFilt:rnd(18,26,1),outlet:rnd(18,25,1),limit:'<25°C',unit:'°C'},
  ];

  tbody.innerHTML = params.map(p=>{
    const okOut = p.name==='Coliform'?p.outlet===0:true;
    return `<tr>
      <td style="color:var(--text-primary)">${p.name}</td>
      <td>${p.inlet}${p.unit}</td>
      <td>${p.postCoag}${p.unit}</td>
      <td>${p.postFilt}${p.unit}</td>
      <td style="color:var(--accent-ok)">${p.outlet}${p.unit}</td>
      <td style="color:var(--text-dim)">${p.limit}</td>
      <td><span class="badge ${okOut?'ok':'warn'}">${okOut?'PASS':'CHECK'}</span></td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent-cyan)">${okOut?'✓ Normal':'⚠ Monitor'}</td>
    </tr>`;
  }).join('');
}

function initComplianceGrid() {
  const cont = document.getElementById('complianceGrid');
  if(!cont) return;
  const items=[
    {name:'pH Compliance',val:'100%',ok:true},
    {name:'Turbidity',val:'99.8%',ok:true},
    {name:'TDS',val:'100%',ok:true},
    {name:'Microbiological',val:'100%',ok:true},
    {name:'Chemical',val:'98.5%',ok:true},
    {name:'Disinfection',val:'100%',ok:true},
    {name:'Temperature',val:'99.2%',ok:true},
    {name:'Overall WHO',val:'99.6%',ok:true},
  ];
  cont.innerHTML = items.map(it=>`
    <div class="param-item">
      <span class="param-name">${it.name}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${it.ok?'var(--accent-ok)':'var(--accent-warn)'};">${it.val}</span>
    </div>
  `).join('');
}

function initHistChart() {
  const canvas = document.getElementById('histChart');
  if(!canvas) return;
  const rect=canvas.parentElement.getBoundingClientRect();
  const W=rect.width||400, H=180;
  const ctx=setupHiDPI(canvas,W,H);
  ctx.clearRect(0,0,W,H);
  const pad={t:10,b:25,l:40,r:10};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const rec=days.map(()=>rnd(84,92));
  const qual=days.map(()=>rnd(96,99.5));

  ctx.strokeStyle='rgba(13,58,80,0.8)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.t+cH*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();}

  function drawL(data,color,min,max){
    ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x=pad.l+cW*i/(data.length-1);
      const y=pad.t+cH-cH*(v-min)/(max-min);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
    data.forEach((v,i)=>{
      const x=pad.l+cW*i/(data.length-1);
      const y=pad.t+cH-cH*(v-min)/(max-min);
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    });
  }
  drawL(rec,'#00e5ff',70,100);
  drawL(qual,'#00e396',90,102);
  ctx.fillStyle='#3a5a70';ctx.font='9px Share Tech Mono';ctx.textAlign='center';
  days.forEach((d,i)=>{
    ctx.fillText(d,pad.l+cW*i/(days.length-1),H-6);
  });
}

// ============================================================
//   ALERTS
// ============================================================
const alertsData = [
  {type:'ok',icon:'✅',text:'Turbidity post-filtration: 0.08 NTU — within WHO limits.',time:'09:42'},
  {type:'warn',icon:'⚠️',text:'Coagulant feed pump pressure drop 15% — check valve V-03.',time:'09:38'},
  {type:'info',icon:'ℹ️',text:'ANN model re-training cycle initiated. Epoch 847/1000.',time:'09:31'},
  {type:'warn',icon:'⚠️',text:'Inlet turbidity spike: 95 NTU — increasing alum dosage to 28 mg/L.',time:'09:18'},
  {type:'ok',icon:'✅',text:'pH correction successful. Outlet pH: 7.2 (target: 7.0–7.5).',time:'09:05'},
  {type:'info',icon:'ℹ️',text:'UV lamp efficiency: 94.2% — routine maintenance due in 12 days.',time:'08:55'},
];

function initAlerts() {
  const list = document.getElementById('alertList');
  if(!list) return;
  list.innerHTML = alertsData.map(a=>`
    <div class="alert-item ${a.type}">
      <span class="alert-icon">${a.icon}</span>
      <span class="alert-text">${a.text}</span>
      <span class="alert-time">${a.time}</span>
    </div>
  `).join('');
  document.getElementById('alertCount').textContent = '('+alertsData.length+')';
}

function initHealth() {
  const cont = document.getElementById('healthDisplay');
  if(!cont) return;
  const items=[
    {name:'Coagulation Unit',pct:95,color:'#00e396'},
    {name:'Filtration System',pct:88,color:'#00c4a7'},
    {name:'UV Disinfection',pct:94,color:'#00e5ff'},
    {name:'Pump Station #1',pct:82,color:'#ffb830'},
    {name:'ANN Controller',pct:99,color:'#00e396'},
    {name:'SCADA Network',pct:100,color:'#00e396'},
  ];
  cont.innerHTML = items.map(it=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
        <span style="color:var(--text-secondary)">${it.name}</span>
        <span style="font-family:'Share Tech Mono',monospace;color:${it.color}">${it.pct}%</span>
      </div>
      <div class="train-bar-bg">
        <div style="height:100%;width:${it.pct}%;background:linear-gradient(90deg,${it.color}66,${it.color});border-radius:10px;transition:width 0.5s;"></div>
      </div>
    </div>
  `).join('');
}

function initEventLog() {
  const tbody = document.getElementById('eventLog');
  if(!tbody) return;
  const events=[
    {time:'09:42:15',event:'Quality check passed',src:'Outlet Monitor',sev:'info',action:'None'},
    {time:'09:38:04',event:'Pump pressure drop alert',src:'Pump P-03',sev:'warn',action:'Maintenance ticket'},
    {time:'09:31:22',event:'ANN retrain initiated',src:'AI Controller',sev:'info',action:'Auto-scheduled'},
    {time:'09:18:47',event:'Turbidity spike detected',src:'Inlet Sensor S-01',sev:'warn',action:'Dose increased'},
    {time:'09:05:11',event:'pH stabilized',src:'pH Controller',sev:'ok',action:'Auto-corrected'},
    {time:'08:55:33',event:'UV maintenance reminder',src:'UV System',sev:'info',action:'Logged'},
    {time:'08:30:00',event:'Daily calibration complete',src:'All Sensors',sev:'ok',action:'Logged'},
  ];
  tbody.innerHTML = events.map(e=>`<tr>
    <td>${e.time}</td>
    <td>${e.event}</td>
    <td style="color:var(--text-secondary)">${e.src}</td>
    <td><span class="badge ${e.sev==='ok'?'ok':e.sev==='warn'?'warn':'ok'}">${e.sev.toUpperCase()}</span></td>
    <td style="color:var(--text-dim)">${e.action}</td>
  </tr>`).join('');
}

// ============================================================
//   HYPERPARAMETER UPDATE
// ============================================================
function updateHyper(el, type) {
  const v = +el.value;
  if(type==='lr') document.getElementById('hp-lr').textContent = (v/10000).toFixed(4);
  if(type==='batch') document.getElementById('hp-batch').textContent = Math.round(v/3.2)*4||4;
  if(type==='drop') document.getElementById('hp-drop').textContent = (v/100).toFixed(2);
  if(type==='mom') document.getElementById('hp-mom').textContent = (v/100).toFixed(2);
}

// ============================================================
//   INITIALIZE ALL
// ============================================================
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    initSensorChart();
    initPerfChart();
    initTrainChart();
    initPredChart();
    initANNPanels();
    initFuzzyRules();
    updateFuzzy();
    initAlerts();
    initHealth();
    initEventLog();
    initQualityTable();
    initComplianceGrid();
  }, 100);
});

window.addEventListener('resize', ()=>{
  initSensorChart();
  initPerfChart();
  initPredChart();
  initTrainChart();
  const ann = document.getElementById('annCanvas');
  if(ann) drawANN();
});

// Live refresh of ANN panels
setInterval(()=>{
  initANNPanels();
}, 3000);

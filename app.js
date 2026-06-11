let practice = {
  strike: Array(20).fill(""),
  low: Array(15).fill(""),
  driver: Array(20).fill("")
};

let lastSummaries = [];

const COURSE_HOLES = [
  { key: "h2", hole: 2, par: 5, yds: 485 },
  { key: "h3", hole: 3, par: 4, yds: 337 },
  { key: "h5", hole: 5, par: 4, yds: 335 },
  { key: "h16", hole: 16, par: 3, yds: 144 }
];

function $(id){ return document.getElementById(id); }

function init(){
  $("practiceDate").valueAsDate = new Date();
  $("csvDate").valueAsDate = new Date();
  $("scriptUrl").value = localStorage.getItem("scriptUrl") || "";

  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

  $("saveUrlBtn").onclick = () => {
    localStorage.setItem("scriptUrl", $("scriptUrl").value.trim());
    setStatus("syncStatus","URL saved locally.","ok");
  };

  $("testSyncBtn").onclick = testSync;
  $("parseCsvBtn").onclick = parseCsvFromFile;
  $("saveSummariesBtn").onclick = saveSummaries;
  $("downloadSummaryBtn").onclick = downloadSummaryCsv;
  $("savePracticeBtn").onclick = savePractice;
  $("resetPracticeBtn").onclick = resetPractice;

  setupCourseSimListeners();
  renderPracticeButtons();
  updateCourseSimSummary();
  renderHistory();
}

function switchTab(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tabPanel").forEach(p => p.classList.toggle("active", p.id === tab));
}

function setStatus(id,msg,cls=""){
  const el=$(id);
  if(!el) return;
  el.className = "status " + cls;
  el.textContent = msg;
}

function renderPracticeButtons(){
  makeButtons("strikeButtons", "strike", 20, ["0","1","2"]);
  makeButtons("lowPointButtons", "low", 15, ["X","✓"]);
  makeButtons("driverButtons", "driver", 20, ["U","P"]);
  updatePracticeScores();
}

function makeButtons(containerId, key, count, cycle){
  const c=$(containerId);
  if(!c) return;

  c.innerHTML="";

  for(let i=0;i<count;i++){
    const b=document.createElement("button");
    b.className="shotBtn";
    b.textContent = `${i+1}: —`;

    b.onclick = () => {
      const current = practice[key][i];
      const idx = cycle.indexOf(current);
      practice[key][i] = cycle[(idx+1) % cycle.length];
      updatePracticeButtons();
    };

    c.appendChild(b);
  }
}

function updatePracticeButtons(){
  [
    ["strikeButtons","strike"],
    ["lowPointButtons","low"],
    ["driverButtons","driver"]
  ].forEach(([cid,key])=>{
    const container = $(cid);
    if(!container) return;

    [...container.children].forEach((b,i)=>{
      const val = practice[key][i] || "—";
      b.textContent = `${i+1}: ${val}`;
      b.className="shotBtn";

      if(["2","✓","P"].includes(val)) b.classList.add("done");
      if(["1"].includes(val)) b.classList.add("mid");
      if(["0","X","U"].includes(val)) b.classList.add("bad");
    });
  });

  updatePracticeScores();
}

function updatePracticeScores(){
  const strike = practice.strike.reduce((s,v)=>s+(parseInt(v)||0),0);
  const low = practice.low.filter(v=>v==="✓").length;
  const driver = practice.driver.filter(v=>v==="P").length;

  $("strikeScore").textContent = `${strike} / 40`;
  $("lowPointScore").textContent = `${low} / 15 clean`;
  $("driverScore").textContent = `${driver} / 20 playable`;
}

function setupCourseSimListeners(){
  COURSE_HOLES.forEach(h => {
    [
      `${h.key}Score`,
      `${h.key}Tee`,
      `${h.key}Dir`,
      `${h.key}G`,
      `${h.key}Rec`,
      `${h.key}Pen`,
      `${h.key}ThreePutt`,
      `${h.key}BD`,
      `${h.key}HO`
    ].forEach(id => {
      const el = $(id);
      if(el) el.addEventListener("change", updateCourseSimSummary);
      if(el) el.addEventListener("input", updateCourseSimSummary);
    });
  });
}

function getCourseSimData(){
  const totalPar = 16;

  const data = {
    kind: "courseSim",
    date: $("practiceDate").value,
    location: $("practiceLocation").value,

    h2Score: $("h2Score")?.value || "",
    h2Tee: $("h2Tee")?.value || "",
    h2Dir: $("h2Dir")?.value || "",
    h2G: $("h2G")?.checked ? "Y" : "",
    h2Rec: $("h2Rec")?.checked ? "Y" : "",
    h2Pen: $("h2Pen")?.checked ? "Y" : "",
    h2ThreePutt: $("h2ThreePutt")?.checked ? "Y" : "",
    h2BD: $("h2BD")?.checked ? "Y" : "",
    h2HO: $("h2HO")?.checked ? "Y" : "",

    h3Score: $("h3Score")?.value || "",
    h3Tee: $("h3Tee")?.value || "",
    h3Dir: $("h3Dir")?.value || "",
    h3G: $("h3G")?.checked ? "Y" : "",
    h3Rec: $("h3Rec")?.checked ? "Y" : "",
    h3Pen: $("h3Pen")?.checked ? "Y" : "",
    h3ThreePutt: $("h3ThreePutt")?.checked ? "Y" : "",
    h3BD: $("h3BD")?.checked ? "Y" : "",
    h3HO: $("h3HO")?.checked ? "Y" : "",

    h5Score: $("h5Score")?.value || "",
    h5Tee: $("h5Tee")?.value || "",
    h5Dir: $("h5Dir")?.value || "",
    h5G: $("h5G")?.checked ? "Y" : "",
    h5Rec: $("h5Rec")?.checked ? "Y" : "",
    h5Pen: $("h5Pen")?.checked ? "Y" : "",
    h5ThreePutt: $("h5ThreePutt")?.checked ? "Y" : "",
    h5BD: $("h5BD")?.checked ? "Y" : "",
    h5HO: $("h5HO")?.checked ? "Y" : "",

    h16Score: $("h16Score")?.value || "",
    h16Tee: $("h16Tee")?.value || "",
    h16Dir: $("h16Dir")?.value || "",
    h16G: $("h16G")?.checked ? "Y" : "",
    h16Rec: $("h16Rec")?.checked ? "Y" : "",
    h16Pen: $("h16Pen")?.checked ? "Y" : "",
    h16ThreePutt: $("h16ThreePutt")?.checked ? "Y" : "",
    h16BD: $("h16BD")?.checked ? "Y" : "",
    h16HO: $("h16HO")?.checked ? "Y" : "",

    totalPar,
    totalScore: "",
    vsPar: "",
    raw: "Tanglewood 4 course sim"
  };

  const scores = [
    toInt(data.h2Score),
    toInt(data.h3Score),
    toInt(data.h5Score),
    toInt(data.h16Score)
  ];

  const validScores = scores.filter(n => Number.isFinite(n));

  if(validScores.length){
    const totalScore = validScores.reduce((s,n)=>s+n,0);
    data.totalScore = totalScore;
    data.vsPar = totalScore - totalPar;
  }

  return data;
}

function toInt(v){
  const n = parseInt(v,10);
  return Number.isFinite(n) ? n : null;
}

function updateCourseSimSummary(){
  const data = getCourseSimData();

  if($("courseTotalScore")){
    $("courseTotalScore").textContent = data.totalScore === "" ? "Total Score: —" : `Total Score: ${data.totalScore}`;
  }

  if($("courseVsPar")){
    if(data.vsPar === ""){
      $("courseVsPar").textContent = "Vs Par: —";
    } else if(data.vsPar > 0){
      $("courseVsPar").textContent = `Vs Par: +${data.vsPar}`;
    } else {
      $("courseVsPar").textContent = `Vs Par: ${data.vsPar}`;
    }
  }
}

function resetPractice(){
  practice = {
    strike: Array(20).fill(""),
    low: Array(15).fill(""),
    driver: Array(20).fill("")
  };

  updatePracticeButtons();

  COURSE_HOLES.forEach(h => {
    [
      `${h.key}Score`,
      `${h.key}Tee`,
      `${h.key}Dir`
    ].forEach(id => {
      const el = $(id);
      if(el) el.value = "";
    });

    [
      `${h.key}G`,
      `${h.key}Rec`,
      `${h.key}Pen`,
      `${h.key}ThreePutt`,
      `${h.key}BD`,
      `${h.key}HO`
    ].forEach(id => {
      const el = $(id);
      if(el) el.checked = false;
    });
  });

  updateCourseSimSummary();
}

function savePractice(){
  updateCourseSimSummary();

  const courseSim = getCourseSimData();

  const coursePenalties =
    [courseSim.h2Pen, courseSim.h3Pen, courseSim.h5Pen, courseSim.h16Pen]
      .filter(v => v === "Y").length;

  const session = {
    kind:"practice",
    date:$("practiceDate").value,
    location:$("practiceLocation").value,
    focus:$("practiceFocus").value,
    rating:$("practiceRating").value,
    typicalMiss:$("typicalMiss").value,
    nextFocus:$("nextFocus").value,
    strikeScore: practice.strike.reduce((s,v)=>s+(parseInt(v)||0),0),
    lowPointClean: practice.low.filter(v=>v==="✓").length,
    playableDrives: practice.driver.filter(v=>v==="P").length,
    coursePenalties: coursePenalties,
    raw: "fullPracticeLite app save + Tanglewood course sim"
  };

  saveLocal(session);
  saveLocal(courseSim);

  const baseUrl = localStorage.getItem("scriptUrl");

  if(!baseUrl){
    alert("Practice saved locally. Google Sheets URL missing.");
    return;
  }

  const url = baseUrl
    + "?type=fullPracticeLite"
    + "&date=" + encodeURIComponent(session.date)
    + "&location=" + encodeURIComponent(session.location)
    + "&focus=" + encodeURIComponent(session.focus)
    + "&rating=" + encodeURIComponent(session.rating)
    + "&strikeScore=" + encodeURIComponent(session.strikeScore)
    + "&lowPointClean=" + encodeURIComponent(session.lowPointClean)
    + "&playableDrives=" + encodeURIComponent(session.playableDrives)
    + "&coursePenalties=" + encodeURIComponent(session.coursePenalties)
    + "&typicalMiss=" + encodeURIComponent(session.typicalMiss)
    + "&nextFocus=" + encodeURIComponent(session.nextFocus)
    + "&h2Score=" + encodeURIComponent(courseSim.h2Score)
    + "&h2Tee=" + encodeURIComponent(courseSim.h2Tee)
    + "&h2Dir=" + encodeURIComponent(courseSim.h2Dir)
    + "&h2G=" + encodeURIComponent(courseSim.h2G)
    + "&h2Rec=" + encodeURIComponent(courseSim.h2Rec)
    + "&h2Pen=" + encodeURIComponent(courseSim.h2Pen)
    + "&h2ThreePutt=" + encodeURIComponent(courseSim.h2ThreePutt)
    + "&h2BD=" + encodeURIComponent(courseSim.h2BD)
    + "&h2HO=" + encodeURIComponent(courseSim.h2HO)
    + "&h3Score=" + encodeURIComponent(courseSim.h3Score)
    + "&h3Tee=" + encodeURIComponent(courseSim.h3Tee)
    + "&h3Dir=" + encodeURIComponent(courseSim.h3Dir)
    + "&h3G=" + encodeURIComponent(courseSim.h3G)
    + "&h3Rec=" + encodeURIComponent(courseSim.h3Rec)
    + "&h3Pen=" + encodeURIComponent(courseSim.h3Pen)
    + "&h3ThreePutt=" + encodeURIComponent(courseSim.h3ThreePutt)
    + "&h3BD=" + encodeURIComponent(courseSim.h3BD)
    + "&h3HO=" + encodeURIComponent(courseSim.h3HO)
    + "&h5Score=" + encodeURIComponent(courseSim.h5Score)
    + "&h5Tee=" + encodeURIComponent(courseSim.h5Tee)
    + "&h5Dir=" + encodeURIComponent(courseSim.h5Dir)
    + "&h5G=" + encodeURIComponent(courseSim.h5G)
    + "&h5Rec=" + encodeURIComponent(courseSim.h5Rec)
    + "&h5Pen=" + encodeURIComponent(courseSim.h5Pen)
    + "&h5ThreePutt=" + encodeURIComponent(courseSim.h5ThreePutt)
    + "&h5BD=" + encodeURIComponent(courseSim.h5BD)
    + "&h5HO=" + encodeURIComponent(courseSim.h5HO)
    + "&h16Score=" + encodeURIComponent(courseSim.h16Score)
    + "&h16Tee=" + encodeURIComponent(courseSim.h16Tee)
    + "&h16Dir=" + encodeURIComponent(courseSim.h16Dir)
    + "&h16G=" + encodeURIComponent(courseSim.h16G)
    + "&h16Rec=" + encodeURIComponent(courseSim.h16Rec)
    + "&h16Pen=" + encodeURIComponent(courseSim.h16Pen)
    + "&h16ThreePutt=" + encodeURIComponent(courseSim.h16ThreePutt)
    + "&h16BD=" + encodeURIComponent(courseSim.h16BD)
    + "&h16HO=" + encodeURIComponent(courseSim.h16HO)
    + "&totalScore=" + encodeURIComponent(courseSim.totalScore)
    + "&vsPar=" + encodeURIComponent(courseSim.vsPar)
    + "&cacheBust=" + Date.now();

  window.open(url, "_blank");

  alert("Practice and Tanglewood course sim saved locally. One Google sync tab was opened.");
}

function parseCsv(text){
  const rows=[]; let row=[], cell="", inQuotes=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];

    if(ch === '"' && inQuotes && next === '"'){
      cell+='"';
      i++;
    }
    else if(ch === '"'){
      inQuotes=!inQuotes;
    }
    else if(ch === "," && !inQuotes){
      row.push(cell);
      cell="";
    }
    else if((ch === "\n" || ch === "\r") && !inQuotes){
      if(ch === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row=[];
      cell="";
    } else {
      cell+=ch;
    }
  }

  if(cell || row.length){
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function parseCsvFromFile(){
  const file=$("csvFile").files[0];

  if(!file){
    setStatus("csvStatus","Choose a Garmin CSV file first.","err");
    return;
  }

  const reader=new FileReader();

  reader.onload=e=>{
    try{
      const rows=parseCsv(e.target.result);
      lastSummaries = summarizeGarmin(rows, $("filterMode").value);
      renderSummaries(lastSummaries);
      setStatus("csvStatus",`Analyzed ${lastSummaries.length} club group(s). Review before saving.`,"ok");
    }catch(err){
      console.error(err);
      setStatus("csvStatus","Could not parse this CSV. Make sure it is the Garmin export format.","err");
    }
  };

  reader.readAsText(file);
}

function findHeaderRow(rows){
  return rows.findIndex(r => r.includes("Club Type") && r.includes("Carry Distance"));
}

function toNum(v){
  const n=parseFloat(String(v).replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : null;
}

function mph(kmh){
  return kmh == null ? null : kmh * 0.621371;
}

function metersToFt(m){
  return m == null ? null : m * 3.28084;
}

function avg(arr){
  const a=arr.filter(Number.isFinite);
  return a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;
}

function median(arr){
  const a=arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const mid=Math.floor(a.length/2);
  return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
}

function round(n,d=1){
  return n==null ? "" : Number(n).toFixed(d);
}

function summarizeGarmin(rows, mode){
  const h=findHeaderRow(rows);
  if(h < 0) throw new Error("header not found");

  const headers=rows[h].map(x=>String(x).trim());
  const idx = name => headers.indexOf(name);

  const cols = {
    clubType: idx("Club Type"),
    clubName: idx("Club Name"),
    clubSpeed: idx("Club Speed"),
    ballSpeed: idx("Ball Speed"),
    smash: idx("Smash Factor"),
    apex: idx("Apex Height"),
    carry: idx("Carry Distance"),
    total: idx("Total Distance"),
    spin: idx("Spin Rate"),
    carryDev: idx("Carry Deviation Distance"),
    totalDev: idx("Total Deviation Distance")
  };

  const groups = {};

  for(let r=h+2;r<rows.length;r++){
    const row=rows[r];
    const club=(row[cols.clubType] || row[cols.clubName] || "").trim();

    if(!club) continue;

    const shot={
      club,
      carry: toNum(row[cols.carry]),
      total: toNum(row[cols.total]),
      apexFt: metersToFt(toNum(row[cols.apex])),
      spin: toNum(row[cols.spin]),
      clubMph: mph(toNum(row[cols.clubSpeed])),
      ballMph: mph(toNum(row[cols.ballSpeed])),
      smash: toNum(row[cols.smash]),
      offline: Math.abs(toNum(row[cols.totalDev]) ?? toNum(row[cols.carryDev]) ?? NaN)
    };

    if(shot.carry == null || shot.carry <= 0) continue;

    groups[club] ||= [];
    groups[club].push(shot);
  }

  return Object.entries(groups).map(([club,shots]) => summarizeClub(club, shots, mode));
}

function summarizeClub(club, shots, mode){
  let clean=[...shots];
  const carries=shots.map(s=>s.carry).filter(Number.isFinite);
  const med=median(carries);

  if(mode==="obvious"){
    clean = shots.filter(s => {
      if(!Number.isFinite(s.carry)) return false;
      if(med && s.carry < med*0.72) return false;
      if(s.smash && s.smash < 0.85) return false;
      return true;
    });
  } else if(mode==="worst1" || mode==="worst2"){
    const remove = mode==="worst1" ? 1 : 2;
    clean = [...shots].sort((a,b)=>a.carry-b.carry).slice(Math.min(remove, Math.max(0, shots.length-1)));
  }

  const c=clean.map(s=>s.carry).filter(Number.isFinite);
  const range = c.length ? Math.max(...c)-Math.min(...c) : null;

  let confidence="Good";
  if(clean.length < 7) confidence="Low: need more shots";
  else if(range != null && range > 25) confidence="Medium: wide carry range";
  else if(shots.length-clean.length >= 3) confidence="Medium: many removed";

  return {
    kind:"stock",
    date:$("csvDate")?.value || "",
    location:$("csvLocation")?.value || "",
    notes:$("csvNotes")?.value || "",
    club,
    shots:shots.length,
    clean:clean.length,
    stockCarry: avg(c),
    medianCarry: median(c),
    carryRange: range,
    total: avg(clean.map(s=>s.total)),
    apexFt: avg(clean.map(s=>s.apexFt)),
    spin: avg(clean.map(s=>s.spin)),
    clubMph: avg(clean.map(s=>s.clubMph)),
    ballMph: avg(clean.map(s=>s.ballMph)),
    smash: avg(clean.map(s=>s.smash)),
    offlineAvg: avg(clean.map(s=>s.offline)),
    confidence
  };
}

function renderSummaries(summaries){
  const tbody=document.querySelector("#summaryTable tbody");
  tbody.innerHTML="";

  summaries.forEach(s=>{
    const tr=document.createElement("tr");

    [
      s.club,
      s.shots,
      s.clean,
      round(s.stockCarry),
      round(s.medianCarry),
      round(s.carryRange),
      round(s.total),
      round(s.apexFt),
      round(s.spin,0),
      round(s.clubMph),
      round(s.ballMph),
      round(s.smash,2),
      round(s.offlineAvg),
      s.confidence
    ].forEach(v=>{
      const td=document.createElement("td");
      td.textContent=v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function saveSummaries(){
  if(!lastSummaries.length){
    setStatus("csvStatus","Analyze a CSV first.","err");
    return;
  }

  lastSummaries.forEach(saveLocal);

  sendToSheet("stock", lastSummaries).then(ok=>{
    setStatus(
      "csvStatus",
      ok ? "Saved stock summaries locally. A Google sync tab was opened." : "Saved locally. Google Sheets sync not configured or failed.",
      ok ? "ok" : "warn"
    );
    renderHistory();
  });
}

function downloadSummaryCsv(){
  if(!lastSummaries.length){
    setStatus("csvStatus","Analyze a CSV first.","err");
    return;
  }

  const keys=[
    "date",
    "location",
    "club",
    "shots",
    "clean",
    "stockCarry",
    "medianCarry",
    "carryRange",
    "total",
    "apexFt",
    "spin",
    "clubMph",
    "ballMph",
    "smash",
    "offlineAvg",
    "confidence",
    "notes"
  ];

  const csv=[keys.join(",")]
    .concat(lastSummaries.map(s=>keys.map(k=>JSON.stringify(s[k] ?? "")).join(",")))
    .join("\n");

  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="garmin-stock-yardage-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function saveLocal(obj){
  const all=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]");
  all.unshift({...obj, savedAt:new Date().toISOString()});
  localStorage.setItem("golfTrackerHistory", JSON.stringify(all));
  renderHistory();
}

async function sendToSheet(type, rows){
  const baseUrl = localStorage.getItem("scriptUrl");
  if(!baseUrl) return false;

  const payload = encodeURIComponent(JSON.stringify({type, rows}));
  const url = baseUrl + "?payload=" + payload + "&cacheBust=" + Date.now();

  try{
    window.open(url, "_blank");
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

async function testSync(){
  const ok = await sendToSheet("test", [{message:"Golf Tracker sync test", date:new Date().toISOString()}]);

  setStatus(
    "syncStatus",
    ok ? "Sync request sent. A Google sync tab was opened." : "Sync failed or URL missing.",
    ok ? "ok" : "err"
  );
}

function renderHistory(){
  const all=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]");
  const el=$("historyList");

  if(!el) return;

  el.innerHTML=all.length ? "" : "<p>No local history yet.</p>";

  all.slice(0,50).forEach((s,i)=>{
    const div=document.createElement("div");
    div.className="historyItem";

    let label = "";

    if(s.kind==="stock"){
      label = `${s.date} — ${s.club} stock: ${round(s.stockCarry)} carry`;
    } else if(s.kind==="courseSim"){
      label = `${s.date} — Tanglewood 4 score ${s.totalScore || "—"} vs par ${s.vsPar || "—"}`;
    } else {
      label = `${s.date} — practice score ${s.strikeScore}/40`;
    }

    div.innerHTML=`<div><strong>${label}</strong><br><small>${s.location||""} ${s.confidence||""}</small></div>`;

    const del=document.createElement("button");
    del.className="danger";
    del.textContent="Delete";

    del.onclick=()=>{
      const arr=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]");
      arr.splice(i,1);
      localStorage.setItem("golfTrackerHistory",JSON.stringify(arr));
      renderHistory();
    };

    div.appendChild(del);
    el.appendChild(div);
  });
}

init();

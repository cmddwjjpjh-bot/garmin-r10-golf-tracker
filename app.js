let practice = { strike: Array(20).fill(""), low: Array(15).fill(""), driver: Array(20).fill(""), course: Array(15).fill("") };
let lastSummaries = [];

function $(id){ return document.getElementById(id); }

function init(){
  $("practiceDate").valueAsDate = new Date();
  $("csvDate").valueAsDate = new Date();
  $("scriptUrl").value = localStorage.getItem("scriptUrl") || "";
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  $("saveUrlBtn").onclick = () => { localStorage.setItem("scriptUrl", $("scriptUrl").value.trim()); setStatus("syncStatus","URL saved locally.","ok"); };
  $("testSyncBtn").onclick = testSync;
  $("parseCsvBtn").onclick = parseCsvFromFile;
  $("saveSummariesBtn").onclick = saveSummaries;
  $("downloadSummaryBtn").onclick = downloadSummaryCsv;
  $("savePracticeBtn").onclick = savePractice;
  $("resetPracticeBtn").onclick = resetPractice;
  renderPracticeButtons();
  renderHistory();
}

function switchTab(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tabPanel").forEach(p => p.classList.toggle("active", p.id === tab));
}

function setStatus(id,msg,cls=""){ const el=$(id); el.className = "status " + cls; el.textContent = msg; }

function renderPracticeButtons(){
  makeButtons("strikeButtons", "strike", 20, ["0","1","2"]);
  makeButtons("lowPointButtons", "low", 15, ["X","✓"]);
  makeButtons("driverButtons", "driver", 20, ["U","P"]);
  makeButtons("courseButtons", "course", 15, ["F","G","R","P"]);
  updatePracticeScores();
}

function makeButtons(containerId, key, count, cycle){
  const c=$(containerId); c.innerHTML="";
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
  [["strikeButtons","strike"],["lowPointButtons","low"],["driverButtons","driver"],["courseButtons","course"]].forEach(([cid,key])=>{
    [...$(cid).children].forEach((b,i)=>{
      const val = practice[key][i] || "—";
      b.textContent = `${i+1}: ${val}`;
      b.className="shotBtn";
      if(["2","✓","P","F","G"].includes(val)) b.classList.add("done");
      if(["1","R"].includes(val)) b.classList.add("mid");
      if(["0","X","U"].includes(val)) b.classList.add("bad");
    });
  });
  updatePracticeScores();
}

function updatePracticeScores(){
  const strike = practice.strike.reduce((s,v)=>s+(parseInt(v)||0),0);
  const low = practice.low.filter(v=>v==="✓").length;
  const driver = practice.driver.filter(v=>v==="P").length;
  const penalties = practice.course.filter(v=>v==="P").length;
  $("strikeScore").textContent = `${strike} / 40`;
  $("lowPointScore").textContent = `${low} / 15 clean`;
  $("driverScore").textContent = `${driver} / 20 playable`;
  $("courseScore").textContent = `${penalties} penalties`;
}

function resetPractice(){
  practice = { strike: Array(20).fill(""), low: Array(15).fill(""), driver: Array(20).fill(""), course: Array(15).fill("") };
  updatePracticeButtons();
}

function savePractice(){
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
    coursePenalties: practice.course.filter(v=>v==="P").length,
    raw: JSON.stringify(practice)
  };
  saveLocal(session);
  sendToSheet("practice", [session]).then(ok => {
    alert(ok ? "Practice saved locally and to Google Sheets." : "Practice saved locally. Google Sheets sync not configured or failed.");
  });
}

function parseCsv(text){
  const rows=[]; let row=[], cell="", inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch === '"' && inQuotes && next === '"'){ cell+='"'; i++; }
    else if(ch === '"'){ inQuotes=!inQuotes; }
    else if(ch === "," && !inQuotes){ row.push(cell); cell=""; }
    else if((ch === "\n" || ch === "\r") && !inQuotes){
      if(ch === "\r" && next === "\n") i++;
      row.push(cell); rows.push(row); row=[]; cell="";
    } else cell+=ch;
  }
  if(cell || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function parseCsvFromFile(){
  const file=$("csvFile").files[0];
  if(!file){ setStatus("csvStatus","Choose a Garmin CSV file first.","err"); return; }
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

function toNum(v){ const n=parseFloat(String(v).replace(/[^\d.-]/g,"")); return Number.isFinite(n) ? n : null; }
function mph(kmh){ return kmh == null ? null : kmh * 0.621371; }
function metersToFt(m){ return m == null ? null : m * 3.28084; }
function avg(arr){ const a=arr.filter(Number.isFinite); return a.length ? a.reduce((s,v)=>s+v,0)/a.length : null; }
function median(arr){ const a=arr.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length) return null; const mid=Math.floor(a.length/2); return a.length%2?a[mid]:(a[mid-1]+a[mid])/2; }
function round(n,d=1){ return n==null ? "" : Number(n).toFixed(d); }

function summarizeGarmin(rows, mode){
  const h=findHeaderRow(rows);
  if(h < 0) throw new Error("header not found");
  const headers=rows[h].map(x=>String(x).trim());
  const idx = name => headers.indexOf(name);
  const cols = {
    clubType: idx("Club Type"), clubName: idx("Club Name"), clubSpeed: idx("Club Speed"),
    ballSpeed: idx("Ball Speed"), smash: idx("Smash Factor"), apex: idx("Apex Height"),
    carry: idx("Carry Distance"), total: idx("Total Distance"), spin: idx("Spin Rate"),
    carryDev: idx("Carry Deviation Distance"), totalDev: idx("Total Deviation Distance")
  };
  const groups = {};
  for(let r=h+2;r<rows.length;r++){
    const row=rows[r];
    const club=(row[cols.clubType] || row[cols.clubName] || "").trim();
    if(!club) continue;
    const shot={
      club,
      carry: toNum(row[cols.carry]), total: toNum(row[cols.total]), apexFt: metersToFt(toNum(row[cols.apex])),
      spin: toNum(row[cols.spin]), clubMph: mph(toNum(row[cols.clubSpeed])), ballMph: mph(toNum(row[cols.ballSpeed])),
      smash: toNum(row[cols.smash]), offline: Math.abs(toNum(row[cols.totalDev]) ?? toNum(row[cols.carryDev]) ?? NaN)
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
    club, shots:shots.length, clean:clean.length,
    stockCarry: avg(c), medianCarry: median(c), carryRange: range,
    total: avg(clean.map(s=>s.total)), apexFt: avg(clean.map(s=>s.apexFt)), spin: avg(clean.map(s=>s.spin)),
    clubMph: avg(clean.map(s=>s.clubMph)), ballMph: avg(clean.map(s=>s.ballMph)), smash: avg(clean.map(s=>s.smash)),
    offlineAvg: avg(clean.map(s=>s.offline)), confidence
  };
}

function renderSummaries(summaries){
  const tbody=document.querySelector("#summaryTable tbody"); tbody.innerHTML="";
  summaries.forEach(s=>{
    const tr=document.createElement("tr");
    [s.club,s.shots,s.clean,round(s.stockCarry),round(s.medianCarry),round(s.carryRange),
     round(s.total),round(s.apexFt),round(s.spin,0),round(s.clubMph),round(s.ballMph),round(s.smash,2),round(s.offlineAvg),s.confidence]
     .forEach(v=>{ const td=document.createElement("td"); td.textContent=v; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
}

function saveSummaries(){
  if(!lastSummaries.length){ setStatus("csvStatus","Analyze a CSV first.","err"); return; }
  lastSummaries.forEach(saveLocal);
  sendToSheet("stock", lastSummaries).then(ok=>{
    setStatus("csvStatus", ok ? "Saved stock summaries locally and to Google Sheets." : "Saved locally. Google Sheets sync not configured or failed.", ok?"ok":"warn");
    renderHistory();
  });
}

function downloadSummaryCsv(){
  if(!lastSummaries.length){ setStatus("csvStatus","Analyze a CSV first.","err"); return; }
  const keys=["date","location","club","shots","clean","stockCarry","medianCarry","carryRange","total","apexFt","spin","clubMph","ballMph","smash","offlineAvg","confidence","notes"];
  const csv=[keys.join(",")].concat(lastSummaries.map(s=>keys.map(k=>JSON.stringify(s[k] ?? "")).join(","))).join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="garmin-stock-yardage-summary.csv"; a.click(); URL.revokeObjectURL(url);
}

function saveLocal(obj){
  const all=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]");
  all.unshift({...obj, savedAt:new Date().toISOString()});
  localStorage.setItem("golfTrackerHistory", JSON.stringify(all));
  renderHistory();
}

async function sendToSheet(type, rows){
  const url=localStorage.getItem("scriptUrl");
  if(!url) return false;
  try{
    const res=await fetch(url,{method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({type, rows})});
    return true;
  }catch(e){ console.error(e); return false; }
}

async function testSync(){
  const ok=await sendToSheet("test", [{message:"Golf Tracker sync test", date:new Date().toISOString()}]);
  setStatus("syncStatus", ok ? "Sync request sent. Check your Google Sheet for a test row." : "Sync failed or URL missing.", ok?"ok":"err");
}

function renderHistory(){
  const all=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]");
  const el=$("historyList"); if(!el) return;
  el.innerHTML=all.length?"":"<p>No local history yet.</p>";
  all.slice(0,50).forEach((s,i)=>{
    const div=document.createElement("div"); div.className="historyItem";
    const label=s.kind==="stock" ? `${s.date} — ${s.club} stock: ${round(s.stockCarry)} carry` : `${s.date} — practice score ${s.strikeScore}/40`;
    div.innerHTML=`<div><strong>${label}</strong><br><small>${s.location||""} ${s.confidence||""}</small></div>`;
    const del=document.createElement("button"); del.className="danger"; del.textContent="Delete";
    del.onclick=()=>{ const arr=JSON.parse(localStorage.getItem("golfTrackerHistory")||"[]"); arr.splice(i,1); localStorage.setItem("golfTrackerHistory",JSON.stringify(arr)); renderHistory(); };
    div.appendChild(del); el.appendChild(div);
  });
}

init();

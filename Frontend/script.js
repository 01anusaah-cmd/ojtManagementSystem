
/* =========================================================
   OJT / INTERNSHIP MANAGEMENT SYSTEM â€” front-end prototype
   Persistence: window.storage (personal, key "ojt_system_state")
   ========================================================= */
 
const STORAGE_KEY = "ojt_system_state";
let state = null;          // full app data
let session = null;        // { userId }
let currentTab = null;     // active nav tab per role
let activeModal = null;    // modal render fn
 
/* ---------------- Seed data ---------------- */
function seedState(){
  const now = Date.now();
  return {
    users: [
      { id:"u_admin", username:"admin", password:"admin123", role:"coordinator",
        fullName:"Grace Manalo", email:"grace.manalo@college.edu", active:true, createdAt: now },
      { id:"u_student1", username:"jdelacruz", password:"student123", role:"student",
        fullName:"Juan Dela Cruz", email:"juan.delacruz@student.edu", active:true,
        program:"BS Information Technology", studentId:"2023-00412", createdAt: now }
    ],
    settings:{
      requiredHours: 486,
      deadlines:{ requirements:"2026-09-15", dtrSubmission:"Weekly, every Friday" },
      templates:[
        { id:"t1", name:"Endorsement Letter", description:"Signed by department chair, addressed to host company." },
        { id:"t2", name:"Parent / Guardian Consent", description:"Required for trainees under 18." },
        { id:"t3", name:"Medical Certificate", description:"Fit-to-work certificate, issued within 30 days." },
        { id:"t4", name:"Memorandum of Agreement", description:"Tripartite MOA between school, student, and company." },
        { id:"t5", name:"Resume / CV", description:"Updated resume for the host company's records." }
      ]
    },
    studentData:{
      "u_student1":{
        company:{ name:"Northfield Software Solutions", address:"4th Flr, Meridian Tower, Bagmati", supervisor:"Engr. Liza Ramos", contact:"+977-1-4XXXXXX", assignedAt: now },
        requirementSubmissions:[
          { id:"rs1", templateId:"t1", fileName:"endorsement_letter_jdelacruz.pdf", note:"Signed by Dr. Santos.", status:"approved", submittedAt: now, reviewedAt: now, remarks:"Complete." },
          { id:"rs2", templateId:"t5", fileName:"resume_jdelacruz_v2.pdf", note:"", status:"pending", submittedAt: now }
        ],
        dtr:[
          { id:"d1", date:"2026-08-18", timeIn:"08:00", timeOut:"17:00", task:"Environment setup and onboarding orientation.", status:"approved", remarks:"" },
          { id:"d2", date:"2026-08-19", timeIn:"08:05", timeOut:"17:10", task:"Assisted in QA testing for billing module.", status:"approved", remarks:"" },
          { id:"d3", date:"2026-08-20", timeIn:"08:00", timeOut:"16:30", task:"Attended sprint planning; drafted test cases.", status:"pending", remarks:"" }
        ],
        evaluations:[
          { id:"e1", date:"2026-08-15", by:"Engr. Liza Ramos", rating:4, comments:"Juan shows strong initiative and picks up new tools quickly. Continue improving documentation habits.",
            competencies:{ "Technical Skill":80, "Punctuality":90, "Communication":75, "Initiative":85 } }
        ]
      }
    }
  };
}
 
/* ---------------- Storage helpers ---------------- */
async function loadState(){
  try{
    const res = await window.storage.get(STORAGE_KEY, false);
    if(res && res.value){ state = JSON.parse(res.value); return; }
  }catch(e){ /* not found or storage unavailable */ }
  state = seedState();
  await saveState();
}
async function saveState(){
  try{ await window.storage.set(STORAGE_KEY, JSON.stringify(state), false); }
  catch(e){ console.warn("Storage save failed, continuing in-memory.", e); }
}
 
/* ---------------- Utilities ---------------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
function uid(prefix){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function esc(str){ return (str??"").toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(d){ if(!d) return "â€”"; const dt=new Date(d+"T00:00:00"); if(isNaN(dt)) return d; return dt.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}); }
function fmtDateTime(ts){ if(!ts) return "â€”"; return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}); }
function hoursBetween(timeIn, timeOut){
  if(!timeIn || !timeOut) return 0;
  const [ih,im] = timeIn.split(":").map(Number);
  const [oh,om] = timeOut.split(":").map(Number);
  let mins = (oh*60+om) - (ih*60+im);
  if(mins < 0) mins += 24*60;
  return Math.round((mins/60)*100)/100;
}
function toast(msg, isErr=false){
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(()=> el.remove(), 3200);
}
function currentUser(){ return state.users.find(u => u.id === session?.userId) || null; }
function studentRecord(userId){
  if(!state.studentData[userId]){
    state.studentData[userId] = { company:null, requirementSubmissions:[], dtr:[], evaluations:[] };
  }
  return state.studentData[userId];
}
function totalApprovedHours(userId){
  const rec = studentRecord(userId);
  return Math.round(rec.dtr.filter(d=>d.status==="approved").reduce((s,d)=> s + hoursBetween(d.timeIn,d.timeOut), 0) * 100) / 100;
}
function closeModal(){ activeModal = null; render(); }
function openModal(fn){ activeModal = fn; render(); }
 
/* ---------------- Auth actions ---------------- */
function doLogin(username, password){
  const u = state.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if(!u) return "No account found with that username.";
  if(!u.active) return "This account has been deactivated. Contact the coordinator's office.";
  if(u.password !== password) return "Incorrect password.";
  session = { userId: u.id };
  currentTab = u.role === "coordinator" ? "admin-dashboard" : "dashboard";
  return null;
}
function doRegister(data){
  if(state.users.some(u => u.username.toLowerCase() === data.username.toLowerCase()))
    return "That username is already taken.";
  if(state.users.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
    return "An account already uses that email.";
  const id = uid("u");
  state.users.push({
    id, username:data.username, password:data.password, role:"student",
    fullName:data.fullName, email:data.email, program:data.program, studentId:data.studentId,
    active:true, createdAt: Date.now()
  });
  studentRecord(id);
  session = { userId:id };
  currentTab = "dashboard";
  return null;
}
function doLogout(){ session=null; currentTab=null; render(); }
 
/* =========================================================
   RENDER: ROOT ROUTER
   ========================================================= */
function render(){
  const app = $("#app");
  if(!session){
    app.innerHTML = renderAuth();
    bindAuthEvents();
    return;
  }
  const user = currentUser();
  if(!user){ session=null; return render(); }
  app.innerHTML = renderShell(user);
  bindShellEvents(user);
  if(activeModal){
    const wrap = document.createElement("div");
    wrap.innerHTML = activeModal();
    document.body.appendChild(wrap.firstElementChild);
    bindModalEvents();
  }
}
 
/* =========================================================
   AUTH VIEWS
   ========================================================= */
let authMode = "login"; // or 'register'
let authError = "";
 
function renderAuth(){
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-side">
        <div class="brand-mark">L</div>
        <h1>The Ledger.<br>OJT &amp; Internship<br>Records Office.</h1>
        <p>One record for every trainee: requirements, company placement, daily time log, and the hours that count toward completion â€” reviewed and sealed by your coordinator.</p>
        <div class="tag">âŸ¡ Est. records for accountable training</div>
      </div>
      <div class="auth-form">
        <div class="auth-tabs">
          <button class="auth-tab ${authMode==='login'?'active':''}" data-mode="login">Sign in</button>
          <button class="auth-tab ${authMode==='register'?'active':''}" data-mode="register">Register as Trainee</button>
        </div>
        <div class="error-box ${authError?'show':''}" id="authErr">${esc(authError)}</div>
        ${authMode==='login' ? renderLoginForm() : renderRegisterForm()}
      </div>
    </div>
  </div>`;
}
 
function renderLoginForm(){
  return `
  <form id="loginForm">
    <div class="field"><label>Username</label><input name="username" autocomplete="username" placeholder="e.g. jdelacruz" required></div>
    <div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required></div>
    <button class="btn gold" type="submit" style="width:100%; padding:11px; margin-top:6px;">Sign in â†’</button>
    <p class="hint">Demo accounts â€” Coordinator: <b class="mono">admin / admin123</b><br>Trainee: <b class="mono">jdelacruz / student123</b></p>
  </form>`;
}
function renderRegisterForm(){
  return `
  <form id="registerForm">
    <div class="field"><label>Full Name</label><input name="fullName" placeholder="Juan Dela Cruz" required></div>
    <div class="field-row">
      <div class="field"><label>Student ID</label><input name="studentId" placeholder="2026-00123" required></div>
      <div class="field"><label>Program</label><input name="program" placeholder="BS Information Technology" required></div>
    </div>
    <div class="field"><label>Email</label><input name="email" type="email" placeholder="you@student.edu" required></div>
    <div class="field-row">
      <div class="field"><label>Username</label><input name="username" placeholder="Choose a username" required></div>
      <div class="field"><label>Password</label><input name="password" type="password" placeholder="Min. 6 characters" minlength="6" required></div>
    </div>
    <button class="btn gold" type="submit" style="width:100%; padding:11px; margin-top:6px;">Create trainee account â†’</button>
    <p class="hint">Your account will be reviewed by the OJT Coordinator once you submit your first requirement.</p>
  </form>`;
}
function bindAuthEvents(){
  $$(".auth-tab").forEach(t => t.addEventListener("click", ()=>{ authMode = t.dataset.mode; authError=""; render(); }));
  const lf = $("#loginForm");
  if(lf) lf.addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(lf);
    const err = doLogin(fd.get("username"), fd.get("password"));
    if(err){ authError = err; render(); } else { authError=""; render(); toast(`Welcome back, ${currentUser().fullName.split(" ")[0]}.`); }
  });
  const rf = $("#registerForm");
  if(rf) rf.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(rf);
    const data = Object.fromEntries(fd.entries());
    const err = doRegister(data);
    if(err){ authError = err; render(); }
    else { authError=""; await saveState(); render(); toast("Trainee account created. Welcome!"); }
  });
}
 
/* =========================================================
   APP SHELL
   ========================================================= */
function navConfig(role){
  if(role === "coordinator"){
    return [
      { group:"Overview", items:[ {id:"admin-dashboard", label:"Dashboard"} ] },
      { group:"People", items:[
        {id:"admin-users", label:"User Accounts"},
        {id:"admin-students", label:"Student Monitoring"} ] },
      { group:"Records", items:[
        {id:"admin-attendance", label:"Attendance Approvals", badge: pendingDtrCount()},
        {id:"admin-requirements", label:"Requirements Review", badge: pendingReqCount()} ] },
      { group:"Configuration", items:[ {id:"admin-settings", label:"System Settings"} ] }
    ];
  }
  return [
    { group:"Overview", items:[ {id:"dashboard", label:"Dashboard"} ] },
    { group:"Placement", items:[
      {id:"requirements", label:"Requirements"},
      {id:"company", label:"Company Assignment"} ] },
    { group:"Training Record", items:[
      {id:"dtr", label:"Daily Time Record"},
      {id:"hours", label:"Hours Summary"},
      {id:"feedback", label:"Feedback & Evaluation"} ] }
  ];
}
function pendingDtrCount(){
  let n=0; Object.values(state.studentData).forEach(sd => n += sd.dtr.filter(d=>d.status==="pending").length); return n;
}
function pendingReqCount(){
  let n=0; Object.values(state.studentData).forEach(sd => n += sd.requirementSubmissions.filter(r=>r.status==="pending").length); return n;
}
 
function renderShell(user){
  const groups = navConfig(user.role);
  const initials = user.fullName.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();
  return `
  <div class="shell">
    <aside class="sidebar">
      <div class="sb-brand">
        <div class="mark">L</div>
        <div>The Ledger<span>OJT Records Office</span></div>
      </div>
      <nav>
        ${groups.map(g => `
          <div class="nav-group-label">${g.group}</div>
          ${g.items.map(it => `
            <button class="nav-item ${currentTab===it.id?'active':''}" data-tab="${it.id}">
              <span class="dot"></span>${it.label}
              ${it.badge ? `<span class="badge">${it.badge}</span>` : ""}
            </button>`).join("")}
        `).join("")}
      </nav>
      <div class="sb-bottom">
        <div class="sb-user">
          <div class="av">${esc(initials)}</div>
          <div class="who">
            <b>${esc(user.fullName)}</b>
            <span>${esc(user.role)}</span>
          </div>
        </div>
        <button class="btn secondary small" id="logoutBtn" style="width:100%; margin-top:10px; color:#EFEDE6; border-color:rgba(255,255,255,0.25);">Sign out</button>
      </div>
    </aside>
    <main class="main">
      ${user.role === "coordinator" ? renderAdminTab(user) : renderStudentTab(user)}
    </main>
  </div>`;
}
 
function bindShellEvents(user){
  $$(".nav-item").forEach(b => b.addEventListener("click", ()=>{ currentTab = b.dataset.tab; render(); }));
  $("#logoutBtn").addEventListener("click", doLogout);
  bindTabEvents(user);
}
 
/* =========================================================
   STUDENT TABS
   ========================================================= */
function renderStudentTab(user){
  switch(currentTab){
    case "requirements": return renderStudentRequirements(user);
    case "company": return renderStudentCompany(user);
    case "dtr": return renderStudentDTR(user);
    case "hours": return renderStudentHours(user);
    case "feedback": return renderStudentFeedback(user);
    default: return renderStudentDashboard(user);
  }
}
 
function renderStudentDashboard(user){
  const rec = studentRecord(user.id);
  const req = state.settings.requiredHours;
  const done = totalApprovedHours(user.id);
  const pct = Math.min(100, Math.round((done/req)*100));
  const circumference = 2*Math.PI*54;
  const offset = circumference * (1 - pct/100);
  const pendingReqs = rec.requirementSubmissions.filter(r=>r.status==="pending").length;
  const pendingDtr = rec.dtr.filter(d=>d.status==="pending").length;
  const lastFeedback = rec.evaluations[rec.evaluations.length-1];
 
  return `
  <div class="topbar">
    <div><div class="eyebrow">Trainee Dashboard</div><h2>Good to see you, ${esc(user.fullName.split(" ")[0])}.</h2>
      <div class="sub">${esc(user.program||"")} Â· ID ${esc(user.studentId||"â€”")}</div></div>
  </div>
 
  <div class="grid grid-3" style="margin-bottom:18px;">
    <div class="card" style="grid-column:span 1;">
      <div class="eyebrow">Hours Progress</div>
      <div class="seal-wrap">
        <div class="seal">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r="54" fill="none" stroke="#E4E0D4" stroke-width="10"/>
            <circle cx="66" cy="66" r="54" fill="none" stroke="#C89B3C" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="center"><b>${pct}%</b><span>complete</span></div>
        </div>
        <dl class="seal-detail" style="margin:0;">
          <dt>Completed</dt><dd>${done} hrs</dd>
          <dt>Required</dt><dd>${req} hrs</dd>
        </dl>
      </div>
    </div>
    <div class="card stat-card">
      <div class="label">Company Assignment</div>
      <div style="font-family:'Fraunces',serif; font-size:19px; margin-top:8px;">${rec.company ? esc(rec.company.name) : "Not yet assigned"}</div>
      <div class="delta ${rec.company?'up':'warn'}">${rec.company ? "Supervisor: "+esc(rec.company.supervisor) : "Awaiting coordinator placement"}</div>
      <hr class="divider">
      <div class="label">Pending Reviews</div>
      <div style="margin-top:8px; font-size:13px; line-height:1.9;">
        <div>Requirements pending: <b>${pendingReqs}</b></div>
        <div>DTR entries pending: <b>${pendingDtr}</b></div>
      </div>
    </div>
    <div class="card">
      <div class="eyebrow">Latest Evaluation</div>
      ${lastFeedback ? `
        <div class="stars" style="margin-top:6px;">${"â˜…".repeat(lastFeedback.rating)}${"â˜†".repeat(5-lastFeedback.rating)}</div>
        <p style="font-size:13px; color:var(--ink-soft); line-height:1.55; margin-top:8px;">${esc(lastFeedback.comments).slice(0,140)}${lastFeedback.comments.length>140?'â€¦':''}</p>
        <div style="font-size:11.5px; color:var(--muted); margin-top:8px;" class="mono">${esc(lastFeedback.by)} Â· ${fmtDate(lastFeedback.date)}</div>
      ` : `<p style="font-size:13px; color:var(--muted); margin-top:10px;">No evaluations submitted yet.</p>`}
    </div>
  </div>
 
  <div class="card">
    <div class="section-head"><h3>Recent Time Log</h3><button class="btn secondary small" data-tab="dtr">Open full log â†’</button></div>
    ${renderDtrTable(rec.dtr.slice(-4).reverse(), false)}
  </div>`;
}
 
function renderStudentRequirements(user){
  const rec = studentRecord(user.id);
  const templates = state.settings.templates;
  return `
  <div class="topbar">
    <div><div class="eyebrow">Placement Requirements</div><h2>Requirements</h2>
      <div class="sub">Submission deadline: ${fmtDate(state.settings.deadlines.requirements)}</div></div>
  </div>
  <div class="card">
    ${templates.map(t => {
      const sub = [...rec.requirementSubmissions].reverse().find(r=>r.templateId===t.id);
      const status = sub ? sub.status : "notsubmitted";
      const label = {approved:"Approved", pending:"Pending review", rejected:"Rejected â€” resubmit", notsubmitted:"Not submitted"}[status];
      return `
      <div class="req-item">
        <div class="info">
          <b>${esc(t.name)}</b>
          <p>${esc(t.description)}</p>
          ${sub ? `<p class="mono" style="color:var(--ink-soft); margin-top:4px;">ðŸ“Ž ${esc(sub.fileName)}${sub.remarks ? " â€” "+esc(sub.remarks) : ""}</p>` : ""}
        </div>
        <div class="req-actions">
          <span class="pill ${status}">${label}</span>
          <button class="btn small ${status==='approved'?'secondary':'gold'}" data-submit-req="${t.id}">${sub && status!=='rejected' ? 'Resubmit' : 'Submit'}</button>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}
 
function renderStudentCompany(user){
  const rec = studentRecord(user.id);
  return `
  <div class="topbar"><div><div class="eyebrow">Placement</div><h2>Company Assignment</h2>
    <div class="sub">Set by your OJT coordinator once requirements are cleared.</div></div></div>
  <div class="card" style="max-width:560px;">
    ${rec.company ? `
      <dl class="kv">
        <dt>Company</dt><dd style="font-weight:700;">${esc(rec.company.name)}</dd>
        <dt>Address</dt><dd>${esc(rec.company.address)}</dd>
        <dt>Supervisor</dt><dd>${esc(rec.company.supervisor)}</dd>
        <dt>Contact</dt><dd class="mono">${esc(rec.company.contact)}</dd>
        <dt>Assigned</dt><dd>${fmtDateTime(rec.company.assignedAt)}</dd>
      </dl>
    ` : `
      <div class="empty">
        <b>No company assigned yet</b>
        Complete and submit your requirements â€” your coordinator will place you once your file is cleared.
      </div>
    `}
  </div>`;
}
 
function renderDtrTable(entries, showActions){
  if(!entries.length) return `<div class="empty"><b>No entries yet</b>Log your first day using "New Entry".</div>`;
  return `
  <table class="ledger">
    <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Task / Accomplishment</th><th>Status</th></tr></thead>
    <tbody>
      ${entries.map(d => `
        <tr>
          <td class="mono-cell">${fmtDate(d.date)}</td>
          <td class="mono-cell">${esc(d.timeIn)}</td>
          <td class="mono-cell">${esc(d.timeOut)}</td>
          <td class="mono-cell">${hoursBetween(d.timeIn,d.timeOut)}</td>
          <td>${esc(d.task)}</td>
          <td><span class="pill ${d.status}">${d.status}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}
 
function renderStudentDTR(user){
  const rec = studentRecord(user.id);
  const sorted = [...rec.dtr].sort((a,b)=> b.date.localeCompare(a.date));
  return `
  <div class="topbar">
    <div><div class="eyebrow">Training Record</div><h2>Daily Time Record</h2>
      <div class="sub">${state.settings.deadlines.dtrSubmission}</div></div>
    <button class="btn gold" id="newDtrBtn">+ New Entry</button>
  </div>
  <div class="card">${renderDtrTable(sorted, true)}</div>`;
}
 
function renderStudentHours(user){
  const rec = studentRecord(user.id);
  const req = state.settings.requiredHours;
  const done = totalApprovedHours(user.id);
  const pendingHrs = Math.round(rec.dtr.filter(d=>d.status==="pending").reduce((s,d)=>s+hoursBetween(d.timeIn,d.timeOut),0)*100)/100;
  const remaining = Math.max(0, Math.round((req-done)*100)/100);
  const pct = Math.min(100, Math.round((done/req)*100));
  // weekly breakdown
  const weekMap = {};
  rec.dtr.filter(d=>d.status==="approved").forEach(d=>{
    const wk = isoWeek(d.date);
    weekMap[wk] = (weekMap[wk]||0) + hoursBetween(d.timeIn,d.timeOut);
  });
  const weeks = Object.entries(weekMap).sort();
  return `
  <div class="topbar"><div><div class="eyebrow">Hours</div><h2>Hours Completed vs. Required</h2></div></div>
  <div class="grid grid-3" style="margin-bottom:18px;">
    <div class="card stat-card"><div class="num">${done}</div><div class="label">Approved Hours</div></div>
    <div class="card stat-card"><div class="num">${pendingHrs}</div><div class="label">Pending Approval</div></div>
    <div class="card stat-card"><div class="num">${remaining}</div><div class="label">Hours Remaining</div></div>
  </div>
  <div class="card" style="margin-bottom:18px;">
    <div class="section-head"><h3>Overall Completion</h3><span class="mono" style="font-size:13px;">${done} / ${req} hrs (${pct}%)</span></div>
    <div class="progressbar"><div style="width:${pct}%;"></div></div>
  </div>
  <div class="card">
    <h3 style="margin-bottom:12px;">Weekly Breakdown (approved hours)</h3>
    ${weeks.length ? `
    <table class="ledger"><thead><tr><th>Week Of</th><th>Hours Logged</th></tr></thead>
      <tbody>${weeks.map(([wk,h])=>`<tr><td class="mono-cell">${wk}</td><td class="mono-cell">${Math.round(h*100)/100} hrs</td></tr>`).join("")}</tbody>
    </table>` : `<div class="empty"><b>No approved hours yet</b>Once your coordinator approves entries, they'll appear here.</div>`}
  </div>`;
}
function isoWeek(dateStr){
  const d = new Date(dateStr+"T00:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0,10);
}
 
function renderStudentFeedback(user){
  const rec = studentRecord(user.id);
  const evals = [...rec.evaluations].reverse();
  return `
  <div class="topbar"><div><div class="eyebrow">Supervision</div><h2>Feedback &amp; Evaluation</h2></div></div>
  ${evals.length ? evals.map(ev => `
    <div class="fb-card">
      <div class="fb-head">
        <div class="who">${esc(ev.by)}</div>
        <div class="when">${fmtDate(ev.date)}</div>
      </div>
      <div class="stars">${"â˜…".repeat(ev.rating)}${"â˜†".repeat(5-ev.rating)}</div>
      <p style="font-size:13.5px; line-height:1.6; margin:10px 0;">${esc(ev.comments)}</p>
      ${Object.keys(ev.competencies||{}).length ? `
        <hr class="divider" style="margin:12px 0;">
        ${Object.entries(ev.competencies).map(([k,v])=>`
          <div class="comp-row"><span>${esc(k)}</span><div class="bar"><div style="width:${v}%;"></div></div><span class="mono">${v}%</span></div>
        `).join("")}
      ` : ""}
    </div>
  `).join("") : `<div class="card empty"><b>No evaluations yet</b>Your coordinator or supervisor will post feedback here as your training progresses.</div>`}`;
}
 
/* =========================================================
   ADMIN / COORDINATOR TABS
   ========================================================= */
function renderAdminTab(user){
  switch(currentTab){
    case "admin-users": return renderAdminUsers(user);
    case "admin-students": return renderAdminStudents(user);
    case "admin-attendance": return renderAdminAttendance(user);
    case "admin-requirements": return renderAdminRequirements(user);
    case "admin-settings": return renderAdminSettings(user);
    default: return renderAdminDashboard(user);
  }
}
 
function allStudents(){ return state.users.filter(u=>u.role==="student"); }
 
function renderAdminDashboard(user){
  const students = allStudents();
  const req = state.settings.requiredHours;
  const avgPct = students.length ? Math.round(students.reduce((s,st)=> s + Math.min(100,(totalApprovedHours(st.id)/req)*100), 0)/students.length) : 0;
  const unassigned = students.filter(st => !studentRecord(st.id).company).length;
  return `
  <div class="topbar"><div><div class="eyebrow">Coordinator Dashboard</div><h2>Records Office Overview</h2>
    <div class="sub">${esc(user.fullName)} Â· Monitoring ${students.length} trainee${students.length!==1?'s':''}</div></div></div>
  <div class="grid grid-3" style="margin-bottom:18px;">
    <div class="card stat-card"><div class="num">${students.length}</div><div class="label">Total Trainees</div></div>
    <div class="card stat-card"><div class="num">${pendingDtrCount()}</div><div class="label">Attendance Pending Review</div><div class="delta warn">${pendingDtrCount()? 'Needs action' : 'All clear'}</div></div>
    <div class="card stat-card"><div class="num">${pendingReqCount()}</div><div class="label">Requirements Pending Review</div><div class="delta warn">${pendingReqCount()? 'Needs action' : 'All clear'}</div></div>
  </div>
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <div class="section-head"><h3>Average Program Completion</h3><span class="mono">${avgPct}%</span></div>
      <div class="progressbar"><div style="width:${avgPct}%;"></div></div>
      <p class="hint">Across all active trainees, based on approved hours vs. the required ${req} hrs.</p>
    </div>
    <div class="card">
      <h3 style="margin-bottom:6px;">Placement Status</h3>
      <p class="hint" style="margin-top:0;">${unassigned} of ${students.length} trainee${students.length!==1?'s':''} awaiting company assignment.</p>
      <div class="progressbar" style="margin-top:10px;"><div style="width:${students.length? Math.round(((students.length-unassigned)/students.length)*100):0}%;"></div></div>
    </div>
  </div>
  <div class="card">
    <div class="section-head"><h3>Trainee Progress Snapshot</h3><button class="btn secondary small" data-tab="admin-students">Full monitoring â†’</button></div>
    ${renderStudentsTable(students.slice(0,6))}
  </div>`;
}
 
function renderStudentsTable(students){
  if(!students.length) return `<div class="empty"><b>No trainees yet</b>Trainees appear here once they register.</div>`;
  const req = state.settings.requiredHours;
  return `
  <table class="ledger">
    <thead><tr><th>Trainee</th><th>Program</th><th>Company</th><th>Hours</th><th>Progress</th><th></th></tr></thead>
    <tbody>
    ${students.map(st=>{
      const done = totalApprovedHours(st.id);
      const pct = Math.min(100, Math.round((done/req)*100));
      const rec = studentRecord(st.id);
      return `
      <tr>
        <td><b>${esc(st.fullName)}</b><div class="mono-cell">${esc(st.studentId||"")}</div></td>
        <td>${esc(st.program||"â€”")}</td>
        <td>${rec.company ? esc(rec.company.name) : `<span style="color:var(--muted);">Unassigned</span>`}</td>
        <td class="mono-cell">${done} / ${req}</td>
        <td style="width:140px;"><div class="progressbar"><div style="width:${pct}%;"></div></div></td>
        <td><button class="btn small secondary" data-view-student="${st.id}">Manage</button></td>
      </tr>`;
    }).join("")}
    </tbody>
  </table>`;
}
 
function renderAdminUsers(user){
  return `
  <div class="topbar">
    <div><div class="eyebrow">Access Control</div><h2>User Accounts</h2><div class="sub">Manage accounts, roles, and access.</div></div>
    <button class="btn gold" id="newUserBtn">+ Add Account</button>
  </div>
  <div class="card">
    <table class="ledger">
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
      <tbody>
      ${state.users.map(u => `
        <tr>
          <td><b>${esc(u.fullName)}</b><div class="mono-cell">${esc(u.email)}</div></td>
          <td class="mono-cell">${esc(u.username)}</td>
          <td><span class="tag-role ${u.role}">${u.role}</span></td>
          <td><span class="pill ${u.active?'active':'inactive'}">${u.active?'Active':'Disabled'}</span></td>
          <td class="mono-cell">${fmtDateTime(u.createdAt)}</td>
          <td style="display:flex; gap:8px; align-items:center;">
            <label class="switch" title="Toggle active">
              <input type="checkbox" data-toggle-active="${u.id}" ${u.active?'checked':''} ${u.id===user.id?'disabled':''}>
              <span class="slider"></span>
            </label>
            <select data-change-role="${u.id}" class="mono" style="font-size:12px; padding:5px 6px; border-radius:6px; border:1px solid var(--line);" ${u.id===user.id?'disabled':''}>
              <option value="student" ${u.role==='student'?'selected':''}>student</option>
              <option value="coordinator" ${u.role==='coordinator'?'selected':''}>coordinator</option>
            </select>
          </td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}
 
function renderAdminStudents(user){
  const students = allStudents();
  return `
  <div class="topbar"><div><div class="eyebrow">Progress Monitoring</div><h2>Student Monitoring</h2>
    <div class="sub">Track hours, placement, and manage each trainee's file.</div></div></div>
  <div class="card">${renderStudentsTable(students)}</div>`;
}
 
function renderAdminAttendance(user){
  const rows = [];
  allStudents().forEach(st => studentRecord(st.id).dtr.forEach(d => rows.push({...d, student:st})));
  rows.sort((a,b)=> (a.status==='pending'?0:1) - (b.status==='pending'?0:1) || b.date.localeCompare(a.date));
  return `
  <div class="topbar"><div><div class="eyebrow">Verification</div><h2>Attendance Approvals</h2>
    <div class="sub">Review and approve each trainee's daily time record.</div></div></div>
  <div class="card">
    ${rows.length ? `
    <table class="ledger">
      <thead><tr><th>Trainee</th><th>Date</th><th>In</th><th>Out</th><th>Hrs</th><th>Task</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${rows.map(d => `
        <tr>
          <td><b>${esc(d.student.fullName)}</b></td>
          <td class="mono-cell">${fmtDate(d.date)}</td>
          <td class="mono-cell">${esc(d.timeIn)}</td>
          <td class="mono-cell">${esc(d.timeOut)}</td>
          <td class="mono-cell">${hoursBetween(d.timeIn,d.timeOut)}</td>
          <td style="max-width:220px;">${esc(d.task)}</td>
          <td><span class="pill ${d.status}">${d.status}</span></td>
          <td>
            ${d.status==='pending' ? `
              <div style="display:flex; gap:6px;">
                <button class="btn small gold" data-dtr-approve="${d.student.id}|${d.id}">Approve</button>
                <button class="btn small danger" data-dtr-reject="${d.student.id}|${d.id}">Reject</button>
              </div>` : `<span class="mono-cell" style="color:var(--muted);">reviewed</span>`}
          </td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div class="empty"><b>No time records yet</b>Entries submitted by trainees will appear here.</div>`}
  </div>`;
}
 
function renderAdminRequirements(user){
  const rows = [];
  allStudents().forEach(st => studentRecord(st.id).requirementSubmissions.forEach(r => rows.push({...r, student:st})));
  rows.sort((a,b)=> (a.status==='pending'?0:1) - (b.status==='pending'?0:1) || b.submittedAt-a.submittedAt);
  return `
  <div class="topbar"><div><div class="eyebrow">Verification</div><h2>Requirements Review</h2>
    <div class="sub">Approve or reject submitted documents.</div></div></div>
  <div class="card">
    ${rows.length ? rows.map(r => {
      const tmpl = state.settings.templates.find(t=>t.id===r.templateId);
      return `
      <div class="req-item">
        <div class="info">
          <b>${esc(r.student.fullName)} â€” ${esc(tmpl? tmpl.name : "Document")}</b>
          <p class="mono">ðŸ“Ž ${esc(r.fileName)} Â· submitted ${fmtDateTime(r.submittedAt)}</p>
          ${r.note ? `<p>${esc(r.note)}</p>` : ""}
        </div>
        <div class="req-actions">
          <span class="pill ${r.status}">${r.status}</span>
          ${r.status==='pending' ? `
            <button class="btn small gold" data-req-approve="${r.student.id}|${r.id}">Approve</button>
            <button class="btn small danger" data-req-reject="${r.student.id}|${r.id}">Reject</button>
          ` : ""}
        </div>
      </div>`;
    }).join("") : `<div class="empty"><b>Nothing submitted yet</b>Requirement submissions will appear here for review.</div>`}
  </div>`;
}
 
function renderAdminSettings(user){
  const s = state.settings;
  return `
  <div class="topbar"><div><div class="eyebrow">Configuration</div><h2>System Settings</h2></div></div>
 
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3 style="margin-bottom:14px;">Required Hours &amp; Deadlines</h3>
      <form id="settingsForm">
        <div class="field"><label>Total Required Hours</label><input name="requiredHours" type="number" min="1" value="${s.requiredHours}"></div>
        <div class="field"><label>Requirements Submission Deadline</label><input name="deadline" type="date" value="${s.deadlines.requirements}"></div>
        <div class="field"><label>DTR Submission Schedule</label><input name="dtrSchedule" value="${esc(s.deadlines.dtrSubmission)}"></div>
        <button class="btn gold" type="submit" style="margin-top:6px;">Save Settings</button>
      </form>
    </div>
    <div class="card">
      <h3 style="margin-bottom:6px;">Document Templates</h3>
      <p class="hint" style="margin-top:0;">Requirements trainees must submit before placement.</p>
      <div style="margin-top:10px;">
        ${s.templates.map(t => `
          <div class="tmpl-row">
            <div><b style="font-size:13.5px;">${esc(t.name)}</b><div style="font-size:12px; color:var(--muted);">${esc(t.description)}</div></div>
            <div></div>
            <button class="btn small danger" data-del-template="${t.id}">Remove</button>
          </div>`).join("")}
      </div>
      <hr class="divider">
      <form id="templateForm">
        <div class="field"><label>Template Name</label><input name="name" placeholder="e.g. Insurance Waiver" required></div>
        <div class="field"><label>Description</label><input name="description" placeholder="Short description of this requirement" required></div>
        <button class="btn secondary" type="submit">+ Add Template</button>
      </form>
    </div>
  </div>`;
}
 
/* =========================================================
   MODALS
   ========================================================= */
function modalSubmitRequirement(templateId){
  const tmpl = state.settings.templates.find(t=>t.id===templateId);
  return () => `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="modal-head"><h3>Submit â€” ${esc(tmpl.name)}</h3><button data-close-modal>âœ•</button></div>
      <p class="hint" style="margin-top:-6px; margin-bottom:14px;">${esc(tmpl.description)}</p>
      <form id="reqSubmitForm">
        <div class="field"><label>File name</label><input name="fileName" placeholder="e.g. resume_juan.pdf" required></div>
        <div class="field"><label>Note (optional)</label><textarea name="note" rows="3" placeholder="Anything your coordinator should know"></textarea></div>
        <button class="btn gold" type="submit" style="width:100%;">Submit Document</button>
      </form>
    </div>
  </div>`;
}
 
function modalNewDtr(){
  return () => `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="modal-head"><h3>New Time Log Entry</h3><button data-close-modal>âœ•</button></div>
      <form id="dtrForm">
        <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        <div class="field-row">
          <div class="field"><label>Time In</label><input name="timeIn" type="time" value="08:00" required></div>
          <div class="field"><label>Time Out</label><input name="timeOut" type="time" value="17:00" required></div>
        </div>
        <div class="field"><label>Task / Accomplishment</label><textarea name="task" rows="3" placeholder="Describe what you worked on today" required></textarea></div>
        <button class="btn gold" type="submit" style="width:100%;">Log Entry</button>
      </form>
    </div>
  </div>`;
}
 
function modalNewUser(){
  return () => `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="modal-head"><h3>Add Account</h3><button data-close-modal>âœ•</button></div>
      <form id="newUserForm">
        <div class="field"><label>Full Name</label><input name="fullName" required></div>
        <div class="field-row">
          <div class="field"><label>Username</label><input name="username" required></div>
          <div class="field"><label>Temp. Password</label><input name="password" minlength="6" required></div>
        </div>
        <div class="field"><label>Email</label><input name="email" type="email" required></div>
        <div class="field"><label>Role</label>
          <select name="role"><option value="student">student</option><option value="coordinator">coordinator</option></select>
        </div>
        <button class="btn gold" type="submit" style="width:100%;">Create Account</button>
      </form>
    </div>
  </div>`;
}
 
function modalManageStudent(studentId){
  const st = state.users.find(u=>u.id===studentId);
  const rec = studentRecord(studentId);
  return () => `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" style="max-width:600px;">
      <div class="modal-head"><h3>${esc(st.fullName)}</h3><button data-close-modal>âœ•</button></div>
      <p class="hint" style="margin-top:-8px;">${esc(st.program||"")} Â· ID ${esc(st.studentId||"â€”")} Â· Approved hours: ${totalApprovedHours(studentId)} / ${state.settings.requiredHours}</p>
      <hr class="divider">
      <h3 style="font-size:15px; margin-bottom:10px;">Assign / Update Company</h3>
      <form id="assignCompanyForm">
        <div class="field"><label>Company Name</label><input name="name" value="${esc(rec.company?.name||"")}" required></div>
        <div class="field"><label>Address</label><input name="address" value="${esc(rec.company?.address||"")}" required></div>
        <div class="field-row">
          <div class="field"><label>Supervisor</label><input name="supervisor" value="${esc(rec.company?.supervisor||"")}" required></div>
          <div class="field"><label>Contact</label><input name="contact" value="${esc(rec.company?.contact||"")}" required></div>
        </div>
        <button class="btn gold" type="submit" style="width:100%;">Save Assignment</button>
      </form>
      <hr class="divider">
      <h3 style="font-size:15px; margin-bottom:10px;">Post Feedback / Evaluation</h3>
      <form id="evalForm">
        <div class="field"><label>Overall Rating</label>
          <select name="rating"><option value="5">â˜…â˜…â˜…â˜…â˜… Excellent</option><option value="4" selected>â˜…â˜…â˜…â˜…â˜† Very Good</option><option value="3">â˜…â˜…â˜…â˜†â˜† Satisfactory</option><option value="2">â˜…â˜…â˜†â˜†â˜† Needs Improvement</option><option value="1">â˜…â˜†â˜†â˜†â˜† Poor</option></select>
        </div>
        <div class="field"><label>Comments</label><textarea name="comments" rows="3" placeholder="Narrative feedback for the trainee" required></textarea></div>
        <div class="field-row">
          <div class="field"><label>Technical Skill (%)</label><input name="tech" type="number" min="0" max="100" value="80"></div>
          <div class="field"><label>Punctuality (%)</label><input name="punct" type="number" min="0" max="100" value="85"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Communication (%)</label><input name="comm" type="number" min="0" max="100" value="80"></div>
          <div class="field"><label>Initiative (%)</label><input name="init" type="number" min="0" max="100" value="80"></div>
        </div>
        <button class="btn secondary" type="submit" style="width:100%;">Post Evaluation</button>
      </form>
    </div>
  </div>`;
}
 
function bindModalEvents(){
  const overlay = $("#modalOverlay");
  overlay.addEventListener("click", e=>{ if(e.target === overlay) closeModal(); });
  const closeBtn = $("[data-close-modal]");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);
 
  const reqForm = $("#reqSubmitForm");
  if(reqForm) reqForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(reqForm);
    const user = currentUser();
    const rec = studentRecord(user.id);
    const templateId = reqForm.closest(".modal").querySelector("h3").textContent; // not used for id
    rec.requirementSubmissions.push({
      id: uid("rs"), templateId: pendingTemplateId, fileName: fd.get("fileName"),
      note: fd.get("note"), status:"pending", submittedAt: Date.now()
    });
    await saveState(); closeModal(); toast("Requirement submitted for review.");
  });
 
  const dtrForm = $("#dtrForm");
  if(dtrForm) dtrForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(dtrForm);
    const user = currentUser();
    const rec = studentRecord(user.id);
    const timeIn = fd.get("timeIn"), timeOut = fd.get("timeOut");
    if(hoursBetween(timeIn,timeOut) <= 0){ toast("Time out must be after time in.", true); return; }
    rec.dtr.push({ id:uid("d"), date:fd.get("date"), timeIn, timeOut, task:fd.get("task"), status:"pending", remarks:"" });
    await saveState(); closeModal(); toast("Time log entry submitted.");
  });
 
  const newUserForm = $("#newUserForm");
  if(newUserForm) newUserForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(newUserForm);
    const username = fd.get("username");
    if(state.users.some(u=>u.username.toLowerCase()===username.toLowerCase())){ toast("Username already exists.", true); return; }
    const id = uid("u");
    state.users.push({ id, username, password:fd.get("password"), role:fd.get("role"),
      fullName:fd.get("fullName"), email:fd.get("email"), active:true, createdAt: Date.now() });
    if(fd.get("role")==="student") studentRecord(id);
    await saveState(); closeModal(); toast("Account created.");
  });
 
  const assignForm = $("#assignCompanyForm");
  if(assignForm) assignForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(assignForm);
    const rec = studentRecord(pendingStudentId);
    rec.company = { name:fd.get("name"), address:fd.get("address"), supervisor:fd.get("supervisor"), contact:fd.get("contact"), assignedAt: Date.now() };
    await saveState(); closeModal(); toast("Company assignment saved.");
  });
 
  const evalForm = $("#evalForm");
  if(evalForm) evalForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const fd = new FormData(evalForm);
    const rec = studentRecord(pendingStudentId);
    const coordinator = currentUser();
    rec.evaluations.push({
      id: uid("e"), date: new Date().toISOString().slice(0,10), by: coordinator.fullName,
      rating: Number(fd.get("rating")), comments: fd.get("comments"),
      competencies:{ "Technical Skill":Number(fd.get("tech")), "Punctuality":Number(fd.get("punct")), "Communication":Number(fd.get("comm")), "Initiative":Number(fd.get("init")) }
    });
    await saveState(); closeModal(); toast("Evaluation posted.");
  });
}
 
let pendingTemplateId = null;
let pendingStudentId = null;
 
/* =========================================================
   TAB-LEVEL EVENT BINDING
   ========================================================= */
function bindTabEvents(user){
  // quick-nav buttons embedded in cards (data-tab)
  $$("[data-tab]").forEach(b=>{
    if(b.classList.contains("nav-item")) return; // already bound
    b.addEventListener("click", ()=>{ currentTab = b.dataset.tab; render(); });
  });
 
  if(user.role === "student"){
    $$("[data-submit-req]").forEach(b=> b.addEventListener("click", ()=>{
      pendingTemplateId = b.dataset.submitReq;
      openModal(modalSubmitRequirement(pendingTemplateId));
    }));
    const newDtrBtn = $("#newDtrBtn");
    if(newDtrBtn) newDtrBtn.addEventListener("click", ()=> openModal(modalNewDtr()));
  }
 
  if(user.role === "coordinator"){
    const newUserBtn = $("#newUserBtn");
    if(newUserBtn) newUserBtn.addEventListener("click", ()=> openModal(modalNewUser()));
 
    $$("[data-toggle-active]").forEach(cb => cb.addEventListener("change", async ()=>{
      const u = state.users.find(x=>x.id===cb.dataset.toggleActive);
      u.active = cb.checked;
      await saveState(); toast(`${u.fullName} ${u.active?'activated':'disabled'}.`); render();
    }));
    $$("[data-change-role]").forEach(sel => sel.addEventListener("change", async ()=>{
      const u = state.users.find(x=>x.id===sel.dataset.changeRole);
      u.role = sel.value;
      if(u.role==="student") studentRecord(u.id);
      await saveState(); toast(`${u.fullName}'s role set to ${u.role}.`); render();
    }));
    $$("[data-view-student]").forEach(b=> b.addEventListener("click", ()=>{
      pendingStudentId = b.dataset.viewStudent;
      openModal(modalManageStudent(pendingStudentId));
    }));
    $$("[data-dtr-approve]").forEach(b=> b.addEventListener("click", async ()=>{
      const [sid,did] = b.dataset.dtrApprove.split("|");
      const entry = studentRecord(sid).dtr.find(d=>d.id===did);
      entry.status = "approved"; await saveState(); toast("Attendance approved."); render();
    }));
    $$("[data-dtr-reject]").forEach(b=> b.addEventListener("click", async ()=>{
      const [sid,did] = b.dataset.dtrReject.split("|");
      const entry = studentRecord(sid).dtr.find(d=>d.id===did);
      entry.status = "rejected"; await saveState(); toast("Attendance rejected.", true); render();
    }));
    $$("[data-req-approve]").forEach(b=> b.addEventListener("click", async ()=>{
      const [sid,rid] = b.dataset.reqApprove.split("|");
      const entry = studentRecord(sid).requirementSubmissions.find(r=>r.id===rid);
      entry.status = "approved"; entry.reviewedAt = Date.now(); await saveState(); toast("Requirement approved."); render();
    }));
    $$("[data-req-reject]").forEach(b=> b.addEventListener("click", async ()=>{
      const [sid,rid] = b.dataset.reqReject.split("|");
      const entry = studentRecord(sid).requirementSubmissions.find(r=>r.id===rid);
      entry.status = "rejected"; entry.reviewedAt = Date.now(); await saveState(); toast("Requirement rejected.", true); render();
    }));
    $$("[data-del-template]").forEach(b=> b.addEventListener("click", async ()=>{
      state.settings.templates = state.settings.templates.filter(t=>t.id!==b.dataset.delTemplate);
      await saveState(); toast("Template removed."); render();
    }));
    const settingsForm = $("#settingsForm");
    if(settingsForm) settingsForm.addEventListener("submit", async e=>{
      e.preventDefault();
      const fd = new FormData(settingsForm);
      state.settings.requiredHours = Number(fd.get("requiredHours"));
      state.settings.deadlines.requirements = fd.get("deadline");
      state.settings.deadlines.dtrSubmission = fd.get("dtrSchedule");
      await saveState(); toast("Settings saved."); render();
    });
    const templateForm = $("#templateForm");
    if(templateForm) templateForm.addEventListener("submit", async e=>{
      e.preventDefault();
      const fd = new FormData(templateForm);
      state.settings.templates.push({ id: uid("t"), name: fd.get("name"), description: fd.get("description") });
      await saveState(); toast("Template added."); render();
    });
  }
}
 
/* =========================================================
   INIT
   ========================================================= */
(async function init(){
  await loadState();
  render();
})();


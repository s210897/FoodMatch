// --- FIREBASE (tylko raz) ---
firebase.initializeApp({
  apiKey: "AIzaSyB0fze8Z1NmvNXsX7ncv0R8uENd7YjOM-o",
  authDomain: "foodmatch-210b9.firebaseapp.com",
  databaseURL: "https://foodmatch-210b9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "foodmatch-210b9",
  storageBucket: "foodmatch-210b9.firebasestorage.app",
  messagingSenderId: "831989135632",
  appId: "1:831989135632:web:b33d6c38c84f5b635e4d95"
});
const db = firebase.database();

// --- FOOD LIST ---
const foods = [
  { name: "Pizza", category: "Włoska", img: "https://images.unsplash.com/photo-1548365328-6c16e4f1a7f2" },
  { name: "Sushi", category: "Japońska", img: "https://images.unsplash.com/photo-1549880338-65ddcdfd017b" },
  { name: "Burger", category: "Amerykańska", img: "https://images.unsplash.com/photo-1550547660-d9450f859349" },
  { name: "Tacos", category: "Meksykańska", img: "https://images.unsplash.com/photo-1544025162-d76694265947" },
  { name: "Pierogi", category: "Polska", img: "https://images.unsplash.com/photo-1585238342028-1a33bf34f3d6" },
  { name: "Sałatka", category: "Wege", img: "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642" }
];

// --- STATE ---
let index = 0;
let user = null;
let groupID = null;
let host = null;
let animating = false;
let isDragging = false;
let startX = 0;
let currentX = 0;

// --- DOM ---
const card = document.getElementById("card");
const img = document.getElementById("foodImg");
const nameEl = document.getElementById("foodName");
const catEl = document.getElementById("foodCategory");
const resultsDiv = document.getElementById("results");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

// na starcie ukryj swipe i wyniki
card.style.display = "none";
yesBtn.style.display = "none";
noBtn.style.display = "none";
resultsDiv.style.display = "none";


// --- START SCREEN ---
const startScreen = document.createElement("div");
startScreen.className = "start-screen";
startScreen.innerHTML = `
  <h2>FoodMatch 🍕❤️</h2>
  <input id="userName" placeholder="Twoje imię" />
  <div style="display:flex; gap:10px;">
    <button id="createBtn" class="start-btn">➕ Utwórz grupę</button>
    <button id="prepareJoinBtn" class="start-btn">🔑 Dołącz do grupy</button>
  </div>
  <input id="groupInput" placeholder="ID grupy" style="display:none; margin-top:10px" />
  <p style="font-size:13px; color:#666; margin-top:8px;">Utwórz grupę, podaj znajomym ID lub dołącz do istniejącej</p>
`;
document.body.prepend(startScreen);

// --- HELPERS ---
function showToast(msg){ alert(msg); }
function resetCardTransformInstant(){ card.style.transition="0s"; card.style.transform="translateX(0) rotate(0)"; card.classList.remove("like","dislike"); }
function sanitizeKey(str){ return String(str).replace(/[.#$[\]/]/g,"_"); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// --- SWIPE LOGIC ---
function onPointerDown(clientX){ if(animating) return; isDragging=true; startX=clientX; }
function onPointerMove(clientX){ if(!isDragging||animating) return; currentX=clientX-startX; const rotate=currentX/12; card.style.transform=`translateX(${currentX}px) rotate(${rotate}deg)`; card.classList.toggle("like",currentX>60); card.classList.toggle("dislike",currentX<-60); }
function onPointerUp(){ if(!isDragging||animating)return; isDragging=false; if(currentX>100) throwCard(1); else if(currentX<-100) throwCard(-1); else{ card.style.transition="0.25s"; card.style.transform="translateX(0) rotate(0)"; card.classList.remove("like","dislike"); setTimeout(()=>card.style.transition="",250); } currentX=0; }
card.addEventListener("touchstart",e=>onPointerDown(e.touches[0].clientX));
card.addEventListener("touchmove",e=>{ e.preventDefault(); onPointerMove(e.touches[0].clientX);},{passive:false});
card.addEventListener("touchend",onPointerUp);
card.addEventListener("mousedown",e=>onPointerDown(e.clientX));
window.addEventListener("mousemove",e=>onPointerMove(e.clientX));
window.addEventListener("mouseup",onPointerUp);
yesBtn.addEventListener("click",()=>throwCard(1));
noBtn.addEventListener("click",()=>throwCard(-1));

// --- CREATE / JOIN GROUP ---
document.getElementById("createBtn").onclick = createGroup;
document.getElementById("prepareJoinBtn").onclick = ()=>{
  document.getElementById("groupInput").style.display="block";
  document.getElementById("prepareJoinBtn").onclick=joinGroup;
};

function createGroup(){
  const name=document.getElementById("userName").value.trim();
  if(!name) return showToast("Wpisz swoje imię.");
  groupID=Math.random().toString(36).substring(2,8).toUpperCase();
  user=name; host=name;
  db.ref(`groups/${groupID}/info`).set({created:Date.now(),host:name,started:false})
    .then(()=>{ showLobby(); showToast("Utworzono grupę. ID: "+groupID); })
    .catch(err=>{ console.error("createGroup error:",err); showToast("Błąd tworzenia grupy"); });
}

function joinGroup(){
  const name=document.getElementById("userName").value.trim();
  const g=document.getElementById("groupInput").value.trim().toUpperCase();
  if(!name||!g) return showToast("Wpisz imię i ID grupy.");
  db.ref(`groups/${g}/info`).once("value")
    .then(snap=>{ 
      if(!snap.exists()){ showToast("Taka grupa nie istnieje."); return; }
      groupID=g; user=name; host=snap.val().host;
      showLobby();
      showToast("Dołączono do grupy: "+groupID);
    })
    .catch(err=>{ console.error(err); showToast("Błąd dołączania"); });
}

// --- LOBBY SCREEN ---
function showLobby(){
  if(startScreen.parentNode) startScreen.remove();

  const lobbyDiv=document.createElement("div");
  lobbyDiv.id="lobbyScreen";
  lobbyDiv.innerHTML=`
    <h2>Poczekalnia - grupa ${groupID}</h2>
    <div id="membersList">Czekaj na innych...</div>
  `;
  if(user===host){
    const startBtn=document.createElement("button");
    startBtn.textContent="Rozpocznij grę";
    startBtn.className="start-btn";
    startBtn.onclick=startGame;
    lobbyDiv.appendChild(startBtn);
  }
  document.body.prepend(lobbyDiv);

  // zapisanie członka do grupy
  db.ref(`groups/${groupID}/members/${sanitizeKey(user)}`).set(true);

  // nasłuchiwanie startu gry
  db.ref(`groups/${groupID}/info/started`).on("value",snap=>{
    if(snap.val()===true) {
      lobbyDiv.remove();
      startSwipe();
    }
  });

  // opcjonalnie: listowanie członków
  db.ref(`groups/${groupID}/members`).on("value",snap=>{
    const members=snap.val()||{};
    document.getElementById("membersList").innerHTML=Object.keys(members).join(", ");
  });
}

// --- START GAME (host) ---
function startGame(){
  db.ref(`groups/${groupID}/info/started`).set(true);
}

// --- SHOW FOOD / RESULTS ---
function startSwipe() {
  index = 0;
  animating = false;
  isDragging = false;
  currentX = 0;
  resetCardTransformInstant();

  // pokaż UI swipowania
  card.style.display = "";
  yesBtn.style.display = "";
  noBtn.style.display = "";
  resultsDiv.style.display = "";

  showFood();
}

function showFood(){
  if(index>=foods.length){ showResults(); return; }
  const f=foods[index];
  img.src=f.img; nameEl.textContent=f.name; catEl.textContent=f.category;
}

function likeFood(){ vote(true); }
function dislikeFood(){ vote(false); }
function vote(val){
  if(!groupID||!user){ showToast("Dołącz do grupy!"); return afterVoteMove(); }
  const foodName=foods[index].name;
  db.ref(`groups/${groupID}/votes/${sanitizeKey(user)}/${sanitizeKey(foodName)}`).set(val)
    .catch(err=>{ console.error(err); showToast("Błąd zapisu głosu"); });
  afterVoteMove();
}
function afterVoteMove(){ index++; setTimeout(()=>showFood(),120); }

function throwCard(dir){
  if(animating) return; animating=true;
  card.style.transition="0.35s ease-out";
  card.style.transform=`translateX(${dir*500}px) rotate(${dir*45}deg)`;
  if(dir===1) likeFood(); else dislikeFood();
  setTimeout(()=>{ resetCardTransformInstant(); animating=false; },400);
}

function showResults(){
  if(!groupID){ resultsDiv.innerHTML="<p>Brak grupy.</p>"; return; }
  db.ref(`groups/${groupID}/votes`).once("value").then(snap=>{
    const data=snap.val()||{}; const tally={};
    for(const u in data){ const votes=data[u]; for(const f in votes){ if(!tally[f]) tally[f]={likes:0,total:0}; tally[f].total++; if(votes[f]) tally[f].likes++; } }
    let html=`<h2>Wyniki grupy ${groupID}</h2><p>Użytkownik: <b>${escapeHtml(user)}</b></p>`;
    for(const f of foods){
      const key=sanitizeKey(f.name);
      const r=tally[key];
      html+=`<p><b>${f.name}</b>: ${r?r.likes:0} / ${r?r.total:0}</p>`;
    }
    html+=`<div style="margin-top:12px;"><button id="restartBtn" class="start-btn">🔁 Głosuj jeszcze raz</button></div>`;
    resultsDiv.innerHTML=html;
    document.getElementById("restartBtn").addEventListener("click",()=>{ index=0; resultsDiv.innerHTML=""; showFood(); });
  }).catch(err=>{ console.error(err); showToast("Błąd pobierania wyników"); });
}

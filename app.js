// --- FIREBASE ---
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
  { name: "Pizza", img: "https://cdn.aniagotuje.com/pictures/articles/2023/02/38768537-v-1500x1500.jpg" },
  { name: "Kuchnia włoska", img: "https://d-art.ppstatic.pl/kadry/k/r/1/f2/7d/5ea014938c265_o_original.jpg" },
  { name: "Sushi", img: "https://www.kikkoman.pl/fileadmin/_processed_/4/2/csm_sushi-kakkoii_2c56fe3133.webp" },
  { name: "Burger", img: "https://images.unsplash.com/photo-1550547660-d9450f859349" },
  { name: "Kuchnia Meksykańska", img: "https://www.wedrowkipokuchni.com.pl/wp-content/uploads/2016/03/8955.jpg" },
  { name: "Pierogi", img: "https://akademiasmaku.pl/storage/7202/conversions/tradycyjne-pierogi-ruskie-4370-single.webp" },
  { name: "Sałatka", img: "https://cdn.aniagotuje.com/pictures/articles/2023/07/45298844-v-1500x1500.jpg" },
  { name: "Tajskie", img: "https://assets.tmecosys.com/image/upload/t_web_rdp_recipe_584x480/img/recipe/ras/Assets/31539B08-C656-4F96-8A50-303989CFC99A/Derivates/c260fa13-c1b4-46a6-a389-592cdb3faae4.jpg" },
  { name: "Chińskie", img: "https://www.gdziezjesc.info/kuchnie/images_new/100170/3.jpg" }


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

// --- Hide swipe elements initially ---
card.style.display = "none";
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
function onPointerMove(clientX){ 
  if(!isDragging||animating) return; 
  currentX=clientX-startX; 
  const rotate=currentX/12; 
  card.style.transform=`translateX(${currentX}px) rotate(${rotate}deg)`; 
  card.classList.toggle("like",currentX>60); 
  card.classList.toggle("dislike",currentX<-60); 
}
function onPointerUp(){ 
  if(!isDragging||animating)return; 
  isDragging=false; 
  if(currentX>100) throwCard(1); 
  else if(currentX<-100) throwCard(-1); 
  else{ 
    card.style.transition="0.25s"; 
    card.style.transform="translateX(0) rotate(0)"; 
    card.classList.remove("like","dislike"); 
    setTimeout(()=>card.style.transition="",250); 
  } 
  currentX=0; 
}
card.addEventListener("touchstart",e=>onPointerDown(e.touches[0].clientX));
card.addEventListener("touchmove",e=>{ e.preventDefault(); onPointerMove(e.touches[0].clientX);},{passive:false});
card.addEventListener("touchend",onPointerUp);
card.addEventListener("mousedown",e=>onPointerDown(e.clientX));
window.addEventListener("mousemove",e=>onPointerMove(e.clientX));
window.addEventListener("mouseup",onPointerUp);

// --- CREATE / JOIN GROUP ---
document.getElementById("createBtn").onclick = createGroup;
document.getElementById("prepareJoinBtn").onclick = ()=> {
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
    .catch(err=>{ console.error(err); showToast("Błąd tworzenia grupy"); });
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

// --- LOBBY ---
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

  db.ref(`groups/${groupID}/members/${sanitizeKey(user)}`).set({finished:false});

  db.ref(`groups/${groupID}/info/started`).on("value",snap=>{
    if(snap.val()===true) {
      if(lobbyDiv.parentNode) lobbyDiv.remove();
      startSwipe();
    }
  });

  db.ref(`groups/${groupID}/members`).on("value",snap=>{
    const members = snap.val() || {};
    const list = Object.keys(members).map(k=>members[k].finished?`${k} ✅`:k).join(", ");
    const membersListEl = document.getElementById("membersList");
    if(membersListEl) membersListEl.innerText = list;

    const allFinished = Object.values(members).every(m=>m.finished);
    if(allFinished) showFood(); // wyświetlamy ostatnią kartę "Koniec"
  });
}

// --- START GAME ---
function startGame(){
  db.ref(`groups/${groupID}/info/started`).set(true);
}

// --- SWIPE / VOTE ---
function startSwipe(){
  index=0; animating=false; isDragging=false; currentX=0; resetCardTransformInstant();
  card.style.display="";
  resultsDiv.style.display="none";
  showFood();
}

function showFood(){
  if(index >= foods.length){ 
    // Ostatnia karta – KONIEC
    img.src = "";
    nameEl.textContent = "Koniec!";
    catEl.textContent = "Dziękujemy za głosowanie 🍽️";

    // blokujemy tylko swipe / przyciski TAK/NIE, ale nie przycisk hosta
    card.classList.add("no-swipe"); // nowa klasa, którą w CSS możemy ustawić pointer-events: none dla swipe

    // Przycisk Pokaż wyniki tylko dla hosta
    if(user === host){
      let showResultsBtn = document.getElementById("showResultsBtn");
      if(!showResultsBtn){
        showResultsBtn = document.createElement("button");
        showResultsBtn.id = "showResultsBtn";
        showResultsBtn.textContent = "📊 Pokaż wyniki";
        showResultsBtn.className = "start-btn";
        showResultsBtn.onclick = () => { showResults(); }
        card.appendChild(showResultsBtn);
      }
    }
    return; 
  }

  const f = foods[index];
  img.src = f.img; 
  nameEl.textContent = f.name; 
  catEl.textContent = f.category;

  // Przywracamy interakcje
  card.classList.remove("no-swipe");

  // Usuń przycisk z poprzedniej karty końcowej, jeśli istnieje
  const existingBtn = document.getElementById("showResultsBtn");
  if(existingBtn) existingBtn.remove();
}

function likeFood(){ vote(true); }
function dislikeFood(){ vote(false); }

function vote(val){
  if(!groupID||!user){ showToast("Dołącz do grupy!"); return; }
  if(index >= foods.length) return; 
  const foodName = foods[index].name;
  db.ref(`groups/${groupID}/votes/${sanitizeKey(user)}/${sanitizeKey(foodName)}`).set(val)
    .catch(err=>{ console.error(err); showToast("Błąd zapisu głosu"); });
  afterVoteMove();
}

function afterVoteMove(){ index++; setTimeout(()=>showFood(),120); }

function markFinished(){
  db.ref(`groups/${groupID}/members/${sanitizeKey(user)}/finished`).set(true);
}

// --- THROW CARD ---
function throwCard(dir){
  if(animating) return; animating=true;
  card.style.transition="0.35s ease-out";
  card.style.transform=`translateX(${dir*500}px) rotate(${dir*45}deg)`;
  if(dir===1) likeFood(); else dislikeFood();
  setTimeout(()=>{ resetCardTransformInstant(); animating=false; },400);
}

// --- SHOW RESULTS ---
function showResults(){
  if(!groupID){ showToast("Brak grupy"); return; }

  resultsDiv.style.display="block";

  db.ref(`groups/${groupID}/votes`).once("value")
    .then(snap=>{
      const data = snap.val() || {};
      const tally = {};
      for(const u in data){
        const votes = data[u] || {};
        for(const f in votes){
          if(!tally[f]) tally[f] = { likes:0, total:0 };
          tally[f].total++;
          if(votes[f]) tally[f].likes++;
        }
      }

      let html=`<h2>Wyniki grupy ${groupID}</h2><p>Użytkownik: <b>${escapeHtml(user)}</b></p>`;
      for(const f of foods){
        const key = sanitizeKey(f.name);
        const r = tally[key];
        html += `<p><b>${f.name}</b>: ${r?r.likes:0} / ${r?r.total:0}</p>`;
      }

      html += `<div style="margin-top:12px;"><button id="restartBtn" class="start-btn">🔁 Głosuj jeszcze raz</button></div>`;
      resultsDiv.innerHTML = html;

      document.getElementById("restartBtn").onclick = ()=>{
        index=0;
        resultsDiv.innerHTML="";
        db.ref(`groups/${groupID}/members`).once("value").then(snap=>{
          const members = snap.val() || {};
          for(const m in members){
            db.ref(`groups/${groupID}/members/${m}/finished`).set(false);
          }
        });
        showFood();
      };
    })
    .catch(err=>{ console.error("Błąd pobierania wyników:", err); showToast("Błąd pobierania wyników"); });
}

// -----------------------------------------------------------
// FIREBASE
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// FOOD LIST
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// STATE
// -----------------------------------------------------------
let index = 0;
let user = null;
let groupID = null;
let host = null;
let animating = false;
let isDragging = false;
let startX = 0;
let currentX = 0;

// -----------------------------------------------------------
// DOM
// -----------------------------------------------------------
const card = document.getElementById("card");
const img = document.getElementById("foodImg");
const nameEl = document.getElementById("foodName");
const resultsDiv = document.getElementById("results");

card.style.display = "none";
resultsDiv.style.display = "none";

// -----------------------------------------------------------
// START SCREEN
// -----------------------------------------------------------
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
`;
document.body.prepend(startScreen);

const toast = msg => alert(msg);
const S = str => String(str).replace(/[.#$[\]/]/g, "_");

// -----------------------------------------------------------
// SWIPE HANDLERS
// -----------------------------------------------------------
function onPointerDown(x) {
  if (animating) return;
  isDragging = true;
  startX = x;
}

function onPointerMove(x) {
  if (!isDragging || animating) return;
  currentX = x - startX;
  card.style.transform = `translateX(${currentX}px) rotate(${currentX / 12}deg)`;
}

function onPointerUp() {
  if (!isDragging || animating) return;
  isDragging = false;

  if (currentX > 100) swipeVote(1);
  else if (currentX < -100) swipeVote(-1);
  else {
    card.style.transition = "0.25s";
    card.style.transform = "translateX(0) rotate(0)";
    setTimeout(() => (card.style.transition = ""), 250);
  }
  currentX = 0;
}

// TOUCH + MOUSE
card.addEventListener("touchstart", e => onPointerDown(e.touches[0].clientX));
card.addEventListener("touchmove", e => {
  e.preventDefault();
  onPointerMove(e.touches[0].clientX);
}, { passive: false });
card.addEventListener("touchend", onPointerUp);

card.addEventListener("mousedown", e => onPointerDown(e.clientX));
window.addEventListener("mousemove", e => onPointerMove(e.clientX));
window.addEventListener("mouseup", onPointerUp);

// -----------------------------------------------------------
// CREATE / JOIN GROUP
// -----------------------------------------------------------
document.getElementById("createBtn").onclick = () => {
  const name = userName.value.trim();
  if (!name) return toast("Wpisz imię");

  user = name;
  host = name;
  groupID = Math.random().toString(36).substring(2, 8).toUpperCase();

  db.ref(`groups/${groupID}`).set({
    info: { host, started: false, restart: false },
    members: {}
  });

  showLobby();
};

document.getElementById("prepareJoinBtn").onclick = () => {
  document.getElementById("groupInput").style.display = "block";
  document.getElementById("prepareJoinBtn").onclick = () => {
    const name = userName.value.trim();
    const g = groupInput.value.trim().toUpperCase();
    if (!name || !g) return toast("Wpisz imię i ID grupy");

    db.ref(`groups/${g}/info`).once("value").then(snap => {
      if (!snap.exists()) return toast("Grupa nie istnieje.");

      user = name;
      host = snap.val().host;
      groupID = g;

      showLobby();
    });
  };
};

// -----------------------------------------------------------
// LOBBY
// -----------------------------------------------------------
function showLobby() {
  startScreen.remove();

  const lobby = document.createElement("div");
  lobby.id = "lobbyScreen";
  lobby.innerHTML = `
    <h2>Grupa ${groupID}</h2>
    <div id="membersList">Czekamy...</div>
  `;

  if (user === host) {
    const b = document.createElement("button");
    b.className = "start-btn";
    b.textContent = "Rozpocznij";
    b.onclick = () => db.ref(`groups/${groupID}/info/started`).set(true);
    lobby.appendChild(b);
  }

  document.body.prepend(lobby);

  // Add self
  db.ref(`groups/${groupID}/members/${S(user)}`).set({ finished: false });

  // Watch members
  db.ref(`groups/${groupID}/members`).on("value", snap => {
    const data = snap.val() || {};
    document.getElementById("membersList").innerText =
      Object.keys(data)
        .map(u => (data[u].finished ? `${u} ✔` : u))
        .join(", ");
  });

  // Start signal
  db.ref(`groups/${groupID}/info/started`).on("value", snap => {
    if (snap.val()) {
      lobby.remove();
      startSwipe();
    }
  });

  // Restart signal
  db.ref(`groups/${groupID}/info/restart`).on("value", snap => {
    if (snap.val()) {
      startSwipe(true);
      db.ref(`groups/${groupID}/info/restart`).set(false);
    }
  });
}

// -----------------------------------------------------------
// SWIPE SEQUENCE
// -----------------------------------------------------------
function startSwipe(isRestart = false) {
  index = 0;
  card.style.display = "block";
  resultsDiv.style.display = "none";

  if (isRestart) showCountdown(() => showFood());
  else showFood();
}

function showFood() {
  if (index >= foods.length) return showEndScreen();

  card.classList.remove("no-swipe");
  img.src = foods[index].img;
  nameEl.innerText = foods[index].name;
}

function swipeVote(dir) {
  if (animating) return;
  animating = true;

  card.style.transition = "0.35s";
  card.style.transform = `translateX(${dir * 500}px) rotate(${dir * 40}deg)`;

  recordVote(dir === 1);

  setTimeout(() => {
    card.style.transition = "0s";
    card.style.transform = "translateX(0) rotate(0)";
    animating = false;
  }, 350);
}

function recordVote(v) {
  const f = foods[index].name;
  db.ref(`groups/${groupID}/votes/${S(user)}/${S(f)}`).set(v);

  index++;

  if (index >= foods.length) {
    db.ref(`groups/${groupID}/members/${S(user)}/finished`).set(true);
  }

  showFood();
}

// -----------------------------------------------------------
// END OF SWIPE
// -----------------------------------------------------------
function showEndScreen() {
  card.classList.add("no-swipe");
  img.src = "";
  nameEl.textContent = "Koniec!";

  if (user === host && !document.getElementById("showResultsBtn")) {
    const btn = document.createElement("button");
    btn.id = "showResultsBtn";
    btn.textContent = "📊 Pokaż wyniki";
    btn.className = "start-btn";
    btn.onclick = checkIfEveryoneFinished;
    card.appendChild(btn);
  }
}

// -----------------------------------------------------------
// CHECK ALL FINISHED BEFORE RESULTS
// -----------------------------------------------------------
function checkIfEveryoneFinished() {
  db.ref(`groups/${groupID}/members`).once("value").then(snap => {
    const data = snap.val() || {};
    const allFinished = Object.values(data).every(v => v.finished);

    if (!allFinished) {
      toast("Jeszcze nie wszyscy skończyli.");
      return;
    }

    showResults();
  });
}

// -----------------------------------------------------------
// RESULTS
// -----------------------------------------------------------
function showResults() {
  card.style.display = "none";
  resultsDiv.style.display = "block";

  db.ref(`groups/${groupID}/votes`).once("value").then(snap => {
    const votes = snap.val() || {};
    const scores = {};

    for (const u in votes) {
      for (const f in votes[u]) {
        if (!scores[f]) scores[f] = { likes: 0, total: 0 };
        scores[f].total++;
        if (votes[u][f]) scores[f].likes++;
      }
    }

    let html = `<h2>Wyniki grupy ${groupID}</h2>`;

    for (const f of foods) {
      const k = S(f.name);
      const r = scores[k] || { likes: 0, total: 0 };
      html += `<p><b>${f.name}:</b> ${r.likes}/${r.total}</p>`;
    }

    html += `<button id="restartBtn" class="start-btn">🔁 Głosuj jeszcze raz</button>`;
    resultsDiv.innerHTML = html;

    document.getElementById("restartBtn").onclick = () => {
      if (user !== host) return alert("Tylko host może restartować");
      db.ref(`groups/${groupID}/info/restart`).set(true);
      resultsDiv.style.display = "none";
    };
  });
}

// -----------------------------------------------------------
// COUNTDOWN 3–2–1
// -----------------------------------------------------------
function showCountdown(cb) {
  const overlay = document.createElement("div");
  overlay.className = "countdown";
  document.body.appendChild(overlay);

  let n = 3;
  overlay.innerText = n;

  const t = setInterval(() => {
    n--;
    if (n === 0) {
      clearInterval(t);
      overlay.remove();
      cb();
    } else {
      overlay.innerText = n;
    }
  }, 800);
}

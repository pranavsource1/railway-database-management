/* ============================================
   RAILWAY MANAGEMENT SYSTEM — SCRIPT.JS
   Full-featured SPA with hash routing
   ============================================ */

// ===== 1. STATE =====
const state = {
  user: null,
  currentPage: "home",
  searchResults: [],
  selectedTrain: null,
  selectedClassId: null,
  bookingData: null,
  stations: [],
  searchParams: { from: "", to: "", date: "" },
};

// ===== 2. API MODULE =====
const api = {
  async get(url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || "Request failed");
      }
      return data;
    } catch (err) {
      throw err;
    }
  },
  async post(url, body) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || "Request failed");
      }
      return data;
    } catch (err) {
      throw err;
    }
  },
};

// ===== 3. ROUTER =====
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const page = document.getElementById(`page-${pageId}`);
  if (page) {
    page.classList.add("active");
    state.currentPage = pageId;
  }

  // Update active nav link
  document
    .querySelectorAll(".nav-link")
    .forEach((link) => link.classList.remove("active"));
  const navMap = {
    home: "nav-home",
    "search-results": "nav-home",
    booking: "nav-home",
    pnr: "nav-pnr",
    "my-bookings": "nav-my-bookings",
    admin: "nav-admin",
  };
  const activeNav = document.getElementById(navMap[pageId]);
  if (activeNav) activeNav.classList.add("active");

  // Close mobile menu
  document.getElementById("nav-links").classList.remove("show");

  // Page-specific loading
  if (pageId === "admin") loadAdminStats();
  if (pageId === "my-bookings") loadMyBookings();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || "home";
  showPage(hash);
}

// ===== 4. UI HELPERS =====
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = {
    success: "ri-checkbox-circle-fill",
    error: "ri-error-warning-fill",
    info: "ri-information-fill",
  };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="toast-icon ${icons[type] || icons.info}"></i>
    <div class="toast-body"><span class="toast-message">${message}</span></div>
    <button class="toast-close" onclick="this.closest('.toast').remove()"><i class="ri-close-line"></i></button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(container) {
  if (typeof container === "string")
    container = document.getElementById(container);
  if (!container) return;
  container.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <span class="loader-text">Loading...</span>
    </div>
  `;
}

function hideLoading(container) {
  if (typeof container === "string")
    container = document.getElementById(container);
  if (!container) return;
  const loader = container.querySelector(".loader");
  if (loader) loader.remove();
}

function showEmptyState(container, icon, title, message) {
  if (typeof container === "string")
    container = document.getElementById(container);
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <i class="empty-icon ${icon}"></i>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

// Utility functions
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Global functions exposed to inline HTML (like onclick)
window.cancelPassenger = async function(passengerId) {
  if (!confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) return;
  
  try {
    const res = await api.post("/api/booking/cancel", { passenger_id: passengerId });
    showToast(res.message, "success");
    // Reload current view
    if (state.currentPage === "pnr") {
      const pnrInput = document.getElementById("pnr-input");
      if(pnrInput.value) {
        document.getElementById("btn-check-pnr").click();
      }
    } else if (state.currentPage === "my-bookings") {
      loadMyBookings();
    }
  } catch(err) {
    showToast("Failed to cancel: " + (err.message || "Unknown error"), "error");
  }
};

function getTimeDuration(dep, arr) {
  if (!dep || !arr) return "";
  // Parse HH:MM:SS or HH:MM
  const parseT = (t) => {
    const p = t.split(":").map(Number);
    return p[0] * 60 + p[1];
  };
  try {
    let d = parseT(dep);
    let a = parseT(arr);
    if (a < d) a += 24 * 60; // overnight
    const diff = a - d;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  } catch {
    return "";
  }
}

function getClassColor(classId) {
  if (!classId) return "class-default";
  const id = classId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (id.includes("2A") || id === "2AC") return "class-2AC";
  if (id.includes("3A") || id === "3AC") return "class-3AC";
  if (id.includes("SL") || id === "S") return "class-SL";
  if (id.includes("GN") || id === "G") return "class-GN";
  return "class-default";
}

// ===== 5. AUTH MODULE =====
function openAuthModal(tab = "login") {
  const modal = document.getElementById("auth-modal");
  modal.classList.add("show");
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("show");
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById("auth-tab-login");
  const regTab = document.getElementById("auth-tab-register");
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");

  if (tab === "login") {
    loginTab.classList.add("active");
    regTab.classList.remove("active");
    loginForm.style.display = "flex";
    regForm.style.display = "none";
  } else {
    regTab.classList.add("active");
    loginTab.classList.remove("active");
    regForm.style.display = "flex";
    loginForm.style.display = "none";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!username || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }

  try {
    const data = await api.post("/api/auth/login", { username, password });
    state.user = data.user;
    localStorage.setItem("railway_user", JSON.stringify(data.user));
    updateAuthUI();
    closeAuthModal();
    showToast(
      `Welcome back, ${data.user.name || data.user.username}!`,
      "success",
    );
  } catch (err) {
    showToast(err.message || "Login failed", "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("reg-username").value.trim();
  const name = document.getElementById("reg-name").value.trim();
  const mobile_number = document.getElementById("reg-mobile").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!username || !name || !mobile_number || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }

  try {
    await api.post("/api/auth/register", {
      username,
      name,
      mobile_number,
      password,
    });
    showToast("Registration successful! Please login.", "success");
    switchAuthTab("login");
  } catch (err) {
    showToast(err.message || "Registration failed", "error");
  }
}

function checkAuth() {
  const stored = localStorage.getItem("railway_user");
  if (stored) {
    try {
      state.user = JSON.parse(stored);
    } catch {
      state.user = null;
    }
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loginBtn = document.getElementById("btn-login-nav");
  const userMenu = document.getElementById("user-menu");
  const displayName = document.getElementById("user-display-name");

  if (state.user) {
    loginBtn.style.display = "none";
    userMenu.style.display = "flex";
    displayName.textContent = state.user.name || state.user.username;
  } else {
    loginBtn.style.display = "inline-flex";
    userMenu.style.display = "none";
  }
}

function logout() {
  state.user = null;
  localStorage.removeItem("railway_user");
  updateAuthUI();
  document.getElementById("user-dropdown").classList.remove("show");
  showToast("Logged out successfully", "info");
  if (state.currentPage === "my-bookings") {
    window.location.hash = "#home";
  }
}

// ===== 6. SEARCH MODULE =====
async function loadStations() {
  try {
    const data = await api.get("/api/stations");
    state.stations = data.data || [];
    const fromSelect = document.getElementById("search-from");
    const toSelect = document.getElementById("search-to");

    const options = state.stations
      .map((s) => `<option value="${s.station_id}">${s.station_name}</option>`)
      .join("");

    fromSelect.innerHTML = `<option value="">Select Origin</option>${options}`;
    toSelect.innerHTML = `<option value="">Select Destination</option>${options}`;
  } catch (err) {
    showToast("Failed to load stations", "error");
  }
}

function swapStations() {
  const from = document.getElementById("search-from");
  const to = document.getElementById("search-to");
  const temp = from.value;
  from.value = to.value;
  to.value = temp;
}

async function searchTrains() {
  const fromId = document.getElementById("search-from").value;
  const toId = document.getElementById("search-to").value;
  const date = document.getElementById("search-date").value;

  if (!fromId || !toId) {
    showToast("Please select both origin and destination stations", "error");
    return;
  }

  if (fromId === toId) {
    showToast("Origin and destination cannot be the same", "error");
    return;
  }

  state.searchParams = { from: fromId, to: toId, date };

  // Get station names
  const fromStation = state.stations.find(
    (s) => String(s.station_id) === String(fromId),
  );
  const toStation = state.stations.find(
    (s) => String(s.station_id) === String(toId),
  );
  const fromName = fromStation ? fromStation.station_name : fromId;
  const toName = toStation ? toStation.station_name : toId;

  window.location.hash = "#search-results";

  const container = document.getElementById("results-container");
  showLoading(container);

  try {
    const data = await api.get(`/api/trains/search?from=${fromId}&to=${toId}`);
    state.searchResults = data.data || [];

    document.getElementById("search-summary").innerHTML =
      `<i class="ri-route-line"></i> ${fromName} → ${toName}${date ? " | " + formatDate(date) : ""}`;
    document.getElementById("results-count").textContent =
      `${state.searchResults.length} train${state.searchResults.length !== 1 ? "s" : ""} found`;

    renderTrainCards(state.searchResults);
  } catch (err) {
    showEmptyState(
      container,
      "ri-error-warning-line",
      "Search Failed",
      err.message || "Could not find trains for this route",
    );
  }
}

function renderTrainCards(trains) {
  const container = document.getElementById("results-container");

  if (!trains || trains.length === 0) {
    showEmptyState(
      container,
      "ri-train-line",
      "No Trains Found",
      "Try searching for a different route or date",
    );
    return;
  }

  container.innerHTML = trains
    .map((train, idx) => {
      const depTime = train.departure_time || "";
      const arrTime = train.arrival_time || "";
      const duration = getTimeDuration(depTime, arrTime);

      const classBadges = (train.classes || [])
        .map((cls) => {
          const isWL = cls.available_seats <= 0;
          const colorClass = getClassColor(cls.class_id);
          return `
        <div class="class-badge ${colorClass} ${isWL ? "waitlisted" : ""}"
             data-class-id="${cls.class_id}" data-train-idx="${idx}">
          <span class="class-name">${cls.class_id}</span>
          <span class="class-seats">${isWL ? "WL" : cls.available_seats + " avl"}</span>
          <span class="class-fare">${formatCurrency(cls.fare)}</span>
        </div>
      `;
        })
        .join("");

      return `
      <div class="train-card" data-train-idx="${idx}">
        <div class="train-card-body">
          <div class="train-info">
            <span class="train-number">#${train.train_no}</span>
            <div class="train-name">${train.train_name}</div>
          </div>
          <div class="train-schedule">
            <div class="time-block">
              <div class="time-value">${formatTime(depTime)}</div>
              <div class="time-label">${train.from_station || ""}</div>
            </div>
            <div class="journey-line">
              <span class="journey-dot start"></span>
              <span class="journey-duration">${duration || train.distance + " km"}</span>
              <span class="journey-dot end"></span>
            </div>
            <div class="time-block">
              <div class="time-value">${formatTime(arrTime)}</div>
              <div class="time-label">${train.to_station || ""}</div>
            </div>
          </div>
        </div>
        <div class="train-classes">${classBadges}</div>
        <div class="train-card-action">
          <button class="btn-book-train" data-train-idx="${idx}">
            <i class="ri-ticket-2-line"></i> Book Now
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach class badge click events
  container.querySelectorAll(".class-badge").forEach((badge) => {
    badge.addEventListener("click", function () {
      const trainIdx = this.dataset.trainIdx;
      // Remove selected from siblings
      this.closest(".train-classes")
        .querySelectorAll(".class-badge")
        .forEach((b) => b.classList.remove("selected"));
      this.classList.add("selected");
      // Store selected class for this train
      state.searchResults[trainIdx]._selectedClass = this.dataset.classId;
    });
  });

  // Attach book button events
  container.querySelectorAll(".btn-book-train").forEach((btn) => {
    btn.addEventListener("click", function () {
      const trainIdx = parseInt(this.dataset.trainIdx);
      const train = state.searchResults[trainIdx];
      const selClass =
        train._selectedClass ||
        (train.classes && train.classes.length > 0
          ? train.classes[0].class_id
          : null);
      if (!selClass) {
        showToast("No class available for this train", "error");
        return;
      }
      initBooking(train, selClass);
    });
  });
}

// ===== 7. BOOKING MODULE =====
function initBooking(train, classId) {
  if (!state.user) {
    showToast("Please login to book tickets", "error");
    openAuthModal("login");
    return;
  }

  state.selectedTrain = train;
  state.selectedClassId = classId;

  window.location.hash = "#booking";

  // Render train summary
  const summary = document.getElementById("booking-train-summary");
  summary.innerHTML = `
    <div class="booking-train-info">
      <div>
        <span class="train-number">#${train.train_no}</span>
        <div class="train-name">${train.train_name}</div>
      </div>
    </div>
    <div class="booking-route">
      <span>${train.from_station || "Origin"}</span>
      <i class="ri-arrow-right-line"></i>
      <span>${train.to_station || "Destination"}</span>
      ${state.searchParams.date ? `<span style="margin-left:auto;color:var(--text-light);font-size:0.85rem;"><i class="ri-calendar-line"></i> ${formatDate(state.searchParams.date)}</span>` : ""}
    </div>
  `;

  // Populate class dropdown
  const classSelect = document.getElementById("booking-class");
  classSelect.innerHTML = (train.classes || [])
    .map(
      (cls) =>
        `<option value="${cls.class_id}" ${cls.class_id === classId ? "selected" : ""}>
      ${cls.class_id} — ${formatCurrency(cls.fare)} (${cls.available_seats > 0 ? cls.available_seats + " seats" : "Waitlist"})
    </option>`,
    )
    .join("");

  // Reset passengers
  document.getElementById("passengers-list").innerHTML = "";
  addPassenger();

  // Update fare
  updateFare();
}

function addPassenger() {
  const list = document.getElementById("passengers-list");
  const count = list.querySelectorAll(".passenger-form").length;
  if (count >= 4) {
    showToast("Maximum 4 passengers allowed", "error");
    return;
  }

  const idx = count + 1;
  const form = document.createElement("div");
  form.className = "passenger-form";
  form.innerHTML = `
    <div class="passenger-header">
      <h4><i class="ri-user-line"></i> Passenger ${idx}</h4>
      ${idx > 1 ? `<button class="btn-remove-passenger" onclick="removePassenger(this)"><i class="ri-close-line"></i></button>` : ""}
    </div>
    <div class="passenger-fields">
      <div class="form-group">
        <label>Name</label>
        <input type="text" class="p-name" placeholder="Full Name" required />
      </div>
      <div class="form-group">
        <label>Age</label>
        <input type="number" class="p-age" placeholder="Age" min="1" max="120" required />
      </div>
      <div class="form-group">
        <label>Gender</label>
        <select class="p-gender">
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
      </div>
      <div class="form-group">
        <label>Mobile</label>
        <input type="tel" class="p-mobile" placeholder="Mobile No." />
      </div>
    </div>
  `;
  list.appendChild(form);
  updateFare();
}

function removePassenger(btn) {
  const form = btn.closest(".passenger-form");
  form.style.animation = "fadeOut 0.3s ease forwards";
  setTimeout(() => {
    form.remove();
    // Re-number passengers
    document
      .querySelectorAll("#passengers-list .passenger-form")
      .forEach((f, i) => {
        f.querySelector("h4").innerHTML =
          `<i class="ri-user-line"></i> Passenger ${i + 1}`;
      });
    updateFare();
  }, 250);
}

function updateFare() {
  const classId = document.getElementById("booking-class").value;
  const train = state.selectedTrain;
  const passengerCount = document.querySelectorAll(
    "#passengers-list .passenger-form",
  ).length;

  let perFare = 0;
  if (train && train.classes) {
    const cls = train.classes.find((c) => c.class_id === classId);
    if (cls) perFare = cls.fare;
  }

  const total = perFare * passengerCount;

  document.getElementById("fare-display").innerHTML = `
    <div class="fare-row">
      <span>Base Fare (${classId || "—"})</span>
      <span>${formatCurrency(perFare)}</span>
    </div>
    <div class="fare-row">
      <span>Passengers</span>
      <span>× ${passengerCount}</span>
    </div>
  `;

  document.getElementById("total-fare-display").innerHTML = `
    <span>Total Fare</span>
    <span>${formatCurrency(total)}</span>
  `;

  const bookBtn = document.getElementById("btn-book-now");
  bookBtn.innerHTML = `<i class="ri-secure-payment-line"></i> Pay ${formatCurrency(total)} & Book`;
}

async function submitBooking() {
  const train = state.selectedTrain;
  if (!train) return;
  if (!state.user) {
    showToast("Please login first", "error");
    openAuthModal();
    return;
  }

  const classId = document.getElementById("booking-class").value;
  if (!classId) {
    showToast("Please select a travel class", "error");
    return;
  }

  const passengerForms = document.querySelectorAll(
    "#passengers-list .passenger-form",
  );
  const passengers = [];
  let valid = true;

  passengerForms.forEach((f) => {
    const name = f.querySelector(".p-name").value.trim();
    const age = f.querySelector(".p-age").value.trim();
    const gender = f.querySelector(".p-gender").value;
    const mobile_no = f.querySelector(".p-mobile").value.trim();

    if (!name || !age) {
      valid = false;
    }
    passengers.push({ name, age: parseInt(age), gender, mobile_no });
  });

  if (!valid || passengers.length === 0) {
    showToast("Please fill in all passenger details", "error");
    return;
  }

  const payment_mode = document.getElementById("payment-mode").value;

  // Build station IDs
  const boarding_station = state.searchParams.from;
  const destination_station = state.searchParams.to;
  const date_of_travel =
    state.searchParams.date || new Date().toISOString().split("T")[0];

  const bookBtn = document.getElementById("btn-book-now");
  bookBtn.disabled = true;
  bookBtn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Processing...`;

  try {
    const data = await api.post("/api/booking/create", {
      train_no: train.train_no,
      class_id: classId,
      boarding_station,
      destination_station,
      date_of_travel,
      username: state.user.username,
      passengers,
      payment_mode,
    });

    showBookingSuccess(data.pnr, data.total_fare);
    showToast("Booking confirmed!", "success");
  } catch (err) {
    showToast(err.message || "Booking failed", "error");
  } finally {
    bookBtn.disabled = false;
    updateFare();
  }
}

function showBookingSuccess(pnr, fare) {
  const modal = document.getElementById("booking-success-modal");
  document.getElementById("success-pnr").textContent = pnr;
  document.getElementById("success-fare-display").textContent = fare
    ? `Total: ${formatCurrency(fare)}`
    : "";
  modal.classList.add("show");
}

function closeBookingSuccess() {
  document.getElementById("booking-success-modal").classList.remove("show");
}

// ===== 8. PNR MODULE =====
async function checkPNR() {
  const pnrInput = document.getElementById("pnr-input");
  const pnr = pnrInput.value.trim();

  if (!pnr) {
    showToast("Please enter a PNR number", "error");
    return;
  }

  const resultContainer = document.getElementById("pnr-result");
  showLoading(resultContainer);

  try {
    const data = await api.get(`/api/pnr/${pnr}`);
    renderPNRResult(data.data);
  } catch (err) {
    showEmptyState(
      resultContainer,
      "ri-error-warning-line",
      "PNR Not Found",
      err.message || "Please check the PNR number and try again",
    );
  }
}

async function renderPNRResult(pnr) {
  const container = document.getElementById("pnr-result");

  // Journey info card
  let html = `
    <div class="journey-info-card">
      <div class="ji-header">
        <div>
          <div class="ji-train-name">${pnr.train_name || ""}</div>
          <span class="ji-train-no">#${pnr.train_no || ""}</span>
        </div>
        <div>
          <span class="ji-class-badge">${pnr.class_id || ""}</span>
        </div>
      </div>
      <div class="ji-route">
        <div class="ji-station">
          ${pnr.boarding_station_name || ""}
          <small>${formatDate(pnr.date_of_travel)}</small>
        </div>
        <i class="ri-arrow-right-double-line ji-arrow"></i>
        <div class="ji-station">
          ${pnr.destination_station_name || ""}
        </div>
      </div>
    </div>
  `;

  // Try to load route for timeline
  let route = null;
  try {
    const routeData = await api.get(`/api/trains/${pnr.train_no}/route`);
    route = routeData.data;
  } catch {
    // No route available
  }

  if (route && route.length > 0) {
    html += renderTimeline(
      route,
      pnr.boarding_station_name,
      pnr.destination_station_name,
    );
  }

  // Passenger table
  html += `
    <div class="passenger-table-card">
      <h3><i class="ri-group-line"></i> Passenger Details</h3>
      <table class="pnr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Status</th>
            <th>Seat / Coach</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${(pnr.passengers || [])
            .map((p, i) => {
              const statusClass =
                p.status === "CNF"
                  ? "confirmed"
                  : p.status === "WL"
                    ? "waitlisted"
                    : "cancelled";
              const statusIcon =
                p.status === "CNF" ? "ri-checkbox-circle-fill" : "ri-time-fill";
              const seatInfo =
                p.status === "CNF"
                  ? `${p.coach_no || "—"} / ${p.seat_no || "—"}`
                  : p.waiting_no
                    ? `WL #${p.waiting_no}`
                    : "—";
              const cancelBtn = p.status !== "CAN" ? `<button onclick="cancelPassenger(${p.passenger_id})" class="btn-cancel" style="padding:4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="ri-close-circle-line"></i> Cancel</button>` : "—";
              return `
              <tr>
                <td>${i + 1}</td>
                <td style="font-weight:500;color:var(--text-dark);">${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender === "M" ? "Male" : "Female"}</td>
                <td><span class="status-badge ${statusClass}"><i class="${statusIcon}"></i> ${p.status}</span></td>
                <td>${seatInfo}</td>
                <td>${cancelBtn}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  // Payment info
  if (pnr.payment || pnr.fare) {
    const payment = pnr.payment || {};
    html += `
      <div class="payment-info-card">
        <h3><i class="ri-bank-card-line"></i> Payment Information</h3>
        <div class="payment-grid">
          ${payment.payment_id ? `<div class="payment-item"><div class="pi-label">Payment ID</div><div class="pi-value">${payment.payment_id}</div></div>` : ""}
          ${payment.payment_mode ? `<div class="payment-item"><div class="pi-label">Mode</div><div class="pi-value">${payment.payment_mode}</div></div>` : ""}
          ${payment.payment_date ? `<div class="payment-item"><div class="pi-label">Date</div><div class="pi-value">${formatDate(payment.payment_date)}</div></div>` : ""}
          <div class="payment-item">
            <div class="pi-label">Amount</div>
            <div class="pi-value amount">${formatCurrency(payment.amount || pnr.fare || 0)}</div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderTimeline(route, boardingName, destName) {
  const stops = route
    .map((stop) => {
      const isBoarding = stop.station_name === boardingName;
      const isDest = stop.station_name === destName;
      let cls = "";
      if (isBoarding) cls = "boarding";
      else if (isDest) cls = "destination";

      let badge = "";
      if (isBoarding)
        badge = '<span class="stop-badge boarding-badge">BOARDING</span>';
      if (isDest)
        badge = '<span class="stop-badge destination-badge">DESTINATION</span>';

      return `
      <div class="timeline-stop ${cls}">
        <div class="stop-dot"></div>
        <div class="stop-info">
          <div>
            <span class="stop-name">${stop.station_name}${badge}</span>
            <div class="stop-dist">${stop.distance_from_origin ? stop.distance_from_origin + " km from origin" : ""}</div>
          </div>
          <div class="stop-time">
            ${stop.arrival_time ? "Arr: " + formatTime(stop.arrival_time) : ""}
            ${stop.departure_time ? " | Dep: " + formatTime(stop.departure_time) : ""}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="timeline-card">
      <h3><i class="ri-route-line"></i> Route & Stops</h3>
      <div class="timeline">${stops}</div>
    </div>
  `;
}

// ===== 9. BOOKINGS MODULE =====
async function loadMyBookings() {
  const container = document.getElementById("my-bookings-list");

  if (!state.user) {
    container.innerHTML = `
      <div class="login-prompt">
        <i class="ri-lock-line"></i>
        <h3>Login Required</h3>
        <p>Please login to view your bookings</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">
          <i class="ri-login-box-line"></i> Login Now
        </button>
      </div>
    `;
    return;
  }

  showLoading(container);

  try {
    const data = await api.get(`/api/user/${state.user.username}/bookings`);
    const bookings = data.data || [];

    if (bookings.length === 0) {
      showEmptyState(
        container,
        "ri-ticket-2-line",
        "No Bookings Yet",
        "Book your first train ticket to see it here",
      );
      return;
    }

    container.innerHTML = bookings
      .map((b) => {
        const passengerChips = (b.passengers || [])
          .map((p) => {
            const statusClass = p.status === "CNF" ? "confirmed" : "waitlisted";
            return `
          <span class="booking-passenger-chip">
            ${p.name} <span class="status-badge ${statusClass}" style="padding:2px 6px;font-size:0.7rem;">${p.status}</span>
          </span>
        `;
          })
          .join("");

        return `
        <div class="booking-card">
          <div class="booking-card-header">
            <span class="booking-pnr">PNR: ${b.pnr}</span>
            <span class="booking-date">${formatDate(b.date_of_travel)}</span>
          </div>
          <div class="booking-card-body">
            <div class="booking-route-display">
              <span>${b.boarding_station_name || b.from_station || "—"}</span>
              <i class="ri-arrow-right-line"></i>
              <span>${b.destination_station_name || b.to_station || "—"}</span>
            </div>
            <div class="booking-meta">
              <span class="booking-meta-item"><i class="ri-train-line"></i> ${b.train_name} (#${b.train_no})</span>
              <span class="booking-meta-item"><i class="ri-vip-crown-line"></i> ${b.class_id}</span>
              <span class="booking-meta-item"><i class="ri-bank-card-line"></i> ${b.payment_mode || "—"}</span>
            </div>
            <div class="booking-passengers">${passengerChips}</div>
          </div>
          <div class="booking-card-footer">
            <button class="btn-check-pnr-card" onclick="navigateToPNR('${b.pnr}')">
              <i class="ri-search-eye-line"></i> Check PNR Status
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    showEmptyState(
      container,
      "ri-error-warning-line",
      "Failed to Load",
      err.message || "Could not fetch your bookings",
    );
  }
}

function navigateToPNR(pnr) {
  document.getElementById("pnr-input").value = pnr;
  window.location.hash = "#pnr";
  setTimeout(() => checkPNR(), 300);
}

// ===== 10. ADMIN MODULE =====
async function loadAdminStats() {
  const grid = document.getElementById("admin-stats-grid");
  const charts = document.getElementById("admin-charts");
  showLoading(grid);

  try {
    const data = await api.get("/api/admin/stats");
    const s = data.data || {};

    grid.innerHTML = `
      <div class="stat-card blue">
        <div class="stat-icon">🚂</div>
        <div class="stat-value" data-target="${s.total_trains || 0}">0</div>
        <div class="stat-label">Total Trains</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon">🏛️</div>
        <div class="stat-value" data-target="${s.total_stations || 0}">0</div>
        <div class="stat-label">Total Stations</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">👥</div>
        <div class="stat-value" data-target="${s.total_passengers || 0}">0</div>
        <div class="stat-label">Total Passengers</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🎫</div>
        <div class="stat-value" data-target="${s.total_tickets || 0}">0</div>
        <div class="stat-label">Total Tickets</div>
      </div>
      <div class="stat-card teal">
        <div class="stat-icon">✅</div>
        <div class="stat-value" data-target="${s.confirmed_count || 0}">0</div>
        <div class="stat-label">Confirmed</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">⏳</div>
        <div class="stat-value" data-target="${s.waitlisted_count || 0}">0</div>
        <div class="stat-label">Waitlisted</div>
      </div>
    `;

    // Animate counters
    grid.querySelectorAll(".stat-value[data-target]").forEach((el) => {
      animateCounter(el, parseInt(el.dataset.target) || 0);
    });

    // Render charts
    const paymentModes = s.payment_modes || [];
    const classDistribution = s.class_distribution || [];

    const barColors = ["blue", "orange", "green", "purple", "teal"];
    const maxPayment = Math.max(...paymentModes.map((p) => p.count), 1);
    const maxClass = Math.max(...classDistribution.map((c) => c.count), 1);

    charts.innerHTML = `
      <div class="chart-card">
        <h3><i class="ri-bank-card-line"></i> Payment Modes</h3>
        <div class="bar-chart">
          ${paymentModes
            .map(
              (p, i) => `
            <div class="bar-item">
              <span class="bar-label">${p.mode}</span>
              <div class="bar-track">
                <div class="bar-fill ${barColors[i % barColors.length]}" style="width: ${((p.count / maxPayment) * 100).toFixed(1)}%;">${p.count}</div>
              </div>
            </div>
          `,
            )
            .join("")}
          ${paymentModes.length === 0 ? '<p style="color:var(--text-light);font-size:0.9rem;">No data available</p>' : ""}
        </div>
      </div>
      <div class="chart-card">
        <h3><i class="ri-vip-crown-line"></i> Class Distribution</h3>
        <div class="bar-chart">
          ${classDistribution
            .map(
              (c, i) => `
            <div class="bar-item">
              <span class="bar-label">${c.class_id}</span>
              <div class="bar-track">
                <div class="bar-fill ${barColors[i % barColors.length]}" style="width: ${((c.count / maxClass) * 100).toFixed(1)}%;">${c.count}</div>
              </div>
            </div>
          `,
            )
            .join("")}
          ${classDistribution.length === 0 ? '<p style="color:var(--text-light);font-size:0.9rem;">No data available</p>' : ""}
        </div>
      </div>
    `;

    // Animate bars (start from 0 width)
    charts.querySelectorAll(".bar-fill").forEach((bar) => {
      const targetWidth = bar.style.width;
      bar.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = targetWidth;
        });
      });
    });

    // Load default tab
    loadAdminTable("trains");
  } catch (err) {
    grid.innerHTML = "";
    showToast("Failed to load admin stats: " + (err.message || ""), "error");
  }
}

function animateCounter(element, target) {
  const duration = 1500;
  const start = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(eased * target);
    element.textContent = current.toLocaleString("en-IN");
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

async function loadAdminTable(type) {
  // Update active tab
  document
    .querySelectorAll(".admin-tab")
    .forEach((t) => t.classList.remove("active"));
  const tabId = `admin-tab-${type}`;
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");

  const table = document.getElementById("admin-data-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;">
    <div class="spinner" style="margin:0 auto;"></div>
  </td></tr>`;

  try {
    const data = await api.get(`/api/admin/${type}`);
    const rows = data.data || [];

    if (type === "trains") {
      thead.innerHTML = `<tr>
        <th>Train No</th><th>Train Name</th><th>From</th><th>To</th><th>Start Time</th><th>End Time</th>
      </tr>`;
      tbody.innerHTML = rows
        .map(
          (r) => `<tr>
        <td><strong>${r.train_no}</strong></td>
        <td>${r.train_name}</td>
        <td>${r.from_station || "—"}</td>
        <td>${r.to_station || "—"}</td>
        <td>${formatTime(r.start_time)}</td>
        <td>${formatTime(r.end_time)}</td>
      </tr>`,
        )
        .join("");
    } else if (type === "passengers") {
      thead.innerHTML = `<tr>
        <th>ID</th><th>Name</th><th>Age</th><th>Gender</th><th>PNR</th><th>Train</th><th>Status</th><th>Mobile</th>
      </tr>`;
      tbody.innerHTML = rows
        .map((r) => {
          const statusClass = r.status === "CNF" ? "confirmed" : "waitlisted";
          return `<tr>
          <td>${r.passenger_id}</td>
          <td><strong>${r.name}</strong></td>
          <td>${r.age}</td>
          <td>${r.gender === "M" ? "Male" : "Female"}</td>
          <td>${r.pnr}</td>
          <td>${r.train_name} (#${r.train_no})</td>
          <td><span class="status-badge ${statusClass}">${r.status}</span></td>
          <td>${r.mobile_no || "—"}</td>
        </tr>`;
        })
        .join("");
    } else if (type === "bookings") {
      thead.innerHTML = `<tr>
        <th>PNR</th><th>User</th><th>Train</th><th>From</th><th>To</th><th>Date</th><th>Class</th><th>Payment</th><th>Passengers</th>
      </tr>`;
      tbody.innerHTML = rows
        .map(
          (r) => `<tr>
        <td><strong>${r.pnr}</strong></td>
        <td>${r.username}</td>
        <td>${r.train_name} (#${r.train_no})</td>
        <td>${r.from_station || "—"}</td>
        <td>${r.to_station || "—"}</td>
        <td>${formatDate(r.date_of_travel)}</td>
        <td>${r.class_id}</td>
        <td>${r.payment_mode || "—"}</td>
        <td>${r.passenger_count || "—"}</td>
      </tr>`,
        )
        .join("");
    } else if (type === "audit") {
      thead.innerHTML = `<tr>
        <th>Log ID</th><th>Time</th><th>Action</th><th>Table</th><th>Record ID</th><th>Description</th>
      </tr>`;
      tbody.innerHTML = rows
        .map(
          (r) => `<tr>
        <td>${r.log_id}</td>
        <td>${formatDate(r.created_at)} ${formatTime(r.created_at)}</td>
        <td><span class="status-badge" style="background:${r.action_type === 'INSERT' ? 'var(--success)' : 'var(--primary)'}; color:white;">${r.action_type}</span></td>
        <td>${r.table_name}</td>
        <td>${r.record_id}</td>
        <td>${r.description}</td>
      </tr>`,
        )
        .join("");
    }

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-light);">No data available</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--danger);">Failed to load data</td></tr>`;
  }
}

// ===== 11. INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  // Set default date
  const dateInput = document.getElementById("search-date");
  dateInput.value = new Date().toISOString().split("T")[0];

  // Load stations
  loadStations();

  // Check auth
  checkAuth();

  // ---- EVENT LISTENERS ----

  // Navbar hamburger
  document.getElementById("hamburger").addEventListener("click", () => {
    document.getElementById("nav-links").classList.toggle("show");
  });

  // User menu dropdown
  document.getElementById("user-menu-toggle").addEventListener("click", () => {
    document.getElementById("user-dropdown").classList.toggle("show");
  });

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("user-dropdown");
    const toggle = document.getElementById("user-menu-toggle");
    if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });

  // Auth modal
  document
    .getElementById("btn-login-nav")
    .addEventListener("click", () => openAuthModal("login"));
  document
    .getElementById("btn-close-auth-modal")
    .addEventListener("click", closeAuthModal);
  document
    .getElementById("auth-tab-login")
    .addEventListener("click", () => switchAuthTab("login"));
  document
    .getElementById("auth-tab-register")
    .addEventListener("click", () => switchAuthTab("register"));

  // Close modal on overlay click
  document.getElementById("auth-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  // Auth forms
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document
    .getElementById("register-form")
    .addEventListener("submit", handleRegister);

  // Logout
  document.getElementById("btn-logout").addEventListener("click", logout);

  // Search
  document.getElementById("btn-swap").addEventListener("click", swapStations);
  document
    .getElementById("btn-search-trains")
    .addEventListener("click", searchTrains);

  // Back buttons
  document.getElementById("btn-back-home").addEventListener("click", () => {
    window.location.hash = "#home";
  });
  document.getElementById("btn-back-results").addEventListener("click", () => {
    window.location.hash = "#search-results";
  });

  // Booking
  document
    .getElementById("btn-add-passenger")
    .addEventListener("click", addPassenger);
  document
    .getElementById("booking-class")
    .addEventListener("change", updateFare);
  document
    .getElementById("btn-book-now")
    .addEventListener("click", submitBooking);

  // PNR
  document.getElementById("btn-check-pnr").addEventListener("click", checkPNR);
  document.getElementById("pnr-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPNR();
  });

  // Admin tabs
  document
    .getElementById("admin-tab-trains")
    .addEventListener("click", () => loadAdminTable("trains"));
  document
    .getElementById("admin-tab-passengers")
    .addEventListener("click", () => loadAdminTable("passengers"));
  document
    .getElementById("admin-tab-bookings")
    .addEventListener("click", () => loadAdminTable("bookings"));
  document
    .getElementById("admin-tab-audit")
    .addEventListener("click", () => loadAdminTable("audit"));

  // Booking success modal
  document.getElementById("btn-view-booking").addEventListener("click", () => {
    const pnr = document.getElementById("success-pnr").textContent;
    closeBookingSuccess();
    navigateToPNR(pnr);
  });
  document.getElementById("btn-book-another").addEventListener("click", () => {
    closeBookingSuccess();
    window.location.hash = "#home";
  });
  document.getElementById("btn-copy-pnr").addEventListener("click", () => {
    const pnr = document.getElementById("success-pnr").textContent;
    navigator.clipboard
      .writeText(pnr)
      .then(() => {
        showToast("PNR copied to clipboard!", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  });

  // Close booking success modal on overlay click
  document
    .getElementById("booking-success-modal")
    .addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeBookingSuccess();
    });

  // Popular routes
  document.querySelectorAll(".route-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const from = chip.dataset.from;
      const to = chip.dataset.to;
      // Try to match station names to IDs
      const fromStation = state.stations.find((s) =>
        s.station_name.toLowerCase().includes(from.toLowerCase()),
      );
      const toStation = state.stations.find((s) =>
        s.station_name.toLowerCase().includes(to.toLowerCase()),
      );
      if (fromStation)
        document.getElementById("search-from").value = fromStation.station_id;
      if (toStation)
        document.getElementById("search-to").value = toStation.station_id;
      // Scroll to search card
      document
        .querySelector(".search-card")
        .scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  // Hash routing
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
});

// Expose removePassenger globally for onclick
window.removePassenger = removePassenger;

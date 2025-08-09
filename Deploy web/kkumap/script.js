// --- Global State & Config ---
const API_URL = 'http://localhost:3001';
let currentUser = null;
let map;
let markers = [];
let activeInfoWindow = null;

const kkuCenter = { lat: 16.475, lng: 102.824 };
const INITIAL_ZOOM = 15;

// --- Element Selectors ---
const loginBtn = document.querySelector('.login-btn');
const logoutBtn = document.querySelector('.logout-btn');
const guestView = document.getElementById('guest-view');
const userView = document.getElementById('user-view');
const welcomeMessage = document.getElementById('welcome-message');
const authModal = document.getElementById('auth-modal');
const authModalCloseBtn = authModal.querySelector('.modal-close-btn');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const alertOkBtn = document.getElementById('alert-ok-btn');

// --- Custom Alert Function ---
function showAlert(message) {
    alertMessage.textContent = message;
    alertModal.classList.remove('hidden');
}
alertOkBtn.addEventListener('click', () => {
    alertModal.classList.add('hidden');
});

// --- Google Map Initialization ---
function initMap() {
    const mapContainer = document.getElementById('map-container');
    const kkuBounds = { north: 16.4975, south: 16.4525, west: 102.8015, east: 102.8465 };

    // JSON Style สำหรับซ่อน POI ที่ไม่จำเป็น
    const mapStyles = [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "poi.medical", elementType: "labels.text", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    ];
    
    map = new google.maps.Map(mapContainer, {
        center: kkuCenter,
        zoom: INITIAL_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        restriction: { latLngBounds: kkuBounds, strictBounds: true },
        styles: mapStyles
    });

    createCustomControls();
    fetchAndDisplayPlaces();
}

// --- Custom Map Controls ---
function createCustomControls() {
    const centerControlDiv = document.createElement("div");
    const centerControlButton = document.createElement("button");
    centerControlButton.classList.add("back-to-center-btn");
    centerControlButton.textContent = "กลับจุดกลาง";
    centerControlButton.addEventListener("click", () => {
        map.setCenter(kkuCenter);
        map.setZoom(INITIAL_ZOOM);
    });
    centerControlDiv.appendChild(centerControlButton);
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);

    const pinPaletteDiv = document.createElement('div');
    pinPaletteDiv.className = 'pin-palette hidden';
    pinPaletteDiv.innerHTML = `<p>ลากเพื่อปัก</p><div id="draggable-pin"></div>`;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(pinPaletteDiv);

    const draggablePin = pinPaletteDiv.querySelector('#draggable-pin');
    setupDraggablePin(draggablePin);
}

// --- Draggable Pin Logic ---
function setupDraggablePin(pinElement) {
    let isDraggingPin = false;
    let ghostPin = null;

    pinElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showAlert("กรุณาเข้าสู่ระบบก่อนเพิ่มสถานที่");
            return;
        }
        isDraggingPin = true;
        ghostPin = document.createElement('div');
        ghostPin.style.cssText = `position: absolute; width: 40px; height: 40px; background-image: ${getComputedStyle(pinElement).backgroundImage}; background-size: contain; z-index: 10000; pointer-events: none;`;
        document.body.appendChild(ghostPin);
        moveGhostPin(e);
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingPin) moveGhostPin(e);
    });

    window.addEventListener('mouseup', (e) => {
        if (isDraggingPin) {
            isDraggingPin = false;
            document.body.removeChild(ghostPin);
            const mapDiv = document.getElementById('map-container');
            const rect = mapDiv.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const point = new google.maps.Point(e.clientX - rect.left, e.clientY - rect.top);
                const overlay = new google.maps.OverlayView();
                overlay.setMap(map);
                overlay.draw = function() {};
                const latLng = overlay.getProjection().fromContainerPixelToLatLng(point);
                overlay.setMap(null);
                
                const tempMarker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                });

                showAddPlaceModal(latLng, () => {
                    tempMarker.setMap(null);
                });
            }
        }
    });

    function moveGhostPin(e) {
        if (ghostPin) {
            ghostPin.style.left = e.clientX - 20 + 'px';
            ghostPin.style.top = e.clientY - 40 + 'px';
        }
    }
}

// --- Modals and Data Logic ---
function showAddPlaceModal(latLng, onCancel) {
    const modalContainer = document.getElementById('add-place-modal');
    modalContainer.innerHTML = `
        <div class="modal">
            <button class="modal-close-btn">×</button>
            <h2>เพิ่มสถานที่ใหม่</h2>
            <form id="add-place-form">
                <div class="form-group"><label for="place-name">ชื่อสถานที่</label><input type="text" id="place-name" required></div>
                <div class="form-group"><label for="place-comment">Comment</label><textarea id="place-comment" rows="3"></textarea></div>
                <div class="form-group"><label for="place-image">อัปโหลดภาพ (ยังไม่เปิดใช้งาน)</label><input type="file" id="place-image" accept="image/*" disabled></div>
                <button type="submit" class="submit-btn">บันทึก</button>
            </form>
        </div>`;
    modalContainer.classList.remove('hidden');

    const closeModal = () => {
        modalContainer.classList.add('hidden');
        if (onCancel) onCancel();
    };
    modalContainer.querySelector('.modal-close-btn').addEventListener('click', closeModal);

    modalContainer.querySelector('#add-place-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('place-name').value;
        const comment = document.getElementById('place-comment').value;
        try {
            const response = await fetch(`${API_URL}/places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lat: latLng.lat(), lng: latLng.lng(), created_by_user_id: currentUser.id, comment, image_url: null })
            });
            const result = await response.json();
            showAlert(result.message);
            if (result.success) {
                closeModal();
                fetchAndDisplayPlaces(); // **เรียกโหลดหมุดใหม่ทันที**
            }
        } catch(error) { showAlert('เกิดข้อผิดพลาดในการบันทึกสถานที่'); }
    });
}

async function fetchAndDisplayPlaces() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    try {
        const response = await fetch(`${API_URL}/places`);
        const result = await response.json();
        if (result.success) {
            result.places.forEach(place => {
                const marker = new google.maps.Marker({
                    position: { lat: place.lat, lng: place.lng },
                    map: map,
                    title: place.name,
                });

                const infoWindowContent = `
                    <div class="info-window-content">
                        <h3>${place.name}</h3>
                        <small>สร้างโดย: ${place.creator_username || 'ไม่ระบุ'}</small>
                        <p><i>"${place.comment || 'ยังไม่มีความคิดเห็นแรก'}"</i></p>
                    </div>`;

                const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

                marker.addListener('click', () => {
                    if (activeInfoWindow) {
                        activeInfoWindow.close();
                    }
                    infoWindow.open(map, marker);
                    activeInfoWindow = infoWindow;
                });
                markers.push(marker);
            });
        }
    } catch (error) { console.error('Error fetching places:', error); }
}

// --- Auth & UI Logic ---
function updateUI() {
    const pinPalette = document.querySelector('.pin-palette');
    if (currentUser) {
        guestView.classList.add('hidden');
        userView.classList.remove('hidden');
        if(pinPalette) pinPalette.classList.remove('hidden');
        welcomeMessage.textContent = `ยินดีต้อนรับ, ${currentUser.username}`;
    } else {
        guestView.classList.remove('hidden');
        userView.classList.add('hidden');
        if(pinPalette) pinPalette.classList.add('hidden');
    }
}
function hideAuthModal() { authModal.classList.add('hidden'); }

loginBtn.addEventListener('click', () => { authModal.classList.remove('hidden'); loginView.classList.remove('hidden'); registerView.classList.add('hidden'); });
logoutBtn.addEventListener('click', () => { currentUser = null; localStorage.removeItem('kkuMapUser'); updateUI(); });
authModalCloseBtn.addEventListener('click', hideAuthModal);
authModal.addEventListener('click', (event) => { if (event.target === authModal) hideAuthModal(); });
showRegisterLink.addEventListener('click', () => { loginView.classList.add('hidden'); registerView.classList.remove('hidden'); });
showLoginLink.addEventListener('click', () => { registerView.classList.add('hidden'); loginView.classList.remove('hidden'); });

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = loginForm.querySelector('#login-username').value;
    const password = loginForm.querySelector('#login-password').value;
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        showAlert(result.message);
        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('kkuMapUser', JSON.stringify(currentUser));
            updateUI();
            hideAuthModal();
        }
    } catch (error) { showAlert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'); }
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = registerForm.querySelector('#register-username').value;
    const password = registerForm.querySelector('#register-password').value;
    const user_type = registerForm.querySelector('#user-type').value;
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, user_type })
        });
        const result = await response.json();
        showAlert(result.message);
        if (result.success) {
            registerView.classList.add('hidden');
            loginView.classList.remove('hidden');
        }
    } catch (error) { showAlert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'); }
});

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('kkuMapUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    updateUI();
});
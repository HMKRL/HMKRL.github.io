// --- System Constants ---
const NUM_STRIPS = 8;
const NUM_PALETTE = 16;
const NUM_PROFILES = 8;
const ARDUINO_VID = 0x1B4F; // SparkFun Pro Micro

// --- Global Variables ---
let usbDevice = null;
let endpointIn = -1;
let endpointOut = -1;
let isVerbose = true;

// Data Model (Default values)
let palettes = Array(NUM_PALETTE).fill().map(() => ({ hex: "000000", name: "None", isDefined: 0 }));
let profiles = Array(NUM_PROFILES).fill().map((_, i) => ({
  name: `Profile ${i}`,
  stripGroups: Array(NUM_STRIPS).fill(0),
  groupColors: Array(NUM_STRIPS).fill(0),
  isDefined: 0
}));
let miscConfig = { freq: 20, duty: 60, defProfile: 0 };

// ======================== UI Logic ========================

function switchTab(tab) {
  document.getElementById('content-palette').classList.toggle('hidden', tab !== 'palette');
  document.getElementById('content-profiles').classList.toggle('hidden', tab !== 'profiles');
  document.getElementById('content-misc').classList.toggle('hidden', tab !== 'misc');

  document.getElementById('tab-palette').className = `flex-1 py-4 text-center transition-colors ${tab === 'palette' ? 'tab-active' : 'tab-inactive bg-gray-100'}`;
  document.getElementById('tab-profiles').className = `flex-1 py-4 text-center transition-colors ${tab === 'profiles' ? 'tab-active' : 'tab-inactive bg-gray-100'}`;
  document.getElementById('tab-misc').className = `flex-1 py-4 text-center transition-colors ${tab === 'misc' ? 'tab-active' : 'tab-inactive bg-gray-100'}`;

  if (tab === 'profiles') {
    updateProfileColorSelectors();
    loadProfileUI();
  } else if (tab === 'misc') {
    updateMiscUI();
  }
}

function initUI() {
  // 1. Initialize Palette (Restore to card layout)
  const pCont = document.getElementById('paletteContainer');
  pCont.innerHTML = '';
  for (let i = 0; i < NUM_PALETTE; i++) {
    pCont.innerHTML += `
      <div class="flex flex-col space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-200 transition" id="palRow${i}">
        <div class="flex justify-between items-center">
          <span class="font-mono font-bold text-gray-500 bg-gray-100 px-2 rounded">ID: ${i}</span>
          <label class="flex items-center space-x-1 cursor-pointer">
            <span class="text-xs text-gray-500 font-medium">啟用</span>
            <input type="checkbox" id="palDef${i}" onchange="togglePalette(${i})" class="w-4 h-4 text-indigo-600 rounded">
          </label>
        </div>
        <div class="flex items-center space-x-2 mt-2">
          <input type="color" id="palColor${i}" value="#ff0000" class="color-picker shadow-sm flex-shrink-0" oninput="syncColorToHex(${i}, this.value); previewPaletteColor(this.value)" onclick="previewPaletteColor(this.value)">
          <input type="text" id="palHex${i}" maxlength="7" class="border rounded p-1 w-20 uppercase text-sm font-mono text-gray-700" value="#FF0000" oninput="syncHexToColor(${i}, this.value)" onfocus="previewPaletteColor(document.getElementById('palColor'+${i}).value)">
          <input type="text" id="palName${i}" maxlength="12" placeholder="Name" class="border rounded p-1 flex-1 min-w-0 text-sm font-semibold text-gray-700" value="COLOR${i}">
        </div>
      </div>
    `;
  }

  // 2. Initialize Profile Dropdown
  const profSel = document.getElementById('profileSelect');
  profSel.innerHTML = Array.from({ length: NUM_PROFILES }, (_, i) => `<option value="${i}">${profiles[i].name}</option>`).join('');

  // 3. Initialize Strip & Group Dropdowns
  const sCont = document.getElementById('stripsContainer');
  const gcCont = document.getElementById('groupColorsContainer');
  sCont.innerHTML = ''; gcCont.innerHTML = '';

  for (let i = 0; i < NUM_STRIPS; i++) {
    sCont.innerHTML += `
      <div class="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm">
        <label class="font-medium text-gray-600">實體燈條 ${i}</label>
        <select id="stripGroup${i}" class="border border-gray-300 rounded p-1 w-32 bg-gray-50 focus:border-indigo-500 outline-none" onchange="previewCurrentProfile()">
          ${Array.from({ length: NUM_STRIPS }, (_, j) => `<option value="${j}">群組 ${j}</option>`).join('')}
        </select>
      </div>`;

    gcCont.innerHTML += `
      <div class="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm">
        <label class="font-medium text-gray-600">分色群組 ${i}</label>
        <select id="groupColor${i}" class="border border-indigo-200 rounded p-1 w-32 profile-color-select bg-indigo-50 focus:border-indigo-500 font-medium outline-none" onchange="previewCurrentProfile()"></select>
      </div>`;
  }
  renderFanPreview();
}

function renderFanPreview() {
  const container = document.getElementById('fanPreviewContainer');
  if (!container) return;
  container.innerHTML = '';

  const angles = [-70, -50, -30, -10, 10, 30, 50, 70];

  for (let i = 0; i < NUM_STRIPS; i++) {
    container.innerHTML += `
      <div class="absolute w-3 h-28 rounded-full border border-gray-400 transition-all duration-300"
           id="previewStrip${i}"
           style="bottom: -5px; transform-origin: bottom center; transform: rotate(${angles[i]}deg) translateY(-60px);">
      </div>
    `;
  }
}

function togglePalette(i) {
  palettes[i].isDefined = document.getElementById(`palDef${i}`).checked ? 1 : 0;
  const row = document.getElementById(`palRow${i}`);
  if (!palettes[i].isDefined) {
    row.classList.add('opacity-40', 'bg-gray-50');
  } else {
    row.classList.remove('opacity-40', 'bg-gray-50');
  }
  document.getElementById(`palColor${i}`).disabled = !palettes[i].isDefined;
  document.getElementById(`palHex${i}`).disabled = !palettes[i].isDefined;
  document.getElementById(`palName${i}`).disabled = !palettes[i].isDefined;
  updateProfileColorSelectors();
}

function syncColorToHex(i, val) {
  document.getElementById(`palHex${i}`).value = val.toUpperCase();
}

function syncHexToColor(i, val) {
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    document.getElementById(`palColor${i}`).value = val;
    previewPaletteColor(val);
  }
}

function toggleCurrentProfile(skipPreview = false) {
  const pIdx = document.getElementById('profileSelect').value;
  profiles[pIdx].isDefined = document.getElementById('profileDefToggle').checked ? 1 : 0;

  const editArea = document.getElementById('profileEditArea');
  if (profiles[pIdx].isDefined) {
    editArea.style.opacity = '1';
    editArea.style.pointerEvents = 'auto';
    editArea.classList.remove('grayscale');
  } else {
    editArea.style.opacity = '0.5';
    editArea.style.pointerEvents = 'none';
    editArea.classList.add('grayscale');
  }
  updateProfileSelectLabels();
  if (!skipPreview) {
    previewCurrentProfile();
  }
}

function updateProfileName(val) {
  const pIdx = document.getElementById('profileSelect').value;
  profiles[pIdx].name = val.substring(0, 16);
  updateProfileSelectLabels();
}

function updateProfileSelectLabels() {
  const sel = document.getElementById('profileSelect');
  const defSel = document.getElementById('defaultProfileSelect');

  if (defSel) defSel.innerHTML = '';

  for (let i = 0; i < NUM_PROFILES; i++) {
    const text = profiles[i].isDefined ? profiles[i].name : `${profiles[i].name} (未啟用)`;
    sel.options[i].text = text;
    if (defSel) {
      defSel.options.add(new Option(`${i}: ` + text, i));
    }
  }

  if (defSel) defSel.value = miscConfig.defProfile;
}

function updateMiscUI() {
  document.getElementById('strobeFreq').value = miscConfig.freq;
  document.getElementById('valStrobeFreq').innerText = miscConfig.freq;
  document.getElementById('strobeDuty').value = miscConfig.duty;
  document.getElementById('valStrobeDuty').innerText = miscConfig.duty;
  if (document.getElementById('defaultProfileSelect')) {
    document.getElementById('defaultProfileSelect').value = miscConfig.defProfile;
  }
}

function updateProfileColorSelectors() {
  const selects = document.querySelectorAll('.profile-color-select');
  const options = palettes.map((p, i) => p.isDefined ? `<option value="${i}">${i}: ${p.name || 'Color'}</option>` : '').join('');

  selects.forEach(s => {
    const currentVal = s.value;
    s.innerHTML = options || '<option value="0" disabled>無可用顏色 (請至調色盤設定)</option>';
    if (currentVal && palettes[currentVal] && palettes[currentVal].isDefined) {
      s.value = currentVal;
    }
  });
}

function loadProfileUI() {
  const pIdx = document.getElementById('profileSelect').value;
  const prof = profiles[pIdx];

  document.getElementById('profileNameInput').value = prof.name;
  document.getElementById('profileDefToggle').checked = prof.isDefined === 1;

  for (let i = 0; i < NUM_STRIPS; i++) {
    document.getElementById(`stripGroup${i}`).value = prof.stripGroups[i];
    document.getElementById(`groupColor${i}`).value = prof.groupColors[i];
  }

  toggleCurrentProfile(true);

  updateVisualPreview();
  sendCmd(`SET_PRF:${pIdx}\n`); // Live preview for this profile
}

function updateVisualPreview() {
  const pIdx = document.getElementById('profileSelect').value;
  if (!profiles[pIdx]) return;
  const prof = profiles[pIdx];

  for (let i = 0; i < NUM_STRIPS; i++) {
    const stripEl = document.getElementById(`previewStrip${i}`);
    if (stripEl) {
      const gIdx = prof.stripGroups[i];
      const palIdx = prof.groupColors[gIdx];
      let color = "#e5e7eb"; // default gray
      if (prof.isDefined && palettes[palIdx] && palettes[palIdx].isDefined) {
        color = "#" + palettes[palIdx].hex;
      }
      stripEl.style.backgroundColor = color;
      stripEl.style.boxShadow = prof.isDefined ? `0 0 10px ${color}` : 'none';
      stripEl.style.borderColor = prof.isDefined ? color : '#9ca3af';
    }
  }
}

// --- Debug Display Logic ---
function logDebug(msg, type = "INFO") {
  if (!isVerbose) return;
  const logBox = document.getElementById('debugLog');
  if (logBox) {
    const time = new Date().toISOString().substring(11, 23);
    logBox.value += `[${time}][${type}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }
  console.log(`[${type}]`, msg);
}

function toggleDebug() {
  isVerbose = document.getElementById('debugToggle').checked;
  document.getElementById('debugLogContainer').classList.toggle('hidden', !isVerbose);
  sendCmd(`SET_DBG:${isVerbose ? 1 : 0}\n`);
}

// ======================== WebUSB Communication Logic ========================

async function connectUSB() {
  try {
    logDebug("Requesting USB device...", "SYS");
    usbDevice = await navigator.usb.requestDevice({ filters: [{ vendorId: ARDUINO_VID }] });
    logDebug(`Device selected: ${usbDevice.productName}`, "SYS");

    await usbDevice.open();
    if (usbDevice.configuration === null) {
      await usbDevice.selectConfiguration(1);
    }

    let interfaceNum = -1;

    // [Critical Logic]: Strictly find the Interface with Bulk data transfer endpoints
    for (const conf of usbDevice.configuration.interfaces) {
      for (const alt of conf.alternates) {
        if (alt.interfaceClass === 0xFF) { // Vendor Specific
          let epIn = alt.endpoints.find(e => e.direction === 'in' && e.type === 'bulk');
          let epOut = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');

          if (epIn && epOut) {
            interfaceNum = conf.interfaceNumber;
            endpointIn = epIn.endpointNumber;
            endpointOut = epOut.endpointNumber;
            break;
          }
        }
      }
      if (interfaceNum !== -1) break;
    }

    if (interfaceNum === -1) {
      throw new Error("找不到具備 Bulk 端點的 WebUSB 介面！請確認硬體是否支援或處於設定模式。");
    }

    await usbDevice.claimInterface(interfaceNum);
    logDebug(`Interface ${interfaceNum} claimed. EP_IN:${endpointIn}, EP_OUT:${endpointOut}`, "SYS");

    // [Critical Logic]: Assert DTR (Data Terminal Ready)
    // This is key to making Arduino WebUSBSerial() return True and break out of the while loop
    await usbDevice.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: 0x22, // SET_CONTROL_LINE_STATE
      value: 0x01,   // Bit 0 = DTR
      index: interfaceNum
    });
    logDebug("DTR signal asserted.", "SYS");

    // Update UI
    document.getElementById('statusText').innerHTML = `<span class="text-green-600 font-bold">✅ 已連接: ${usbDevice.productName}</span>`;
    document.getElementById('connectBtn').textContent = "重新連線";
    document.getElementById('connectBtn').classList.replace('bg-indigo-500', 'bg-green-500');
    document.getElementById('connectBtn').classList.replace('hover:bg-indigo-600', 'hover:bg-green-600');
    document.getElementById('configArea').classList.remove('opacity-50', 'pointer-events-none');

    // Start read loop and request sync data
    readLoop();
    await sendCmd("GET_ALL\n");

  } catch (err) {
    console.error(err);
    logDebug(`Connection error: ${err.message}`, "ERR");
    document.getElementById('statusText').innerHTML = `<span class="text-red-500 font-bold">❌ 連線失敗: ${err.message}</span>`;
  }
}

async function sendCmd(str) {
  if (!usbDevice) return;
  logDebug(str.trim(), "TX");
  try {
    await usbDevice.transferOut(endpointOut, new TextEncoder().encode(str));
  } catch (err) {
    logDebug(`Transfer out error: ${err}`, "ERR");
  }
}

async function readLoop() {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    logDebug("Starting read loop...", "SYS");
    while (usbDevice && usbDevice.opened) {
      const result = await usbDevice.transferIn(endpointIn, 64);
      buffer += decoder.decode(result.data);

      let nIdx;
      while ((nIdx = buffer.indexOf('\n')) !== -1) {
        parseIncomingData(buffer.substring(0, nIdx));
        buffer = buffer.substring(nIdx + 1);
      }
    }
  } catch (err) {
    logDebug(`USB Read stopped: ${err.message}`, "SYS");
  }
}

function parseIncomingData(data) {
  data = data.trim();
  if (!data) return;

  if (data.startsWith("DBG:")) {
    logDebug(data.substring(4), "MCU");
    return;
  }

  if (data.startsWith("MSC:")) {
    const parts = data.substring(4).split(',');
    if (parts.length >= 3) {
      miscConfig.freq = parseInt(parts[0], 10);
      miscConfig.duty = parseInt(parts[1], 10);
      miscConfig.defProfile = parseInt(parts[2], 10);
    }
    updateMiscUI();
    return;
  }
  if (data.startsWith("OK:SAVED")) {
    logDebug("Settings saved to EEPROM.", "SYS");
    alert("所有的設定已成功寫入晶片 EEPROM！");
    return;
  }

  logDebug(data, "RX");

  if (data.startsWith("PAL:")) {
    // Parse Palette
    const items = data.substring(4).split('|');
    items.forEach((item, i) => {
      if (i >= NUM_PALETTE) return;
      const [hex, name, isDef] = item.split(',');
      if (hex) {
        palettes[i] = {
          hex: hex,
          name: name ? name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 12) : '',
          isDefined: parseInt(isDef || 0)
        };

        const colorEl = document.getElementById(`palColor${i}`);
        if (colorEl) {
          colorEl.value = `#${hex}`;
          const hexEl = document.getElementById(`palHex${i}`);
          if (hexEl) hexEl.value = `#${hex}`;
          document.getElementById(`palName${i}`).value = palettes[i].name;
          document.getElementById(`palDef${i}`).checked = palettes[i].isDefined === 1;
          togglePalette(i); // Update visuals
        }
      }
    });
    updateProfileColorSelectors();
  }
  else if (data.startsWith("PRF:")) {
    // Parse Profile PRF:pIdx:isDef:name:groups|colors
    const parts = data.substring(4).split(':');
    if (parts.length >= 4) {
      const pIdx = parseInt(parts[0]);
      const isDef = parseInt(parts[1]);
      const name = parts[2];
      if (parts[3]) {
        const [grpStr, colStr] = parts[3].split('|');
        profiles[pIdx].isDefined = isDef;
        profiles[pIdx].name = name ? name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 16) : `Profile ${pIdx}`;
        profiles[pIdx].stripGroups = grpStr.split(',').map(Number);
        profiles[pIdx].groupColors = colStr.split(',').map(Number);

        updateProfileSelectLabels();
        if (pIdx.toString() === document.getElementById('profileSelect').value) {
          loadProfileUI(); // Refresh UI if it's the active view
        }
      }
    }
  }
  else if (data.startsWith("OK:")) {
    alert(data === "OK:SAVED" ? "所有的設定已成功寫入晶片 EEPROM！" : "暫存成功");
  }
}

// ======================== Data Saving & Preview Logic ========================

async function previewPaletteColor(hex) {
  await sendCmd(`PRV_PAL:${hex.substring(1).toUpperCase()}\n`);
}

async function savePalette() {
  // To avoid USB buffer overflow, send 16 colors in batches
  for (let i = 0; i < NUM_PALETTE; i++) {
    let hex = document.getElementById(`palColor${i}`).value.substring(1).toUpperCase();
    let name = document.getElementById(`palName${i}`).value.trim().substring(0, 12) || `C${i}`;
    let isDef = palettes[i].isDefined ? 1 : 0;

    await sendCmd(`SAV_PAL:${i}:${hex},${name},${isDef}\n`);
    await new Promise(r => setTimeout(r, 20)); // Give MCU 20ms to process
  }

  // After sending all colors, request MCU to commit to EEPROM
  await sendCmd("COMMIT_EEPROM\n");
  updateProfileColorSelectors();
}

async function previewCurrentProfile() {
  const pIdx = document.getElementById('profileSelect').value;
  let groups = [], colors = [];

  for (let i = 0; i < NUM_STRIPS; i++) {
    groups.push(document.getElementById(`stripGroup${i}`).value);
    colors.push(document.getElementById(`groupColor${i}`).value);
  }

  profiles[pIdx].stripGroups = groups;
  profiles[pIdx].groupColors = colors;
  let isDef = profiles[pIdx].isDefined ? 1 : 0;
  let name = profiles[pIdx].name || `Profile ${pIdx}`;

  updateVisualPreview();

  if (usbDevice) {
    await sendCmd(`SAV_PRF:${pIdx}:${isDef}:${name}:${groups.join(',')}|${colors.join(',')}\n`);
    await sendCmd(`SET_PRF:${pIdx}\n`);
  }
}

async function saveCurrentProfile() {
  await previewCurrentProfile();
  await sendCmd("COMMIT_EEPROM\n");
}

async function saveMisc() {
  miscConfig.freq = parseInt(document.getElementById('strobeFreq').value, 10);
  miscConfig.duty = parseInt(document.getElementById('strobeDuty').value, 10);
  miscConfig.defProfile = parseInt(document.getElementById('defaultProfileSelect').value, 10);

  if (usbDevice) {
    await sendCmd(`SAV_MSC:${miscConfig.freq},${miscConfig.duty},${miscConfig.defProfile}\n`);
    await sendCmd("COMMIT_EEPROM\n");
  }
}

let isStrobePreviewing = false;

async function toggleStrobePreview() {
  isStrobePreviewing = !isStrobePreviewing;
  const btn = document.getElementById('strobePreviewBtn');

  if (isStrobePreviewing) {
    btn.innerHTML = '停止閃爍';
    btn.classList.replace('bg-yellow-400', 'bg-red-500');
    btn.classList.replace('hover:bg-yellow-500', 'hover:bg-red-600');
    btn.classList.replace('text-yellow-900', 'text-white');
  } else {
    btn.innerHTML = '預覽閃爍';
    btn.classList.replace('bg-red-500', 'bg-yellow-400');
    btn.classList.replace('hover:bg-red-600', 'hover:bg-yellow-500');
    btn.classList.replace('text-white', 'text-yellow-900');
  }

  if (usbDevice) {
    const f = document.getElementById('strobeFreq').value;
    const d = document.getElementById('strobeDuty').value;
    const p = document.getElementById('defaultProfileSelect').value;
    await sendCmd(`SAV_MSC:${f},${d},${p}\n`);
    await sendCmd(`PRV_STR:${isStrobePreviewing ? 1 : 0}\n`);
  }
}

async function onStrobeSliderChange() {
  if (isStrobePreviewing && usbDevice) {
    const f = document.getElementById('strobeFreq').value;
    const d = document.getElementById('strobeDuty').value;
    const p = document.getElementById('defaultProfileSelect').value;
    await sendCmd(`SAV_MSC:${f},${d},${p}\n`);
  }
}

// Bind events
document.getElementById('connectBtn').addEventListener('click', connectUSB);

// Init
initUI();

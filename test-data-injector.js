/**
 * test-data-injector.js
 * Auto fills + saves on page load.
 * Button manually refills fields (no auto save on button).
 */

(function () {
"use strict";

if (window.__delugeTestInjectorRunning) return;
window.__delugeTestInjectorRunning = true;

console.log("[TestInject] Script loaded");

const BUTTON_ID   = "deluge-test-data-btn";
const CAMPAIGN_ID = "9876543210";
const COUNTER_KEY = "delugeTestRecordCounter";

const FIELDS = [
    { id: "Crm_Leads_LEADCF27_LInput", key: "fullName"   },
    { id: "Crm_Leads_EMAIL_LInput",     key: "email"      },
    { id: "Crm_Leads_MOBILE_LInput",    key: "mobile"     },
    { id: "Crm_Leads_LEADCF10_LInput",  key: "campaignId" }
];

function getCounter(cb){
    cb(parseInt(localStorage.getItem(COUNTER_KEY) || "1", 10));
}
function saveCounter(v){
    localStorage.setItem(COUNTER_KEY, String(v));
}
function generateData(n){
    return {
        fullName:   "rr test " + n,
        email:      "testrecord" + n + "@testmail.com",
        mobile:     "+9715000" + String(n).padStart(5, "0"),
        campaignId: CAMPAIGN_ID
    };
}

function fillField(fieldId, value){
    console.log("[TestInject] Filling field:", fieldId, value);

    function attempt(tries){
        const input = document.getElementById(fieldId);
        if(!input){
            if(tries > 0){ setTimeout(() => attempt(tries - 1), 200); return; }
            console.error("[TestInject] Field never appeared:", fieldId);
            return;
        }
        const lyteInput = input.closest("lyte-input");
        if(!lyteInput){
            console.warn("[TestInject] lyte-input wrapper missing:", fieldId);
            return;
        }
        const component = lyteInput.component;
        if(component && typeof component.setData === "function"){
            component.setData("ltPropValue", value);
            return;
        }
        if(tries > 0){ setTimeout(() => attempt(tries - 1), 200); return; }
        // fallback
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("input",  { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    attempt(15);
}

// ── Fill only (used by button) ──
function fillOnly(btn){
    if(btn){ btn.textContent = "Filling..."; btn.disabled = true; }

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    setTimeout(function(){
        window.scrollTo({ top: 0, behavior: "smooth" });
        getCounter(function(n){
            const data = generateData(n);
            let idx = 0;
            function next(){
                if(idx >= FIELDS.length){
                    saveCounter(n + 1);
                    if(btn){
                        btn.textContent = "✓ Filled #" + n;
                        btn.style.background = "#2e7d32";
                        setTimeout(function(){
                            btn.textContent = "🧪 Fill Test Data";
                            btn.style.background = "#6a1b9a";
                            btn.disabled = false;
                        }, 2000);
                    }
                    return;
                }
                const field = FIELDS[idx++];
                fillField(field.id, data[field.key]);
                setTimeout(next, 500);
            }
            next();
        });
    }, 1000);
}

// ── Fill + Save (used on page load + button) ──
function fillAndSave(btn){
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    setTimeout(function(){
        window.scrollTo({ top: 0, behavior: "smooth" });
        getCounter(function(n){
            const data = generateData(n);
            let idx = 0;
            function next(){
                if(idx >= FIELDS.length){
                    saveCounter(n + 1);
                    if(btn){
                        btn.textContent = "✓ Saving...";
                        btn.style.background = "#1565c0";
                        btn.disabled = true;
                    }
                    console.log("[TestInject] All fields filled, saving in 1.5s...");
                    setTimeout(function(){
                        const saveBtn = document.getElementById("crm_create_savebutn")
                                     || document.querySelector('[data-zcqa="save"] button')
                                     || document.querySelector(".lytePrimaryBtn");
                        if(saveBtn){
                            console.log("[TestInject] Clicking Save...");
                            saveBtn.click();
                        } else {
                            console.warn("[TestInject] Save button not found");
                        }
                        if(btn){
                            setTimeout(function(){
                                btn.textContent = "🧪 Fill Test Data";
                                btn.style.background = "#6a1b9a";
                                btn.disabled = false;
                            }, 1000);
                        }
                    }, 1500);
                    return;
                }
                const field = FIELDS[idx++];
                fillField(field.id, data[field.key]);
                setTimeout(next, 500);
            }
            next();
        });
    }, 1000);
}

// ── Button (fill only, no auto-save) ──
function createButton(){
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.textContent = "🧪 Fill Test Data";
    btn.style.cssText =
        "background:#6a1b9a;color:#fff;border:none;border-radius:4px;padding:0 14px;" +
        "height:32px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;" +
        "margin-right:8px;vertical-align:middle;transition:background 0.2s;";
    return btn;
}

function injectButton(){
    if(document.getElementById(BUTTON_ID)) return true;
    const saveBtn = document.getElementById("crm_create_savebutn")
                 || document.querySelector('[data-zcqa="save"] button')
                 || document.querySelector(".lytePrimaryBtn");
    if(!saveBtn) return false;
    const lyteBtn = saveBtn.closest("lyte-button") || saveBtn.parentElement;
    if(!lyteBtn || !lyteBtn.parentElement) return false;

    const btn = createButton();
    btn.addEventListener("mousedown", function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        fillOnly(btn);
    }, true);
    btn.addEventListener("mouseenter", () => { btn.style.background = "#7b1fa2"; }, true);
    btn.addEventListener("mouseleave", () => { if(!btn.disabled) btn.style.background = "#6a1b9a"; }, true);

    lyteBtn.parentElement.insertBefore(btn, lyteBtn);
    console.log("[TestInject] Button injected");
    return true;
}

if(!window.location.href.includes("/tab/Leads/create")) return;

// Inject button
if(!injectButton()){
    let tries = 0;
    const iv = setInterval(function(){
        if(injectButton() || ++tries >= 40) clearInterval(iv);
    }, 500);
}

// Auto fill on page load after 2.5s
setTimeout(function(){
    const btn = document.getElementById(BUTTON_ID);
    fillOnly(btn);
}, 2500);

})();
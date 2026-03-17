/**
 * test-data-injector.js
 * Fills Zoho Create Lead form with sequential test data.
 */

(function () {
"use strict";

if (window.__delugeTestInjectorRunning) return;
window.__delugeTestInjectorRunning = true;

console.log("[TestInject] Script loaded");

const BUTTON_ID = "deluge-test-data-btn";
const CAMPAIGN_ID = "9876543210";
const COUNTER_KEY = "delugeTestRecordCounter";

const FIELDS = [
    { id: "Crm_Leads_LEADCF27_LInput", key: "fullName" },
    { id: "Crm_Leads_EMAIL_LInput", key: "email" },
    { id: "Crm_Leads_MOBILE_LInput", key: "mobile" },
    { id: "Crm_Leads_LEADCF10_LInput", key: "campaignId" }
];

function getCounter(cb){
    cb(parseInt(localStorage.getItem(COUNTER_KEY) || "1", 10));
}

function saveCounter(v){
    localStorage.setItem(COUNTER_KEY, String(v));
}

function generateData(n){
    return {
        fullName: "rr test " + n,
        email: "testrecord" + n + "@testmail.com",
        mobile: "+9715000" + String(n).padStart(5,"0"),
        campaignId: CAMPAIGN_ID
    };
}

function fillField(fieldId, value){
    console.log("[TestInject] Filling field:", fieldId, value);

    function attempt(tries){
        const input = document.getElementById(fieldId);

        if(!input){
            if(tries > 0){
                console.warn("[TestInject] Field not in DOM yet, retrying:", fieldId);
                setTimeout(() => attempt(tries - 1), 200);
                return;
            }
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
            console.log("[TestInject] setData used for", fieldId);
            return;
        }

        // Component not ready yet — retry
        if(tries > 0){
            console.warn("[TestInject] Component not ready, retrying:", fieldId);
            setTimeout(() => attempt(tries - 1), 200);
            return;
        }

        // Final fallback: native setter
        console.warn("[TestInject] Falling back to native setter for", fieldId);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    attempt(15); // retry up to 15 times × 200ms = 3 seconds max wait
}

function fillTestData(){
    console.log("[TestInject] fillTestData called");

    const btn = document.getElementById(BUTTON_ID);
    if(btn){ btn.textContent = "Filling..."; btn.disabled = true; }

    // ✅ Scroll to bottom so all fields render, then fill
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

    setTimeout(function(){
        window.scrollTo({ top: 0, behavior: "smooth" });

        getCounter(function(n){
            const data = generateData(n);
            console.log("[TestInject] Filling record #" + n, data);

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
    }, 1000); // wait 1s for lazy fields to render after scroll
}

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

    const saveBtn =
        document.getElementById("crm_create_savebutn") ||
        document.querySelector('[data-zcqa="save"] button') ||
        document.querySelector(".lytePrimaryBtn");

    if(!saveBtn) return false;

    const lyteBtn = saveBtn.closest("lyte-button") || saveBtn.parentElement;
    if(!lyteBtn || !lyteBtn.parentElement) return false;

    const btn = createButton();

    // ✅ mousedown instead of click — Zoho swallows click events but not mousedown
    btn.addEventListener("mousedown", function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        fillTestData();
    }, true);

    // hover feedback
    btn.addEventListener("mouseenter", function(){
        btn.style.background = "#7b1fa2";
    }, true);

    btn.addEventListener("mouseleave", function(){
        if(!btn.disabled) btn.style.background = "#6a1b9a";
    }, true);

    lyteBtn.parentElement.insertBefore(btn, lyteBtn);
    console.log("[TestInject] Button injected");

    return true;
}

if(!window.location.href.includes("/tab/Leads/create")) return;

if(!injectButton()){
    let tries = 0;
    const iv = setInterval(() => {
        if(injectButton() || ++tries >= 40) clearInterval(iv);
    }, 500);
}

})();
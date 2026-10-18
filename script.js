/* ---------- Helpers ---------- */

let pageFlipInstance = null;
let lastFocused = null;
let quizState = null;

const $ = (id) => document.getElementById(id);

// Used by the WhatsApp share buttons. Change it if your site address changes.
const SITE_URL = "https://satyammahore.github.io/Mystic-English/";

// Display names for each topic id. The ids stay the same, so your data files
// (e.g. data/Model_data.json) keep working without renaming.
const TOPIC_NAMES = {
    tense: "Tenses",
    model: "Modals",
    preposition: "Prepositions",
    article: "Articles",
    determiners: "Determiners"
};

function topicName(topic) {
    return TOPIC_NAMES[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
}

function formatFileName(topic, type) {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return capitalizedTopic + "_" + type + ".json";
}

let toastTimer = null;
function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

function openOverlay(overlay) {
    lastFocused = document.activeElement;
    overlay.classList.add("active");
    const closeBtn = overlay.querySelector(".close-btn");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function closeOverlay(overlay) {
    overlay.classList.remove("active");
    if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus({ preventScroll: true });
    }
}

/* ---------- Saved progress (stays on this phone only) ---------- */

const STORE_KEY = "mysticenglish:v1";

function emptyStore() {
    return { lessons: {}, quizzes: {}, wrong: {}, streak: { count: 0, last: "" } };
}

function loadStore() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null") || {};
        const base = emptyStore();
        const obj = (v, fallback) => (v && typeof v === "object" ? v : fallback);
        return {
            lessons: obj(raw.lessons, base.lessons),
            quizzes: obj(raw.quizzes, base.quizzes),
            wrong: obj(raw.wrong, base.wrong),
            streak: obj(raw.streak, base.streak)
        };
    } catch (e) {
        return emptyStore();   // storage blocked or data damaged: start fresh instead of crashing
    }
}

function saveStore(store) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* private mode or storage full: the app still works, just doesn't remember */ }
}

function dateKey(d) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
}

function yesterdayKey(now) {
    return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

// A streak day counts when the student opens a lesson, quiz or revision, not just the site.
function touchStreak() {
    const store = loadStore();
    const now = new Date();
    const today = dateKey(now);
    if (store.streak.last === today) return;
    const continued = store.streak.last === yesterdayKey(now);
    store.streak.count = continued ? (Number(store.streak.count) || 0) + 1 : 1;
    store.streak.last = today;
    saveStore(store);
}

function currentStreak(store) {
    const now = new Date();
    const last = store.streak.last;
    return last === dateKey(now) || last === yesterdayKey(now) ? Number(store.streak.count) || 0 : 0;
}

function markLessonDone(topic) {
    const store = loadStore();
    if (store.lessons[topic]) return;
    store.lessons[topic] = true;
    saveStore(store);
    refreshHome();
}

function saveQuizResult(topic, correct, total) {
    const store = loadStore();
    const best = store.quizzes[topic];
    if (!best || correct / total > best.correct / best.total) {
        store.quizzes[topic] = { correct: correct, total: total };
    }
    store.lessons[topic] = true;
    saveStore(store);
    refreshHome();
}

function addWrong(topic, item) {
    const store = loadStore();
    const list = store.wrong[topic] || (store.wrong[topic] = []);
    const entry = { topic: topic, question: item.question, options: item.options, answer: item.answer };
    if (item.explanation) entry.explanation = item.explanation;
    const i = list.findIndex((q) => q.question === item.question);
    if (i >= 0) list[i] = entry;
    else list.push(entry);
    saveStore(store);
}

function removeWrong(topic, item) {
    const store = loadStore();
    const list = store.wrong[topic];
    if (!list) return;
    const next = list.filter((q) => q.question !== item.question);
    if (next.length === list.length) return;
    if (next.length) store.wrong[topic] = next;
    else delete store.wrong[topic];
    saveStore(store);
}

function getReviseItems() {
    const store = loadStore();
    return Object.keys(store.wrong).flatMap((topic) => store.wrong[topic]);
}

// Updates the ticks, scores, Revise count and streak shown on the home screen.
function refreshHome() {
    const store = loadStore();

    document.querySelectorAll("[data-topic]").forEach((btn) => {
        const status = btn.querySelector(".status");
        if (!status) return;
        const topic = btn.dataset.topic;
        const best = store.quizzes[topic];
        let text = store.lessons[topic] || best ? "✓" : "";
        if (best) text += " " + best.correct + "/" + best.total;
        status.textContent = text;
    });

    const toRevise = Object.keys(store.wrong).reduce((n, t) => n + store.wrong[t].length, 0);
    $("reviseCount").textContent = toRevise ? String(toRevise) : "";

    const streak = currentStreak(store);
    $("streakChip").textContent = streak ? "🔥 " + streak + "-day streak" : "🔥 Start a streak today";
}

/* ---------- WhatsApp sharing ---------- */

function openWhatsApp(text) {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}

function shareSite() {
    openWhatsApp("English grammar Hindi aur English dono me seekhne ke liye ye free site dekho: MysticEnglish ✦ " + SITE_URL);
}

function shareScore() {
    if (!quizState || quizState.mode !== "quiz") return;
    openWhatsApp(
        "Maine MysticEnglish pe " + topicName(quizState.topic) + " quiz me " +
        quizState.correct + "/" + quizState.total + " score kiya! Tum bhi try karo: " + SITE_URL
    );
}

/* ---------- Background video ---------- */

// Skip the video on Data Saver or reduced-motion. The poster image stays as a still background.
(function setupVideo() {
    const video = $("bg-video");
    if (!video) return;
    const saveData = navigator.connection && navigator.connection.saveData;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (saveData || reduceMotion) {
        video.pause();
        video.removeAttribute("autoplay");
        video.querySelectorAll("source").forEach((s) => s.remove());
        video.load();
    }
})();

/* ---------- Home menu ---------- */

function setMenu(menu, button, open) {
    menu.classList.toggle("open", open);
    menu.style.maxHeight = open ? menu.scrollHeight + "px" : null;
    if (button) button.setAttribute("aria-expanded", String(open));
}

// One submenu open at a time, so the list never outgrows a small screen.
function toggleMenu(id, button) {
    const target = $(id);
    const willOpen = !target.classList.contains("open");
    document.querySelectorAll(".submenu").forEach((menu) => {
        const btn = document.querySelector('[aria-controls="' + menu.id + '"]');
        setMenu(menu, btn, menu === target && willOpen);
    });
}

/* ---------- Lesson book ---------- */

async function openBook(topic) {
    const overlay = $("bookOverlay");
    const wrapper = document.querySelector(".book-wrapper");

    if (pageFlipInstance !== null) {
        try { pageFlipInstance.destroy(); } catch (e) { /* already gone */ }
        pageFlipInstance = null;
    }

    wrapper.innerHTML = '<div id="magicalBook"></div>';
    const bookEl = $("magicalBook");

    try {
        const response = await fetch("data/" + formatFileName(topic, "data"));
        if (!response.ok) throw new Error("Lesson file not found");

        const contentPages = await response.json();
        const name = topicName(topic);

        contentPages.forEach((text, index) => {
            const pageDiv = document.createElement("div");
            pageDiv.className = "page";

            let extraHTML = "";
            if (index === contentPages.length - 1) {
                extraHTML = `
                <div class="start-quiz-wrap">
                    <button class="capsule-btn start-quiz-btn" onclick="openQuiz('${topic}')">
                        Start quiz ✦
                    </button>
                </div>`;
            }

            // Page text is trusted content from your own JSON, so HTML such as <b> still works.
            pageDiv.innerHTML = `
                <div class="page-content">
                    <h2 class="page-title">${name} – Page ${index + 1}</h2>
                    <div class="page-text">${text}</div>
                    ${extraHTML}
                </div>
            `;
            bookEl.appendChild(pageDiv);
        });

        openOverlay(overlay);
        touchStreak();
        refreshHome();

        // Size the pages from the real frame so the text card fills it (no empty brown area).
        const cs = getComputedStyle(wrapper);
        const innerW = wrapper.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const innerH = wrapper.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const isSpread = innerW >= 640;                       // two pages side by side
        const pageW = Math.floor(isSpread ? innerW / 2 : innerW);
        const pageH = Math.floor(innerH);

        pageFlipInstance = new St.PageFlip(bookEl, {
            width: pageW,
            height: pageH,
            size: "stretch",
            minWidth: Math.min(320, pageW),
            maxWidth: pageW,
            minHeight: Math.min(300, pageH),
            maxHeight: pageH,
            showCover: false,
            mobileScrollSupport: true,
            usePortrait: true,
            swipeDistance: 60
        });

        pageFlipInstance.loadFromHTML(document.querySelectorAll(".page"));

        // Reaching the last page counts as finishing the lesson. Opening the quiz also counts,
        // so the tick still appears if this event ever behaves differently.
        try {
            const flipper = pageFlipInstance;
            flipper.on("flip", (e) => {
                const portrait = flipper.getOrientation() === "portrait";
                const lastIndex = contentPages.length - (portrait ? 1 : 2);
                if (e.data >= lastIndex) markLessonDone(topic);
            });
        } catch (e) { /* progress tick is optional */ }
    } catch (error) {
        console.error("Error:", error);
        showToast("Couldn't load this lesson. Check your connection and try again.");
    }
}

function closeBook() {
    closeOverlay($("bookOverlay"));
}

/* ---------- Quiz and Revise ---------- */

function startSession(items, state) {
    const quizContent = $("quizContent");
    quizState = Object.assign({ total: items.length, answered: 0, correct: 0 }, state);
    quizContent.innerHTML = "";
    items.forEach((item, index) => quizContent.appendChild(buildQuestion(item, index)));
    quizContent.scrollTop = 0;
    updateProgress();
    $("quizProgress").hidden = false;
}

async function openQuiz(topic) {
    const quizOverlay = $("quizOverlay");
    const quizContent = $("quizContent");

    quizContent.innerHTML = '<p class="quiz-status">Loading your quiz…</p>';
    $("quizProgress").hidden = true;
    $("quizTitle").textContent = topicName(topic) + " quiz ✦";
    if (!quizOverlay.classList.contains("active")) openOverlay(quizOverlay);

    markLessonDone(topic);
    touchStreak();
    refreshHome();

    try {
        const response = await fetch("data/" + formatFileName(topic, "quiz"));
        if (!response.ok) throw new Error("Quiz file not found");

        const quizData = await response.json();
        startSession(quizData, { mode: "quiz", topic: topic });
    } catch (error) {
        console.error("Error:", error);
        quizContent.innerHTML =
            '<p class="quiz-status quiz-error">Couldn\'t load this quiz. Check your connection and try again.</p>';
    }
}

// Shows every question the student got wrong earlier, across all topics.
function openRevise() {
    const quizOverlay = $("quizOverlay");
    const quizContent = $("quizContent");

    $("quizTitle").textContent = "Revise ✦";
    if (!quizOverlay.classList.contains("active")) openOverlay(quizOverlay);

    const items = getReviseItems();
    if (!items.length) {
        quizState = null;
        $("quizProgress").hidden = true;
        quizContent.innerHTML =
            '<p class="quiz-status">Nothing to revise yet. Questions you miss in a quiz will show up here.</p>';
        return;
    }

    touchStreak();
    startSession(items, { mode: "revise", topic: null });
    refreshHome();
}

// Options are built with DOM methods, so quotes or apostrophes in an option (like "don't")
// can no longer break the buttons.
function buildQuestion(item, index) {
    const box = document.createElement("div");
    box.className = "quiz-question-box";

    const question = document.createElement("p");
    question.className = "quiz-question";
    question.innerHTML = "Q" + (index + 1) + ". " + item.question;

    const options = document.createElement("div");
    options.className = "quiz-options";

    const feedback = document.createElement("p");
    feedback.className = "quiz-feedback";
    feedback.setAttribute("role", "status");
    feedback.hidden = true;

    item.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => checkAnswer(btn, opt, item, options, feedback));
        options.appendChild(btn);
    });

    box.append(question, options, feedback);
    return box;
}

function checkAnswer(button, selected, item, optionsEl, feedbackEl) {
    if (optionsEl.classList.contains("answered")) return;
    optionsEl.classList.add("answered");

    const isCorrect = selected === item.answer;

    optionsEl.querySelectorAll(".quiz-option-btn").forEach((btn) => {
        if (btn.textContent === item.answer) btn.classList.add("correct");
    });
    if (!isCorrect) button.classList.add("wrong");

    // Feedback is text too, so it doesn't rely on color alone.
    // Add an optional "explanation" field to any question in your quiz JSON to show it here.
    const note = item.explanation ? " " + item.explanation : "";
    feedbackEl.hidden = false;
    feedbackEl.classList.add(isCorrect ? "is-correct" : "is-wrong");
    feedbackEl.textContent = isCorrect
        ? "✓ Correct!" + note
        : "✗ Not quite. The answer is “" + item.answer + "”." + note;

    // Wrong answers go to the Revise list; a correct answer clears that question from it.
    const topic = item.topic || quizState.topic;
    if (isCorrect) removeWrong(topic, item);
    else addWrong(topic, item);
    refreshHome();

    quizState.answered += 1;
    if (isCorrect) quizState.correct += 1;
    updateProgress();

    if (quizState.answered === quizState.total) showQuizResult();
}

function updateProgress() {
    if (!quizState) return;
    const pct = quizState.total ? (quizState.answered / quizState.total) * 100 : 0;
    $("quizProgressFill").style.width = pct + "%";
    $("quizProgressText").textContent =
        quizState.answered + " of " + quizState.total + " answered · Score " + quizState.correct;
}

function showQuizResult() {
    const quizContent = $("quizContent");
    const { mode, correct, total, topic } = quizState;
    const card = document.createElement("div");
    card.className = "quiz-result";

    if (mode === "quiz") {
        saveQuizResult(topic, correct, total);
        const percent = Math.round((correct / total) * 100);
        const message = percent >= 80 ? "Great work!" : "Review the lesson, then try again.";
        card.innerHTML = `
            <h3>Quiz complete</h3>
            <p class="quiz-result-score">${correct} / ${total} (${percent}%)</p>
            <p>${message}</p>
            <div class="quiz-result-actions">
                <button type="button" class="action-btn primary" id="retryQuiz">Try again</button>
                <button type="button" class="action-btn" id="shareScore">Share on WhatsApp</button>
                <button type="button" class="action-btn" id="backToLesson">Back to lesson</button>
            </div>`;
        quizContent.appendChild(card);
        $("retryQuiz").addEventListener("click", () => openQuiz(topic));
        $("shareScore").addEventListener("click", shareScore);
        $("backToLesson").addEventListener("click", closeQuiz);
    } else {
        const remaining = getReviseItems().length;
        const message = remaining
            ? remaining + (remaining === 1 ? " question still needs" : " questions still need") + " practice."
            : "All cleared. Great work!";
        card.innerHTML = `
            <h3>Revision complete</h3>
            <p class="quiz-result-score">${correct} / ${total}</p>
            <p>${message}</p>
            <div class="quiz-result-actions">
                ${remaining ? '<button type="button" class="action-btn primary" id="reviseAgain">Revise again</button>' : ""}
                <button type="button" class="action-btn" id="closeRevise">Close</button>
            </div>`;
        quizContent.appendChild(card);
        const again = $("reviseAgain");
        if (again) again.addEventListener("click", openRevise);
        $("closeRevise").addEventListener("click", closeQuiz);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
}

function closeQuiz() {
    closeOverlay($("quizOverlay"));
    refreshHome();
}

/* ---------- PDF notes ---------- */

// Phones and tablets can't show a PDF inside an iframe (Android Chrome shows an empty box,
// iOS shows only page 1), so they get a clear Open / Download card instead.
function canPreviewPdf() {
    return navigator.pdfViewerEnabled === true &&
        !window.matchMedia("(pointer: coarse)").matches;
}

function openPdfModal(pdfPath, title) {
    const inline = canPreviewPdf();
    const fileName = pdfPath.split("/").pop();

    $("pdfTitle").textContent = title + " ✦";
    $("pdfFileName").textContent = fileName;

    $("pdfOpenLink").href = pdfPath;
    $("pdfDownloadLink").href = pdfPath;
    $("pdfDownloadLink").setAttribute("download", fileName);

    $("pdfModal").classList.toggle("compact", !inline);
    $("pdfContainer").hidden = !inline;
    $("pdfFallback").hidden = inline;
    $("pdfViewer").src = inline ? pdfPath : "about:blank";

    openOverlay($("pdfOverlay"));
}

function closePdfModal() {
    closeOverlay($("pdfOverlay"));
    $("pdfViewer").src = "about:blank";
}

/* ---------- Close with Esc or by tapping the dark backdrop ---------- */

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("pdfOverlay").classList.contains("active")) closePdfModal();
    else if ($("quizOverlay").classList.contains("active")) closeQuiz();
    else if ($("bookOverlay").classList.contains("active")) closeBook();
});

[
    ["bookOverlay", closeBook],
    ["quizOverlay", closeQuiz],
    ["pdfOverlay", closePdfModal]
].forEach(([id, closeFn]) => {
    const overlay = $(id);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeFn();
    });
});

/* ---------- Install as an app + offline support ---------- */

let installEvent = null;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    $("installBtn").hidden = false;
});

$("installBtn").addEventListener("click", async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch (e) { /* dismissed */ }
    installEvent = null;
    $("installBtn").hidden = true;
});

window.addEventListener("appinstalled", () => {
    $("installBtn").hidden = true;
});

// Skipped on localhost so cached files never hide your latest edits while you work.
// To test offline mode locally, open the page with ?pwa at the end of the address.
const isLocalDev = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const forcePwa = new URLSearchParams(location.search).has("pwa");
if ("serviceWorker" in navigator && (!isLocalDev || forcePwa)) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { /* needs https; ignore elsewhere */ });
    });
}

refreshHome();

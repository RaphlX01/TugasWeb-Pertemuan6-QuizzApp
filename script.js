"use strict";

/* =========================================================
 * 1. KONFIGURASI
 * ======================================================= */
const CONFIG = {
  QUIZ_LENGTH: 5,           // jumlah soal per putaran
  TIME_PER_QUESTION: 15,    // detik
  TRANSITION_MS: 220,       // harus sama dengan durasi .is-leaving di CSS
  ALL_CATEGORIES: "Campuran",
  HIGH_SCORE_KEY: "quiz-app:high-score",
  THEME_KEY: "quiz-app:theme",
};

const CHOICE_LETTERS = ["A", "B", "C", "D"];

const RESULT_MESSAGES = [
  { min: 80, text: "Luar biasa!" },
  { min: 60, text: "Bagus, sedikit lagi!" },
  { min: 0, text: "Terus berlatih, Anda pasti bisa." },
];

/* =========================================================
 * 2. BANK SOAL (answer = indeks jawaban benar pada options)
 * ======================================================= */
const QUESTIONS = [
  // JavaScript
  { category: "JavaScript", question: "Keyword mana yang dipakai untuk mendeklarasikan variabel yang tidak boleh di-assign ulang?", options: ["var", "let", "const", "static"], answer: 2 },
  { category: "JavaScript", question: "Apa hasil dari typeof null di JavaScript?", options: ["\"null\"", "\"object\"", "\"undefined\"", "\"number\""], answer: 1 },
  { category: "JavaScript", question: "Array method mana yang membuat array baru dari hasil transformasi setiap elemen?", options: ["filter()", "forEach()", "map()", "reduce()"], answer: 2 },
  { category: "JavaScript", question: "Apa hasil dari \"5\" + 3 di JavaScript?", options: ["8", "\"53\"", "NaN", "Error"], answer: 1 },
  { category: "JavaScript", question: "Apa perbedaan utama == dan ===?", options: ["=== tidak melakukan konversi tipe", "=== hanya berlaku untuk angka", "== lebih ketat daripada ===", "Tidak ada perbedaan"], answer: 0 },
  { category: "JavaScript", question: "Fungsi mana yang mengubah string JSON menjadi objek JavaScript?", options: ["JSON.parse()", "JSON.stringify()", "JSON.decode()", "Object.fromJSON()"], answer: 0 },

  // HTML & CSS
  { category: "HTML & CSS", question: "Tag HTML5 mana yang semantik untuk blok navigasi utama?", options: ["<menu>", "<links>", "<nav>", "<header>"], answer: 2 },
  { category: "HTML & CSS", question: "Properti CSS mana yang mengubah warna latar belakang elemen?", options: ["color", "background-color", "fill", "bgcolor"], answer: 1 },
  { category: "HTML & CSS", question: "Nilai display apa yang mengaktifkan Flexbox?", options: ["flexible", "box", "flex", "block-flex"], answer: 2 },
  { category: "HTML & CSS", question: "Atribut mana yang menyediakan teks alternatif pada tag <img>?", options: ["title", "src", "caption", "alt"], answer: 3 },
  { category: "HTML & CSS", question: "Satuan CSS mana yang relatif terhadap ukuran font elemen root?", options: ["em", "rem", "px", "vh"], answer: 1 },
  { category: "HTML & CSS", question: "Selector mana yang memilih elemen dengan class \"card\"?", options: ["#card", "card", "*card", ".card"], answer: 3 },

  // Web Umum
  { category: "Web Umum", question: "Kode status HTTP mana yang berarti halaman tidak ditemukan?", options: ["200", "301", "404", "500"], answer: 2 },
  { category: "Web Umum", question: "Apa kepanjangan dari API?", options: ["Application Programming Interface", "Applied Program Integration", "Automated Process Interface", "Application Protocol Index"], answer: 0 },
  { category: "Web Umum", question: "Penyimpanan browser mana yang datanya tetap ada setelah browser ditutup?", options: ["sessionStorage", "Variabel JavaScript", "localStorage", "Node pada DOM"], answer: 2 },
  { category: "Web Umum", question: "Protokol mana yang mengenkripsi lalu lintas data antara browser dan server?", options: ["HTTP", "HTTPS", "FTP", "SMTP"], answer: 1 },
  { category: "Web Umum", question: "Bahasa apa yang dipakai untuk mengatur tampilan dan tata letak halaman web?", options: ["SQL", "JSON", "CSS", "XML"], answer: 2 },
  { category: "Web Umum", question: "Apa kepanjangan dari DOM?", options: ["Data Object Mapping", "Digital Order Module", "Document Oriented Markup", "Document Object Model"], answer: 3 },
];

/* =========================================================
 * 3. STATE
 * ======================================================= */
const state = {
  category: null,
  questions: [],
  index: 0,
  score: 0,
  answers: [],     // "correct" | "wrong" | "timeout" per soal
  answered: false,
  timerId: null,
};

/* =========================================================
 * 4. UTILITAS
 * ======================================================= */

// Helper pembuat elemen: hanya memakai createElement + textContent (tanpa innerHTML)
const createEl = (tag, { className, text, attrs = {}, dataset = {} } = {}, children = []) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  Object.entries(dataset).forEach(([key, value]) => { node.dataset[key] = value; });
  node.append(...children);
  return node;
};

// Fisher-Yates shuffle (tidak mengubah array asli)
const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Pilih soal sesuai kategori, acak urutan soal DAN urutan pilihan jawaban
const buildQuiz = (category) => {
  const pool = category === CONFIG.ALL_CATEGORIES
    ? QUESTIONS
    : QUESTIONS.filter((q) => q.category === category);

  return shuffle(pool)
    .slice(0, CONFIG.QUIZ_LENGTH)
    .map((q) => ({
      category: q.category,
      question: q.question,
      options: shuffle(q.options.map((text, i) => ({ text, isCorrect: i === q.answer }))),
    }));
};

const currentQuestion = () => state.questions[state.index];

/* =========================================================
 * 5. LOCAL STORAGE (high score & tema)
 * ======================================================= */
const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch { /* abaikan jika storage diblokir */ }
  },
};

const loadHighScore = () => Number(storage.get(CONFIG.HIGH_SCORE_KEY, 0)) || 0;
const saveHighScore = (score) => storage.set(CONFIG.HIGH_SCORE_KEY, score);

/* =========================================================
 * 6. REFERENSI DOM
 * ======================================================= */
const $ = (id) => document.getElementById(id);
const els = {
  views: { start: $("view-start"), quiz: $("view-quiz"), result: $("view-result") },
  themeToggle: $("theme-toggle"),
  rules: $("rules"),
  startHighScore: $("start-high-score"),
  categoryList: $("category-list"),
  progressLabel: $("progress-label"),
  progressTrack: $("progress-track"),
  progressFill: $("progress-fill"),
  timer: $("timer"),
  timerFill: $("timer-fill"),
  timerText: $("timer-text"),
  quizCard: $("quiz-card"),
  questionCategory: $("question-category"),
  questionText: $("question-text"),
  choices: $("choices"),
  feedback: $("feedback"),
  nextBtn: $("next-btn"),
  quitBtn: $("quit-btn"),
  resultScore: $("result-score"),
  resultMessage: $("result-message"),
  resultBadge: $("result-badge"),
  resultStats: $("result-stats"),
  resultHighScore: $("result-high-score"),
  restartBtn: $("restart-btn"),
  changeCategoryBtn: $("change-category-btn"),
};

/* =========================================================
 * 7. RENDERING
 * ======================================================= */
const showView = (name) => {
  Object.entries(els.views).forEach(([key, section]) => { section.hidden = key !== name; });
};

const renderStart = () => {
  els.rules.textContent =
    `Setiap putaran berisi ${CONFIG.QUIZ_LENGTH} soal pilihan ganda dengan waktu ${CONFIG.TIME_PER_QUESTION} detik per soal.`;
  els.startHighScore.textContent = `Skor tertinggi: ${loadHighScore()} / ${CONFIG.QUIZ_LENGTH}`;

  const categories = [CONFIG.ALL_CATEGORIES, ...new Set(QUESTIONS.map((q) => q.category))];
  els.categoryList.replaceChildren(
    ...categories.map((name) =>
      createEl("button", { className: "btn category", text: name, attrs: { type: "button" }, dataset: { category: name } })
    )
  );
};

const renderQuestion = () => {
  const q = currentQuestion();
  const total = state.questions.length;
  const percent = Math.round(((state.index + 1) / total) * 100);

  els.progressLabel.textContent = `Soal ${state.index + 1} dari ${total}`;
  els.progressFill.style.width = `${percent}%`;
  els.progressTrack.setAttribute("aria-valuenow", String(percent));

  els.questionCategory.textContent = q.category;
  els.questionText.textContent = q.question;

  // Pilihan jawaban dibangun dengan createElement + textContent
  els.choices.replaceChildren(
    ...q.options.map((option, i) =>
      createEl("button", { className: "choice", attrs: { type: "button" }, dataset: { index: String(i) } }, [
        createEl("span", { className: "choice__letter", text: CHOICE_LETTERS[i], attrs: { "aria-hidden": "true" } }),
        createEl("span", { className: "choice__text", text: option.text }),
        createEl("span", { className: "choice__mark", attrs: { "aria-hidden": "true" } }),
      ])
    )
  );

  els.feedback.textContent = "";
  els.nextBtn.hidden = true;
  els.nextBtn.disabled = false;
  els.nextBtn.textContent = state.index === total - 1 ? "Lihat skor" : "Soal berikutnya";
  state.answered = false;

  playEnterAnimation();
  startTimer();
};

// Feedback visual instan: hijau = benar, merah = salah (+ tanda ✓/✗ agar tidak hanya bergantung pada warna)
const markChoices = (selectedIndex) => {
  Array.from(els.choices.children).forEach((button, i) => {
    const isCorrect = currentQuestion().options[i].isCorrect;
    const mark = button.querySelector(".choice__mark");
    button.disabled = true;

    if (isCorrect) {
      button.classList.add("is-correct");
      mark.textContent = "✓";
    } else if (i === selectedIndex) {
      button.classList.add("is-wrong");
      mark.textContent = "✗";
    }
  });
};

const renderResult = (isNewBest) => {
  const total = state.questions.length;
  const percent = (state.score / total) * 100;

  els.resultScore.textContent = `${state.score} / ${total}`;
  els.resultMessage.textContent = RESULT_MESSAGES.find((m) => percent >= m.min).text;
  els.resultBadge.hidden = !isNewBest;
  els.resultBadge.textContent = "Skor tertinggi baru!";
  els.resultHighScore.textContent = `Skor tertinggi: ${loadHighScore()} / ${CONFIG.QUIZ_LENGTH}`;

  const stats = [
    { type: "correct", label: "Benar" },
    { type: "wrong", label: "Salah" },
    { type: "timeout", label: "Waktu habis" },
  ];
  els.resultStats.replaceChildren(
    ...stats.map(({ type, label }) =>
      createEl("li", { className: `stat stat--${type}` }, [
        createEl("span", { className: "stat__value", text: String(state.answers.filter((a) => a === type).length) }),
        createEl("span", { className: "stat__label", text: label }),
      ])
    )
  );
};

/* =========================================================
 * 8. ANIMASI TRANSISI
 * ======================================================= */
const playEnterAnimation = () => {
  els.quizCard.classList.remove("is-leaving", "is-entering");
  void els.quizCard.offsetWidth; // paksa reflow agar animasi bisa diputar ulang
  els.quizCard.classList.add("is-entering");
};

const playLeaveAnimation = () => {
  els.quizCard.classList.remove("is-entering");
  els.quizCard.classList.add("is-leaving");
  return new Promise((resolve) => setTimeout(resolve, CONFIG.TRANSITION_MS));
};

/* =========================================================
 * 9. TIMER PER SOAL
 * ======================================================= */
const stopTimer = () => {
  clearInterval(state.timerId);
  state.timerId = null;
};

const startTimer = () => {
  stopTimer();
  const duration = CONFIG.TIME_PER_QUESTION * 1000;
  const deadline = Date.now() + duration;

  const tick = () => {
    const remaining = Math.max(0, deadline - Date.now());
    els.timerFill.style.transform = `scaleX(${remaining / duration})`;
    els.timerText.textContent = `${Math.ceil(remaining / 1000)} dtk`;
    els.timer.classList.toggle("is-low", remaining <= 5000);
    if (remaining === 0) handleAnswer(null); // waktu habis → dianggap salah
  };

  tick();
  state.timerId = setInterval(tick, 100);
};

/* =========================================================
 * 10. ALUR KUIS
 * ======================================================= */
const startQuiz = (category) => {
  Object.assign(state, {
    category,
    questions: buildQuiz(category),
    index: 0,
    score: 0,
    answers: [],
  });
  showView("quiz");
  renderQuestion();
};

// selectedIndex = null berarti waktu habis
const handleAnswer = (selectedIndex) => {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const question = currentQuestion();
  const correctOption = question.options.find((o) => o.isCorrect);
  const isCorrect = selectedIndex !== null && question.options[selectedIndex].isCorrect;

  if (isCorrect) state.score += 1;
  state.answers.push(selectedIndex === null ? "timeout" : isCorrect ? "correct" : "wrong");

  markChoices(selectedIndex);

  els.feedback.textContent = isCorrect
    ? "Benar!"
    : `${selectedIndex === null ? "Waktu habis." : "Kurang tepat."} Jawaban yang benar: ${correctOption.text}`;

  els.nextBtn.hidden = false;
  els.nextBtn.focus();
};

const finishQuiz = () => {
  const isNewBest = state.score > loadHighScore();
  if (isNewBest) saveHighScore(state.score);
  renderResult(isNewBest);
  showView("result");
};

const goNext = async () => {
  els.nextBtn.disabled = true; // cegah klik ganda saat transisi
  await playLeaveAnimation();

  if (state.index === state.questions.length - 1) {
    finishQuiz();
  } else {
    state.index += 1;
    renderQuestion();
  }
};

const backToStart = () => {
  stopTimer();
  renderStart();
  showView("start");
};

/* =========================================================
 * 11. DARK MODE
 * ======================================================= */
const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  els.themeToggle.textContent = theme === "dark" ? "Mode terang" : "Mode gelap";
};

const toggleTheme = () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  storage.set(CONFIG.THEME_KEY, next);
  applyTheme(next);
};

/* =========================================================
 * 12. EVENT LISTENERS (EVENT DELEGATION)
 * ======================================================= */
const bindEvents = () => {
  // Delegation: SATU listener pada container #choices untuk semua pilihan jawaban,
  // termasuk tombol yang dibuat ulang setiap pindah soal.
  els.choices.addEventListener("click", (event) => {
    const button = event.target.closest(".choice");
    if (!button || !els.choices.contains(button) || button.disabled) return;
    handleAnswer(Number(button.dataset.index));
  });

  // Delegation juga dipakai untuk daftar kategori
  els.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) startQuiz(button.dataset.category);
  });

  els.nextBtn.addEventListener("click", goNext);
  els.quitBtn.addEventListener("click", backToStart);
  els.restartBtn.addEventListener("click", () => startQuiz(state.category));
  els.changeCategoryBtn.addEventListener("click", backToStart);
  els.themeToggle.addEventListener("click", toggleTheme);
};

/* =========================================================
 * 13. INIT
 * ======================================================= */
const init = () => {
  applyTheme(document.documentElement.dataset.theme || "light");
  renderStart();
  bindEvents();
  showView("start");
};

init();

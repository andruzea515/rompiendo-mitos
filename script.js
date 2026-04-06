const ROUND_FOLDER = "ROMPIENDO MITOS PREGUNTAS NUEVAS";
const ROUND_IDS = Array.from({ length: 18 }, (_, index) => index + 1);
const DEFAULT_HOTSPOTS = {
  true: { left: 1.2, top: 44.8, width: 32.2, height: 39.2 },
  false: { left: 72.4, top: 44.6, width: 26.4, height: 39.4 }
};
const ANSWER_KEY = {
  // Completa este objeto cuando confirmes cada respuesta correcta.
  // Ejemplo: 1: false,
};

let rounds = [];

const questionScreen = document.querySelector("#questionScreen");
const questionRow = document.querySelector("#questionRow");
const gameScreen = document.querySelector("#gameScreen");
const stageFrame = document.querySelector("#stageFrame");
const stageActions = document.querySelector("#stageActions");
const stage = document.querySelector("#stage");
const stageWelcome = document.querySelector("#stageWelcome");
const stageImage = document.querySelector("#stageImage");
const selectionPulse = document.querySelector("#selectionPulse");
const trueHotspot = document.querySelector("#trueHotspot");
const falseHotspot = document.querySelector("#falseHotspot");
const nextHotspot = document.querySelector("#nextHotspot");
const burst = document.querySelector("#burst");
const progressLabel = document.querySelector("#progressLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const stageKicker = document.querySelector("#stageKicker");
const stageMarqueeTitle = document.querySelector("#stageMarqueeTitle");
const debugHotspots = new URLSearchParams(window.location.search).has("debug-hotspots");
const mobileLayoutQuery = window.matchMedia("(max-width: 640px)");

let currentRound = null;
let score = 0;
let waitingNext = false;
let isAnswerTransition = false;
let questionButtons = [];
const playedRounds = new Set();

if (debugHotspots) {
  document.body.classList.add("debug-hotspots");
  trueHotspot.dataset.debugLabel = "Verdadero";
  falseHotspot.dataset.debugLabel = "Falso";
  nextHotspot.dataset.debugLabel = "Tap para volver";
}

function animateStageImage() {
  stageImage.classList.remove("is-animating");
  void stageImage.offsetWidth;
  stageImage.classList.add("is-animating");
}

function hideAnswerReveal() {
  stage.classList.remove("is-answer-true", "is-answer-false");
  stageImage.classList.remove("is-answer-shot");
}

function showAnswerReveal(answerValue) {
  stage.classList.remove("is-answer-true", "is-answer-false");
  stageImage.classList.remove("is-answer-shot");
  void stage.offsetWidth;
  stage.classList.add(answerValue ? "is-answer-true" : "is-answer-false");
  stageImage.classList.add("is-answer-shot");
}

function clearSelectionPulse() {
  selectionPulse.classList.add("hidden");
  selectionPulse.classList.remove("is-active", "is-true", "is-false");
}

function playSelectionPulse(answer) {
  const round = rounds[currentRound];
  const pulseRect = answer ? round.hotspots.true : round.hotspots.false;

  applyHotspotPosition(selectionPulse, pulseRect);
  clearSelectionPulse();
  void selectionPulse.offsetWidth;
  selectionPulse.classList.remove("hidden");
  selectionPulse.classList.add("is-active", answer ? "is-true" : "is-false");

  return new Promise((resolve) => {
    window.setTimeout(() => {
      clearSelectionPulse();
      resolve();
    }, 320);
  });
}

function buildAssetCandidates(roundNumber, kind) {
  return [
    `${ROUND_FOLDER}/${roundNumber}. ${kind}.png`,
    `${ROUND_FOLDER}/${roundNumber}.${kind}.png`
  ];
}

function probeImage(source) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(source);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

async function resolveAssetPath(candidates) {
  for (const candidate of candidates) {
    const resolvedCandidate = await probeImage(candidate);

    if (resolvedCandidate) {
      return resolvedCandidate;
    }
  }

  return null;
}

async function loadRounds() {
  const loadedRounds = await Promise.all(
    ROUND_IDS.map(async (roundNumber) => {
      const promptImage = await resolveAssetPath(buildAssetCandidates(roundNumber, "PREGUNTA"));
      const answerImage = await resolveAssetPath(buildAssetCandidates(roundNumber, "RESPUESTA"));

      if (!promptImage || !answerImage) {
        return null;
      }

      return {
        promptImage,
        answerImage,
        correctAnswer: ANSWER_KEY[roundNumber] ?? null,
        hotspots: DEFAULT_HOTSPOTS,
        roundNumber
      };
    })
  );

  return loadedRounds.filter(Boolean);
}

function bindQuestionButtons() {
  questionButtons = Array.from(questionRow.querySelectorAll(".question-card[data-round]"));

  questionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      startRound(Number(button.dataset.round));
    });
  });
}

function renderQuestionButtons() {
  if (rounds.length === 0) {
    questionRow.innerHTML = '<p class="question-row__message">No se encontraron parejas validas de pregunta y respuesta en la carpeta nueva.</p>';
    questionButtons = [];
    return;
  }

  questionRow.innerHTML = rounds
    .map((round, roundIndex) => `
      <button class="question-card" type="button" data-round="${roundIndex}">
        <span class="question-card__eyebrow">Pregunta</span>
        <span class="question-card__number">${round.roundNumber}</span>
      </button>
    `)
    .join("");

  bindQuestionButtons();
}

function applyHotspotPosition(element, rect) {
  element.style.left = `${rect.left}%`;
  element.style.top = `${rect.top}%`;
  element.style.width = `${rect.width}%`;
  element.style.height = `${rect.height}%`;
}

function clearAnswerEffects() {
  burst.classList.add("hidden");
  burst.classList.remove("is-correct", "is-wrong");
}

function playAnswerEffects(isCorrect) {
  clearAnswerEffects();
  void burst.offsetWidth;
  burst.classList.remove("hidden");
  burst.classList.add(isCorrect ? "is-correct" : "is-wrong");

  window.setTimeout(() => {
    clearAnswerEffects();
  }, 850);
}

function updateQuestionButtons() {
  questionButtons.forEach((button) => {
    const roundIndex = Number(button.dataset.round);
    button.classList.toggle("is-played", playedRounds.has(roundIndex));
    button.classList.toggle("is-current", roundIndex === currentRound && !waitingNext);
  });
}

function updateHud() {
  const roundsWithAnswerKey = rounds.filter((round) => typeof round.correctAnswer === "boolean").length;

  progressLabel.textContent = currentRound === null
    ? rounds.length === 0
      ? "No hay preguntas cargadas"
      : "Elige una pregunta"
    : `Pregunta ${rounds[currentRound].roundNumber}`;
  scoreLabel.textContent = roundsWithAnswerKey > 0 ? `Puntaje: ${score}` : "Puntaje pendiente";
}

function syncNextHotspotPlacement() {
  const targetParent = mobileLayoutQuery.matches ? stageActions : stage;

  if (nextHotspot.parentElement !== targetParent) {
    targetParent.appendChild(nextHotspot);
  }

  const shouldShowMobileAction = mobileLayoutQuery.matches && !nextHotspot.classList.contains("hidden");
  stageActions.classList.toggle("is-active", shouldShowMobileAction);
  stageFrame.classList.toggle("has-mobile-action", shouldShowMobileAction);
}

function showQuestionScreen() {
  document.body.classList.remove("is-question-active");
  questionScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}

function showGameScreen() {
  document.body.classList.add("is-question-active");
  questionScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function showWelcome() {
  currentRound = null;
  waitingNext = false;
  isAnswerTransition = false;
  clearAnswerEffects();
  clearSelectionPulse();
  hideAnswerReveal();
  showQuestionScreen();
  stageWelcome.classList.add("hidden");
  stageImage.classList.add("hidden");
  trueHotspot.classList.add("hidden");
  falseHotspot.classList.add("hidden");
  nextHotspot.classList.add("hidden");
  stageKicker.textContent = rounds.length === 0 ? "Sin contenido" : "Listo para jugar";
  stageMarqueeTitle.textContent = rounds.length === 0
    ? "Revisa la carpeta de imagenes o el formato de nombres"
    : "Elige una pregunta";
  syncNextHotspotPlacement();
  updateQuestionButtons();
  updateHud();
}

function startRound(roundIndex) {
  currentRound = roundIndex;
  waitingNext = false;
  showGameScreen();
  renderRound();
}

function renderRound() {
  const round = rounds[currentRound];

  clearSelectionPulse();
  hideAnswerReveal();
  stageWelcome.classList.add("hidden");
  stageImage.classList.remove("hidden");
  stageImage.src = round.promptImage;
  stageImage.alt = `Pregunta ${round.roundNumber} del juego Rompiendo Mitos`;
  animateStageImage();

  applyHotspotPosition(trueHotspot, round.hotspots.true);
  applyHotspotPosition(falseHotspot, round.hotspots.false);

  trueHotspot.disabled = false;
  falseHotspot.disabled = false;
  trueHotspot.classList.remove("hidden");
  falseHotspot.classList.remove("hidden");
  nextHotspot.classList.add("hidden");

  stageKicker.textContent = "Pregunta activa";
  stageMarqueeTitle.textContent = `Pregunta ${round.roundNumber}`;
  syncNextHotspotPlacement();
  updateQuestionButtons();
  updateHud();
}

function showAnswer(selectedAnswer) {
  const round = rounds[currentRound];
  const hasAnswerKey = typeof round.correctAnswer === "boolean";
  const isCorrect = hasAnswerKey ? selectedAnswer === round.correctAnswer : null;
  const responseAnswer = hasAnswerKey ? round.correctAnswer : selectedAnswer;

  if (isCorrect) {
    score += 1;
  }

  playedRounds.add(currentRound);
  waitingNext = true;

  stageImage.src = round.answerImage;
  stageImage.alt = `Respuesta de la pregunta ${round.roundNumber}`;
  animateStageImage();

  trueHotspot.disabled = true;
  falseHotspot.disabled = true;
  trueHotspot.classList.add("hidden");
  falseHotspot.classList.add("hidden");
  nextHotspot.classList.remove("hidden");
  syncNextHotspotPlacement();

  stageKicker.textContent = !hasAnswerKey
    ? "Respuesta mostrada"
    : isCorrect
      ? "Respuesta correcta"
      : "Respuesta revisada";
  stageMarqueeTitle.textContent = hasAnswerKey
    ? "Usa el boton para regresar a las preguntas"
    : "Falta cargar la clave correcta para puntuar esta pregunta";

  if (hasAnswerKey) {
    playAnswerEffects(isCorrect);
  }

  showAnswerReveal(responseAnswer);

  updateQuestionButtons();
  updateHud();
}

function handleAnswer(answer) {
  if (currentRound === null || waitingNext || isAnswerTransition) {
    return;
  }

  isAnswerTransition = true;
  trueHotspot.disabled = true;
  falseHotspot.disabled = true;

  playSelectionPulse(answer).then(() => {
    isAnswerTransition = false;
    showAnswer(answer);
  });
}

function goNext() {
  if (!waitingNext) {
    return;
  }

  showWelcome();
}

trueHotspot.addEventListener("click", () => handleAnswer(true));
falseHotspot.addEventListener("click", () => handleAnswer(false));
nextHotspot.addEventListener("click", goNext);
mobileLayoutQuery.addEventListener("change", syncNextHotspotPlacement);

async function init() {
  progressLabel.textContent = "Cargando preguntas";
  stageKicker.textContent = "Cargando";
  stageMarqueeTitle.textContent = "Buscando parejas de imagenes";

  rounds = await loadRounds();
  renderQuestionButtons();
  syncNextHotspotPlacement();
  showWelcome();
}

init();

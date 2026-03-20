const rounds = [
  {
    promptImage: "Rompiendo Mitos (2) (1)_page-0001.jpg",
    answerImage: "Rompiendo Mitos (2) (1)_page-0002.jpg",
    correctAnswer: true,
    hotspots: {
      true: { left: 1.2, top: 44.8, width: 32.2, height: 39.2 },
      false: { left: 72.4, top: 44.6, width: 26.4, height: 39.4 }
    }
  },
  {
    promptImage: "Rompiendo Mitos (2) (1)_page-0003.jpg",
    answerImage: "Rompiendo Mitos (2) (1)_page-0004.jpg",
    correctAnswer: false,
    hotspots: {
      true: { left: 1.3, top: 44.7, width: 32.4, height: 39.5 },
      false: { left: 72.2, top: 44.4, width: 26.6, height: 39.7 }
    }
  }
];

const questionScreen = document.querySelector("#questionScreen");
const gameScreen = document.querySelector("#gameScreen");
const stageWelcome = document.querySelector("#stageWelcome");
const stageImage = document.querySelector("#stageImage");
const trueHotspot = document.querySelector("#trueHotspot");
const falseHotspot = document.querySelector("#falseHotspot");
const nextHotspot = document.querySelector("#nextHotspot");
const burst = document.querySelector("#burst");
const progressLabel = document.querySelector("#progressLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const stageKicker = document.querySelector("#stageKicker");
const stageMarqueeTitle = document.querySelector("#stageMarqueeTitle");
const questionButtons = document.querySelectorAll(".question-card[data-round]");
const debugHotspots = new URLSearchParams(window.location.search).has("debug-hotspots");

let currentRound = null;
let score = 0;
let waitingNext = false;
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
  progressLabel.textContent = currentRound === null
    ? "Elige una pregunta"
    : `Pregunta ${currentRound + 1}`;
  scoreLabel.textContent = `Puntaje: ${score}`;
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
  clearAnswerEffects();
  showQuestionScreen();
  stageWelcome.classList.add("hidden");
  stageImage.classList.add("hidden");
  trueHotspot.classList.add("hidden");
  falseHotspot.classList.add("hidden");
  nextHotspot.classList.add("hidden");
  stageKicker.textContent = "Listo para jugar";
  stageMarqueeTitle.textContent = "Elige una pregunta";
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

  stageWelcome.classList.add("hidden");
  stageImage.classList.remove("hidden");
  stageImage.src = round.promptImage;
  stageImage.alt = `Pregunta ${currentRound + 1} del juego Rompiendo Mitos`;
  animateStageImage();

  applyHotspotPosition(trueHotspot, round.hotspots.true);
  applyHotspotPosition(falseHotspot, round.hotspots.false);

  trueHotspot.disabled = false;
  falseHotspot.disabled = false;
  trueHotspot.classList.remove("hidden");
  falseHotspot.classList.remove("hidden");
  nextHotspot.classList.add("hidden");

  stageKicker.textContent = "Pregunta activa";
  stageMarqueeTitle.textContent = `Pregunta ${currentRound + 1}`;
  updateQuestionButtons();
  updateHud();
}

function showAnswer(selectedAnswer) {
  const round = rounds[currentRound];
  const isCorrect = selectedAnswer === round.correctAnswer;

  if (isCorrect) {
    score += 1;
  }

  playedRounds.add(currentRound);
  waitingNext = true;

  stageImage.src = round.answerImage;
  stageImage.alt = `Respuesta de la pregunta ${currentRound + 1}`;
  animateStageImage();

  trueHotspot.disabled = true;
  falseHotspot.disabled = true;
  trueHotspot.classList.add("hidden");
  falseHotspot.classList.add("hidden");
  nextHotspot.classList.remove("hidden");

  stageKicker.textContent = isCorrect ? "Respuesta correcta" : "Respuesta revisada";
  stageMarqueeTitle.textContent = "Usa el boton para regresar a las preguntas";
  playAnswerEffects(isCorrect);
  updateQuestionButtons();
  updateHud();
}

function handleAnswer(answer) {
  if (currentRound === null || waitingNext) {
    return;
  }

  showAnswer(answer);
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

questionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startRound(Number(button.dataset.round));
  });
});

showWelcome();

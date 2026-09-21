// SysGym - Molinete virtual (Wokwi / ESP32)
// Simulador aislado: sin Wi-Fi, HTTP, MQTT ni conexion con SysGym.
// Comandos por monitor serie: OPEN ENTRY | OPEN EXIT | DENY | STATUS | RESET

#include <Arduino.h>

// ---- Pines ----
const int PIN_LED_GREEN = 26;   // acceso autorizado
const int PIN_LED_RED   = 27;   // acceso rechazado
const int PIN_OUT_ENTRY = 25;   // salida virtual: destraba sentido entrada
const int PIN_OUT_EXIT  = 33;   // salida virtual: destraba sentido salida
const int PIN_BTN_ENTRY = 18;   // simula giro de entrada (a GND, pull-up interno)
const int PIN_BTN_EXIT  = 19;   // simula giro de salida

// ---- Tiempos ----
const unsigned long RELOCK_AFTER_PASS_MS = 1000; // cierre automatico tras el giro
const unsigned long UNLOCK_TIMEOUT_MS    = 5000; // cierre si nadie gira
const unsigned long DENY_LED_MS          = 1000;
const unsigned long DEBOUNCE_MS          = 50;

enum State { LOCKED, UNLOCKED, PASSED };
enum Dir { DIR_NONE, DIR_ENTRY, DIR_EXIT };

State state = LOCKED;
Dir dir = DIR_NONE;
unsigned long stateSince = 0;
unsigned long denySince = 0;
bool denyActive = false;
unsigned long passageCount = 0;

struct Button { int pin; bool stable; bool lastRead; unsigned long changedAt; };
Button btnEntry = { PIN_BTN_ENTRY, HIGH, HIGH, 0 };
Button btnExit  = { PIN_BTN_EXIT,  HIGH, HIGH, 0 };

String rxLine;

const char* dirName(Dir d) {
  return d == DIR_ENTRY ? "entry" : d == DIR_EXIT ? "exit" : "none";
}

const char* stateName(State s) {
  return s == LOCKED ? "locked" : s == UNLOCKED ? "unlocked" : "passed";
}

void emit(const char* event, const char* extraKey = nullptr, const char* extraVal = nullptr) {
  Serial.print("{\"event\":\"");
  Serial.print(event);
  Serial.print("\",\"direction\":\"");
  Serial.print(dirName(dir));
  Serial.print("\"");
  if (extraKey) {
    Serial.print(",\"");
    Serial.print(extraKey);
    Serial.print("\":\"");
    Serial.print(extraVal);
    Serial.print("\"");
  }
  Serial.print(",\"ts\":");
  Serial.print(millis());
  Serial.println("}");
}

void writeOutputs() {
  digitalWrite(PIN_LED_GREEN, state != LOCKED ? HIGH : LOW);
  digitalWrite(PIN_OUT_ENTRY, state == UNLOCKED && dir == DIR_ENTRY ? HIGH : LOW);
  digitalWrite(PIN_OUT_EXIT,  state == UNLOCKED && dir == DIR_EXIT  ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, denyActive ? HIGH : LOW);
}

void relock(const char* reason) {
  if (state == LOCKED) return;
  state = LOCKED;
  stateSince = millis();
  writeOutputs();
  emit("turnstile_relocked", "reason", reason);
  dir = DIR_NONE;
}

void openTurnstile(Dir d) {
  if (state != LOCKED) relock("superseded");
  denyActive = false;
  dir = d;
  emit("access_authorized");
  state = UNLOCKED;
  stateSince = millis();
  writeOutputs();
  emit("turnstile_unlocked");
}

void deny() {
  if (state != LOCKED) relock("denied");
  denyActive = true;
  denySince = millis();
  writeOutputs();
  emit("access_denied");
}

void printStatus() {
  Serial.print("{\"event\":\"status\",\"state\":\"");
  Serial.print(stateName(state));
  Serial.print("\",\"direction\":\"");
  Serial.print(dirName(dir));
  Serial.print("\",\"passages\":");
  Serial.print(passageCount);
  Serial.print(",\"ts\":");
  Serial.print(millis());
  Serial.println("}");
}

void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  if (cmd.length() == 0) return;
  if (cmd == "OPEN ENTRY")      openTurnstile(DIR_ENTRY);
  else if (cmd == "OPEN EXIT")  openTurnstile(DIR_EXIT);
  else if (cmd == "DENY")       deny();
  else if (cmd == "STATUS")     printStatus();
  else if (cmd == "RESET") {
    relock("reset");
    denyActive = false;
    passageCount = 0;
    writeOutputs();
    printStatus();
  } else {
    Serial.print("{\"event\":\"error\",\"message\":\"unknown_command\",\"command\":\"");
    Serial.print(cmd);
    Serial.println("\"}");
  }
}

// Devuelve true una sola vez por pulsacion (flanco de bajada ya estable).
bool pressed(Button& b) {
  bool r = digitalRead(b.pin);
  unsigned long now = millis();
  if (r != b.lastRead) { b.lastRead = r; b.changedAt = now; }
  if (now - b.changedAt >= DEBOUNCE_MS && r != b.stable) {
    b.stable = r;
    return r == LOW;
  }
  return false;
}

void onSensor(Dir d) {
  // Solo cuenta el primer giro en el sentido habilitado; el resto se ignora.
  if (state != UNLOCKED || d != dir) return;
  state = PASSED;
  stateSince = millis();
  passageCount++;
  writeOutputs();
  emit("passage_confirmed");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_OUT_ENTRY, OUTPUT);
  pinMode(PIN_OUT_EXIT, OUTPUT);
  pinMode(PIN_BTN_ENTRY, INPUT_PULLUP);
  pinMode(PIN_BTN_EXIT, INPUT_PULLUP);
  writeOutputs();
  Serial.println("{\"event\":\"boot\",\"state\":\"locked\"}");
}

void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') { handleCommand(rxLine); rxLine = ""; }
    else if (rxLine.length() < 64) rxLine += c;
  }

  if (pressed(btnEntry)) onSensor(DIR_ENTRY);
  if (pressed(btnExit))  onSensor(DIR_EXIT);

  unsigned long now = millis();
  if (state == PASSED && now - stateSince >= RELOCK_AFTER_PASS_MS) relock("passage_complete");
  if (state == UNLOCKED && now - stateSince >= UNLOCK_TIMEOUT_MS) relock("timeout");
  if (denyActive && now - denySince >= DENY_LED_MS) { denyActive = false; writeOutputs(); }
}

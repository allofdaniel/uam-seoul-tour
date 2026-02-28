type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  successCount: number;
}

const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT_MS = 30000;

const circuits = new Map<string, CircuitBreakerState>();

function getCircuit(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, { state: 'CLOSED', failures: 0, lastFailure: 0, successCount: 0 });
  }
  return circuits.get(name)!;
}

export function canExecute(name: string = 'gemini'): boolean {
  const circuit = getCircuit(name);
  if (circuit.state === 'CLOSED') return true;
  if (circuit.state === 'OPEN') {
    if (Date.now() - circuit.lastFailure >= RECOVERY_TIMEOUT_MS) {
      circuit.state = 'HALF_OPEN';
      circuit.successCount = 0;
      return true;
    }
    return false;
  }
  // HALF_OPEN
  return true;
}

export function recordSuccess(name: string = 'gemini'): void {
  const circuit = getCircuit(name);
  if (circuit.state === 'HALF_OPEN') {
    circuit.successCount++;
    if (circuit.successCount >= 1) {
      circuit.state = 'CLOSED';
      circuit.failures = 0;
    }
  } else {
    circuit.failures = 0;
  }
}

export function recordFailure(name: string = 'gemini'): void {
  const circuit = getCircuit(name);
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = 'OPEN';
  }
}

export function getCircuitState(name: string = 'gemini'): CircuitState {
  return getCircuit(name).state;
}

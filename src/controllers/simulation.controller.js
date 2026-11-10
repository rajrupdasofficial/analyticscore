import {
  startSimulation,
  stopSimulation,
  getSimulationStatus
} from "../workers/worker.manager.js";

export async function startController(req, res) {
  try {
    const result = await startSimulation();
    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export async function stopController(req, res) {
  try {
    const result = await stopSimulation();
    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export function statusController(req, res) {
  return res.json({
    success: true,
    simulation: getSimulationStatus()
  });
}

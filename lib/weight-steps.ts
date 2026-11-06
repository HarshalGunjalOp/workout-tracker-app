// Keep existing device choices until an increment is saved with the program.
export function readWeightSteps(): Record<string, number> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem("form-weight-steps-v1") ?? "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return Object.fromEntries(Object.entries(saved).filter(
        ([, step]) => typeof step === "number" && [1.25, 2.5, 5].includes(step),
      ));
    }
  } catch {}
  return {};
}

export const DEFAULT_EGG_CRATE_CAPACITY = 30;

export const convertPiecesToCrates = (
  pieces: number | string,
  crateCapacity = DEFAULT_EGG_CRATE_CAPACITY
) => Number(pieces || 0) / crateCapacity;

export const convertCratesToPieces = (
  crates: number | string,
  crateCapacity = DEFAULT_EGG_CRATE_CAPACITY
) => Number(crates || 0) * crateCapacity;

export const formatEggGradeLabel = (grade: string) => {
  switch (grade) {
    case "LARGE":
      return "Large";
    case "MEDIUM":
      return "Medium";
    case "SMALL":
      return "Small";
    case "PULLET":
      return "Pullet";
    case "UNSORTED":
      return "Unsorted";
    default:
      return grade;
  }
};

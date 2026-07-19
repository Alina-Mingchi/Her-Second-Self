export type AppRole = "participant" | "researcher" | "admin" | "clinician";

export type DataType =
  | "symptoms"
  | "hormones"
  | "voice"
  | "food"
  | "wearable"
  | "lab"
  | "brain_signal";

export const DATA_TYPES: DataType[] = [
  "symptoms",
  "hormones",
  "voice",
  "food",
  "wearable",
  "lab",
  "brain_signal",
];

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  symptoms: "Daily symptoms & cycle",
  hormones: "Hormone measurements",
  voice: "Voice memos",
  food: "Food photos",
  wearable: "Wearable data",
  lab: "Lab results",
  brain_signal: "Brain signals (EEG)",
};

export type Me = {
  id: string;
  email: string | null;
  display_name: string | null;
  pseudonym: string | null;
  onboarded: boolean;
  roles: AppRole[];
  consents: Record<DataType, boolean>;
};

export type BiologicalSex = "male" | "female" | "other";

export type BodyMeasurementsInput = {
  age: number;
  gender: BiologicalSex;
  weightKg: number;
  heightCm: number;
  femurLengthCm: number;
  torsoLengthCm: number;
};

export type LocalBodyMeasurements = BodyMeasurementsInput & {
  id: string;
  userId: string;
  clientId: string;
  localVersion: number;
  syncStatus: "pending" | "synced" | "failed";
  updatedAt: string;
};

export type SyncQueueItem = {
  id: string;
  entityType: "body_measurements";
  entityId: string;
  operation: "create" | "update";
  payload: LocalBodyMeasurements;
  status: "pending" | "processing" | "synced" | "failed";
  retryCount: number;
  conflictData?: unknown;
  createdAt: string;
  processedAt?: string;
};

export interface TimelineStep {
  date: string;
  title: string;
  desc: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Lot {
  id: string;
  variety: string;
  stage: string;
  moisture: string;
  density: string;
  ph: string;
  bagCount: number;
  origin: string;
  coordinates: string;
  altitude: string;
  grower: string;
  growerTitle: string;
  growerAvatar: string;
  cuppingScore: number;
  carbonFootprint: string;
  waterIntensity: string;
  waterReuseEfficiency: string;
  eudrStatus: 'Compliant' | 'Deforestation Risk';
  policyId: string;
  assetName: string;
  merkleRoot: string;
  epoch: number;
  timeline: TimelineStep[];
  altitudeNum: number;
  description: string;
  /** On-chain mint/reference tx hash (only present for real on-chain lots). */
  txHash?: string;
}

export interface EventLog {
  id: string;
  timestamp: string;
  operatorId: string;
  action: 'FERTILIZE' | 'SENSOR ALERT' | 'IRRIGATION' | 'PRUNING' | 'HARVEST' | 'MINT';
  details: string;
  verified: boolean;
}

export interface IoTTelemetry {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  ecLevels: number;
  parSensor: number;
}

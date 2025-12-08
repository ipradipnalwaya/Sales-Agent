export interface LeadData {
  fullName: string | null;
  mobile: string | null;
  location: string | null;
  diamondShape: string | null;
  priceRange: string | null;
  caratSize: string | null;
  summary: string | null;
}

export const INITIAL_LEAD_DATA: LeadData = {
  fullName: null,
  mobile: null,
  location: null,
  diamondShape: null,
  priceRange: null,
  caratSize: null,
  summary: null,
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'ended' | 'error' | 'permission_denied';

export interface LogMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}
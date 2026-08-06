export type Transport = 'ws' | 'rest';

export interface MenuNode {
  id: string;
  label: string;
  type: 'group' | 'report';
  transport?: Transport;      // only on type==='report'
  children?: MenuNode[];      // backend sends up to 3 levels deep
}

export interface UserData {
  id: string;
  name: string;
  role: string;
  email: string;
  desk: string;
  preferences: { theme: 'dark' | 'light'; defaultReportId: string | null };
}

export type ColumnType = 'string' | 'number' | 'price' | 'pct' | 'timestamp';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  align?: 'left' | 'right';
}

export interface ReportRow {
  id: string;
  [key: string]: string | number;
}

export interface ReportPayload {
  reportId: string;
  columns: ColumnDef[];
  rows: ReportRow[];
  asOf: string;               // ISO timestamp; for EOD it's the selected date
}

export type ReportMode = 'live' | 'eod';

export interface ReportState {
  reportId: string;
  transport: Transport;
  columns: ColumnDef[];
  rows: ReportRow[];
  loading: boolean;
  error: string | null;
  mode: ReportMode;           // rest reports: 'live'(=current REST snapshot) | 'eod'
  paused: boolean;            // ws reports only
  eodDate: string | null;     // 'YYYY-MM-DD', rest reports only
  asOf: string | null;
  connectionStatus: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
}

export interface InitResponse {
  userData: UserData;
  menuData: MenuNode[];
  eodDates: string[];         // available EOD dates, newest first
}

export interface WsTickUpdate { id: string; changes: Record<string, string | number> }
export type WsServerMessage =
  | { type: 'snapshot'; reportId: string; columns: ColumnDef[]; rows: ReportRow[]; asOf: string }
  | { type: 'tick'; reportId: string; updates: WsTickUpdate[]; asOf: string }
  | { type: 'error'; message: string };
export type WsClientMessage =
  | { type: 'subscribe'; reportId: string }
  | { type: 'unsubscribe'; reportId: string };

export type SortDirection = 'asc' | 'desc';
export interface SortState { columnKey: string | null; direction: SortDirection }
export type FilterState = Record<string, string>; // columnKey -> filter text

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const useSupabase = !!(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;

export interface StoredEvent {
  id: string;
  farm_id: string;
  device_id: string;
  event_type: string;
  data: Record<string, unknown>;
  gps_lat?: number;
  gps_lng?: number;
  recorded_at: string;
  created_at: string;
}

export interface DailyAnchor {
  id: string;
  farm_id: string;
  lot_id?: string;
  anchor_date: string;
  event_count: number;
  merkle_root: string;
  tx_hash?: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  created_at: string;
}

export interface OracleSubmission {
  id: string;
  oracle_id: string;
  lot_id?: string;
  farm_id?: string;
  action: "UpdateEvents" | "UpdateSustainability" | "UpdateLab";
  payload_hash: string;
  tx_hash?: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  error_message?: string;
  submitted_at: string;
  confirmed_at?: string;
}

// In-memory fallback
const mem = {
  events: [] as StoredEvent[],
  anchors: [] as DailyAnchor[],
  submissions: [] as OracleSubmission[],
};

export const store = {
  async insertEvent(e: Omit<StoredEvent, "id" | "created_at">): Promise<StoredEvent> {
    if (supabase) {
      const { data, error } = await supabase.from("iot_events").insert(e).select().single();
      if (error) throw new Error(error.message);
      return data as StoredEvent;
    }
    const event: StoredEvent = { ...e, id: randomUUID(), created_at: new Date().toISOString() };
    mem.events.push(event);
    return event;
  },

  async getEventsByFarmAndDate(farmId: string, date: string): Promise<StoredEvent[]> {
    if (supabase) {
      const { data } = await supabase.from("iot_events")
        .select("*")
        .eq("farm_id", farmId)
        .gte("recorded_at", `${date}T00:00:00Z`)
        .lt("recorded_at", `${date}T23:59:59Z`)
        .order("recorded_at");
      return (data || []) as StoredEvent[];
    }
    return mem.events.filter((e) => e.farm_id === farmId && e.recorded_at.startsWith(date));
  },

  async getEventsByFarm(farmId: string): Promise<StoredEvent[]> {
    if (supabase) {
      const { data } = await supabase.from("iot_events")
        .select("*")
        .eq("farm_id", farmId)
        .order("recorded_at", { ascending: false })
        .limit(100);
      return (data || []) as StoredEvent[];
    }
    return mem.events.filter((e) => e.farm_id === farmId);
  },

  async insertAnchor(a: Omit<DailyAnchor, "id" | "created_at">): Promise<DailyAnchor> {
    if (supabase) {
      // Upsert on (farm_id, anchor_date) — re-running mock-week for the same
      // day should replace the merkle root, not error out.
      const { data, error } = await supabase
        .from("daily_anchors")
        .upsert(a, { onConflict: "farm_id,anchor_date" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DailyAnchor;
    }
    const existing = mem.anchors.find(
      (x) => x.farm_id === a.farm_id && x.anchor_date === a.anchor_date,
    );
    if (existing) {
      Object.assign(existing, a);
      return existing;
    }
    const anchor: DailyAnchor = { ...a, id: randomUUID(), created_at: new Date().toISOString() };
    mem.anchors.push(anchor);
    return anchor;
  },

  async getAnchorsByFarm(farmId: string): Promise<DailyAnchor[]> {
    if (supabase) {
      const { data } = await supabase.from("daily_anchors")
        .select("*")
        .eq("farm_id", farmId)
        .order("anchor_date", { ascending: false });
      return (data || []) as DailyAnchor[];
    }
    return mem.anchors.filter((a) => a.farm_id === farmId);
  },

  async getAnchorsByLot(lotId: string): Promise<DailyAnchor[]> {
    if (supabase) {
      const { data } = await supabase
        .from("daily_anchors")
        .select("*")
        .eq("lot_id", lotId)
        .order("anchor_date", { ascending: false });
      return (data || []) as DailyAnchor[];
    }
    return mem.anchors.filter((a) => a.lot_id === lotId);
  },

  async getEventsByFarmsAndDate(
    farmIds: string[],
    date: string,
  ): Promise<StoredEvent[]> {
    if (supabase) {
      const { data } = await supabase
        .from("iot_events")
        .select("*")
        .in("farm_id", farmIds)
        .gte("recorded_at", `${date}T00:00:00Z`)
        .lt("recorded_at", `${date}T23:59:59Z`)
        .order("recorded_at");
      return (data || []) as StoredEvent[];
    }
    return mem.events.filter(
      (e) => farmIds.includes(e.farm_id) && e.recorded_at.startsWith(date),
    );
  },

  async getAnchor(id: string): Promise<DailyAnchor | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("daily_anchors")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return null;
      return data as DailyAnchor;
    }
    return mem.anchors.find((a) => a.id === id) ?? null;
  },

  async markAnchorSubmitted(
    id: string,
    txHash: string,
    status: DailyAnchor["status"] = "submitted",
  ): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from("daily_anchors")
        .update({ tx_hash: txHash, status })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }
    const a = mem.anchors.find((x) => x.id === id);
    if (a) {
      a.tx_hash = txHash;
      a.status = status;
    }
  },

  async findOracleByPkhKind(
    pkh: string,
    kind: string,
  ): Promise<{ id: string } | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("oracles")
        .select("id")
        .eq("payment_pkh", pkh)
        .eq("kind", kind)
        .single();
      if (error) return null;
      return data;
    }
    return { id: "mem-oracle" };
  },

  async insertOracleSubmission(
    s: Omit<OracleSubmission, "id" | "submitted_at">,
  ): Promise<OracleSubmission> {
    if (supabase) {
      const { data, error } = await supabase
        .from("oracle_submissions")
        .insert(s)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as OracleSubmission;
    }
    const sub: OracleSubmission = {
      ...s,
      id: randomUUID(),
      submitted_at: new Date().toISOString(),
    };
    mem.submissions.push(sub);
    return sub;
  },

  async updateOracleSubmission(
    id: string,
    patch: Partial<OracleSubmission>,
  ): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from("oracle_submissions")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }
    const s = mem.submissions.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  },
};

console.log(`[store] Using ${useSupabase ? "Supabase" : "in-memory"} storage`);

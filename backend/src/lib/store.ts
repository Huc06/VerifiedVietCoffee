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
  anchor_date: string;
  event_count: number;
  merkle_root: string;
  tx_hash?: string;
  status: "pending" | "submitted" | "confirmed";
  created_at: string;
}

// In-memory fallback
const mem = { events: [] as StoredEvent[], anchors: [] as DailyAnchor[] };

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
      const { data, error } = await supabase.from("daily_anchors").insert(a).select().single();
      if (error) throw new Error(error.message);
      return data as DailyAnchor;
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
};

console.log(`[store] Using ${useSupabase ? "Supabase" : "in-memory"} storage`);

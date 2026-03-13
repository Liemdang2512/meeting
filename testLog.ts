import { logTokenUsage } from "./services/tokenUsageService";
import { supabase } from "./lib/supabase";

async function run() {
  await logTokenUsage({
    userId: "5b21407a-a7a7-4e71-97c8-c1120d01e1b4", // Replace with real one if needed, but logging requires this exact one since RLS expects auth.uid() == user_id
    feature: "minutes",
    actionType: "transcribe-basic",
    model: "test",
    inputTokens: 10,
    outputTokens: 10,
    totalTokens: 20
  });
  const { data, error } = await supabase.from('token_usage_logs').select('*');
  console.log("DB DATA:", data, "ERR:", error);
}
run();

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            transcriptions: {
                Row: {
                    id: string
                    created_at: string
                    file_name: string
                    file_size: number | null
                    transcription_text: string
                    user_id: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    file_name: string
                    file_size?: number | null
                    transcription_text: string
                    user_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    file_name?: string
                    file_size?: number | null
                    transcription_text?: string
                    user_id?: string | null
                }
            }
            summaries: {
                Row: {
                    id: string
                    created_at: string
                    transcription_id: string | null
                    summary_text: string
                    prompt_used: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    transcription_id?: string | null
                    summary_text: string
                    prompt_used?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    transcription_id?: string | null
                    summary_text?: string
                    prompt_used?: string | null
                }
            }
            user_settings: {
                Row: {
                    id: string
                    user_id: string
                    gemini_api_key: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    gemini_api_key?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    gemini_api_key?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    user_id: string
                    role: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    role?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    role?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
            }
            token_usage_logs: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    action_type: string
                    feature: string
                    input_tokens: number | null
                    output_tokens: number | null
                    total_tokens: number | null
                    model: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    action_type: string
                    feature: string
                    input_tokens?: number | null
                    output_tokens?: number | null
                    total_tokens?: number | null
                    model: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    action_type?: string
                    feature?: string
                    input_tokens?: number | null
                    output_tokens?: number | null
                    total_tokens?: number | null
                    model?: string
                    metadata?: Json | null
                }
            }
        }
    }
}

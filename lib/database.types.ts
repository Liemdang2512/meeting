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
        }
    }
}

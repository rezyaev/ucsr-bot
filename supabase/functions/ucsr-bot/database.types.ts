export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
	public: {
		Tables: {
			Members: {
				Row: {
					id: number;
					steam_username: string | null;
					telegram_username: string | null;
				};
				Insert: {
					id?: number;
					steam_username?: string | null;
					telegram_username?: string | null;
				};
				Update: {
					id?: number;
					steam_username?: string | null;
					telegram_username?: string | null;
				};
			};
			Tournaments: {
				Row: {
					fantasy_winner: number | null;
					finish: string;
					id: number;
					name: string;
					start: string;
				};
				Insert: {
					fantasy_winner?: number | null;
					finish: string;
					id?: number;
					name: string;
					start: string;
				};
				Update: {
					fantasy_winner?: number | null;
					finish?: string;
					id?: number;
					name?: string;
					start?: string;
				};
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
	};
}

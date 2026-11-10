CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_distance" integer DEFAULT 0 NOT NULL,
	"best_at" timestamp with time zone,
	"created_ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"secret_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"distance" integer,
	"crystals" integer,
	"speed_boosts" integer,
	"score" integer,
	"reject_reason" text,
	"ip_hash" text
);
--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "players_name_ci_idx" ON "players" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "players_token_hash_idx" ON "players" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "players_best_score_idx" ON "players" USING btree ("best_score");--> statement-breakpoint
CREATE INDEX "players_created_ip_idx" ON "players" USING btree ("created_ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "runs_ip_started_idx" ON "runs" USING btree ("ip_hash","started_at");--> statement-breakpoint
CREATE INDEX "runs_player_idx" ON "runs" USING btree ("player_id");
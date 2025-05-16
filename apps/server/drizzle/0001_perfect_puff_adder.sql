CREATE TABLE "agent_specification_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" serial NOT NULL,
	"prompt" text,
	"specification" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_specification_version" ADD CONSTRAINT "agent_specification_version_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
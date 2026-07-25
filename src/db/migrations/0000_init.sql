CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"person_type" text NOT NULL,
	"company" varchar(200),
	"employee_number" varchar(50),
	"phone" varchar(50),
	"email" varchar(200),
	"comment" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_person_type_check" CHECK ("people"."person_type" IN ('MITARBEITER', 'SUBUNTERNEHMER')),
	CONSTRAINT "people_display_name_not_empty" CHECK (length(trim("people"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_token" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"manufacturer" varchar(200) NOT NULL,
	"model_name" varchar(200) NOT NULL,
	"serial_number" varchar(200) NOT NULL,
	"storage_location" varchar(200) NOT NULL,
	"ownership_type" text NOT NULL,
	"purchase_date" date NOT NULL,
	"hilti_scan_code" varchar(100),
	"alternative_code" varchar(100),
	"description" text,
	"responsible_person_id" uuid,
	"information_text" text,
	"status" text DEFAULT 'IM_LAGER' NOT NULL,
	"current_person_id" uuid,
	"current_checkout_at" timestamp with time zone,
	"current_planned_return_date" date,
	"current_project_or_location" varchar(300),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machines_status_check" CHECK ("machines"."status" IN ('IM_LAGER', 'AUSGELIEHEN', 'GESPERRT')),
	CONSTRAINT "machines_ownership_type_check" CHECK ("machines"."ownership_type" IN ('EIGENTUM', 'FLOTTE')),
	CONSTRAINT "machines_checked_out_consistency" CHECK ((
        ("machines"."status" = 'AUSGELIEHEN' AND "machines"."current_person_id" IS NOT NULL AND "machines"."current_checkout_at" IS NOT NULL)
        OR
        ("machines"."status" <> 'AUSGELIEHEN' AND "machines"."current_person_id" IS NULL AND "machines"."current_checkout_at" IS NULL
          AND "machines"."current_planned_return_date" IS NULL AND "machines"."current_project_or_location" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"action" text NOT NULL,
	"selected_person_id" uuid,
	"previous_holder_person_id" uuid,
	"planned_return_date" date,
	"project_or_location" varchar(300),
	"comment" text,
	"reason" text,
	"source" text NOT NULL,
	"admin_username" varchar(100),
	"device_id" varchar(100),
	"ip_address" varchar(64),
	"user_agent" text,
	"browser" varchar(100),
	"operating_system" varchar(100),
	"device_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_action_check" CHECK ("transactions"."action" IN ('CHECKOUT', 'CHECKIN', 'ADMIN_CHECKIN', 'LOCK', 'UNLOCK')),
	CONSTRAINT "transactions_source_check" CHECK ("transactions"."source" IN ('QR_APP', 'ADMIN'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"reason" text,
	"admin_username" varchar(100),
	"database_user" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_entity_type_check" CHECK ("audit_log"."entity_type" IN ('MACHINE', 'PERSON'))
);
--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_responsible_person_id_people_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_current_person_id_people_id_fk" FOREIGN KEY ("current_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_selected_person_id_people_id_fk" FOREIGN KEY ("selected_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_previous_holder_person_id_people_id_fk" FOREIGN KEY ("previous_holder_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "machines_qr_token_unique" ON "machines" USING btree ("qr_token");--> statement-breakpoint
CREATE UNIQUE INDEX "machines_manufacturer_serial_unique" ON "machines" USING btree ("manufacturer","serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "machines_hilti_scan_code_unique" ON "machines" USING btree ("hilti_scan_code") WHERE "machines"."hilti_scan_code" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "machines_alternative_code_unique" ON "machines" USING btree ("alternative_code") WHERE "machines"."alternative_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_machine_id_idx" ON "transactions" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_selected_person_id_idx" ON "transactions" USING btree ("selected_person_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
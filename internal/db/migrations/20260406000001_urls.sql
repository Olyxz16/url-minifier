-- Create "urls" table
CREATE TABLE "urls" ("id" uuid NOT NULL, "creator_id" uuid NULL, "short_url" text NOT NULL, "redirect_url" text NOT NULL, "hit_count" integer NOT NULL DEFAULT 0, "created_at" timestamptz NOT NULL DEFAULT now(), "expires_at" timestamptz NULL, PRIMARY KEY ("id"), CONSTRAINT "urls_redirect_url_key" UNIQUE ("redirect_url"), CONSTRAINT "urls_short_url_key" UNIQUE ("short_url"), CONSTRAINT "urls_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "id_urls_short_url" to table: "urls"
CREATE INDEX "id_urls_short_url" ON "urls" ("short_url");
